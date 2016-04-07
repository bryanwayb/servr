#! /usr/bin/env node
'use strict';

var cluster = require('cluster'),
    fs = require('fs'),
    path = require('path'),
    functions = require('../lib/functions.js'),
    logger = require('../lib/logger.js'),
    enums = require('../lib/enums.js'),
    helpout = require('helpout'),
    npmPackage = require('../package.json'),
    worker = require('./worker.js');

var args = require('minimist')(process.argv.slice(2));

var clusterInstanceCount,
    configuration;

if(cluster.isMaster) {
    if(args.v || args.version) {
        process.stdout.write(helpout.version(npmPackage));
    }

    if(args.h || args.help) {
        process.stdout.write(helpout.help({
            npmPackage: npmPackage,
            usage: '[options]',
            sections: {
                BASIC: {
                    options: {
                        '-c, --config <file>': 'Uses the given configuration file. When more than one configuration file is specified, they are merged in order of occurance.',
                        '-l, --log <file>': 'Outputs log entries to the given file path instead of to stdout.',
                        '--log-level <level>': 'Only log events greater-than or equal to given level. 0=Info, 1=Warning, 2=Error, 3=Fatal Error.',
                        '--disable-color': 'When using stdout, disables enchanced text modes',
                        '-v, --version': 'Prints version information in output header.',
                        '-h, --help': 'Displays this help inforamtion.'
                    }
                },
                CLUSTERING: {
                    options: {
                        '-u, --cluster [instance count]': 'Enable cluster workers for multi-CPU utilization. The instance count defaults to the number of CPU cores plus one'
                    }
                }
            }
        }));
        process.exit();
    }

    clusterInstanceCount = args.u || args.cluster;
    if(clusterInstanceCount) {
        if(clusterInstanceCount === true || isNaN(clusterInstanceCount)) {
            clusterInstanceCount = require('os').cpus().length + 1;
        }
        else if(clusterInstanceCount <= 0) {
            clusterInstanceCount = false;
        }
    }

    logger.useColor = !args['disable-color'];

    var logLevel = args['log-level'];
    if(logLevel && (logLevel === true || isNaN(logLevel))) {
        logLevel = 0;
    }
    logger.level = logLevel;

    var logFile = args.l || args.log,
        loggingStream;
    if(logFile && typeof logFile === 'string') {
        try {
            loggingStream = fs.createWriteStream(logFile);
            logger.useColor = false;
        }
        catch(ex) {
            logger.log(enums.LogType.Error, 'unable to open log file stream for ' + logFile + '. Using stdout instead.', ex);
        }
    }

    if(!loggingStream && process.stdout.isTTY) {
        loggingStream = process.stdout;
    }

    logger.stream = loggingStream;

    var configurationFiles = [ ];
    if(args.c) {
        functions.buildFlatArray(configurationFiles, args.c);
    }
    if(args.config) {
        functions.buildFlatArray(configurationFiles, args.config);
    }

    var totalConfigurationFiles = configurationFiles.length;
    if(totalConfigurationFiles === 0) {
        logger.log(enums.LogType.Fatal, 'no configuration files specified, unable to continue');
    }

    // Here we'll start loading/merging all the given configuration files into a single object
    configuration = { };
    var loadedConfigurationFiles = 0;
    for(var configIndex = 0; configIndex < totalConfigurationFiles; configIndex++) {
        var currentConfigFile = configurationFiles[configIndex];
        try {
            var currentConfigObject = require(path.resolve(process.cwd(), currentConfigFile));

            for(var property in currentConfigObject.bindings) {
                if(currentConfigObject.bindings.hasOwnProperty(property)) {
                    var resolvedProprety = currentConfigObject.bindings[property];
                    if(typeof resolvedProprety === 'string') {
                        currentConfigObject.bindings[property] = currentConfigObject.bindings[resolvedProprety];
                    }
                }
            }

            functions.mergeObjects(configuration, currentConfigObject);

            loadedConfigurationFiles++;
        }
        catch(ex) {
            logger.log(enums.LogType.Error, 'unable to load configuration file: ' + currentConfigFile, ex);
        }
    }

    if(loadedConfigurationFiles === 0) {
        logger.log(enums.LogType.Fatal, 'unable to load any of the provided configuration files');
    }

    if(clusterInstanceCount) {
        cluster.on('message', logger.workerMessage);

        var onlineCount = 0;
        cluster.on('online', function(worker) {
            functions.workerSendData(enums.WorkerMessages.Configuration, configuration, worker);
            if(++onlineCount === clusterInstanceCount) {
                logger.log(enums.LogType.Info, 'all workers running');
            }
        });

        cluster.on('exit', function(worker, code) {
            if(code === 0) {
                logger.log(enums.LogType.Info, 'worker ' + worker.process.pid + ' has shutdown');
            }
            else {
                logger.log(enums.LogType.Warning, 'worker ' + worker.process.pid + ' has exited unexpectedly, restarting');
                cluster.fork();
            }
            onlineCount--;
        });

        for(var i = 0; i < clusterInstanceCount; i++) {
            cluster.fork();
        }
    }
    else {
        worker(configuration);
    }
}
else {
    functions.workerProcessData(enums.WorkerMessages.Configuration, function(configuration) {
        worker(configuration);
    });
}