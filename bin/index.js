'use strict';

var cluster = require('cluster'),
    fs = require('fs'),
    /*library = require('../lib/functions.js'),*/
    logger = require('../lib/logger.js'),
    enums = require('../lib/enums.js'),
    helpout = require('helpout'),
    npmPackage = require('../package.json');

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
            logger.log(enums.LogType.Error, 'Unable to open log file stream for ' + logFile + '. Using stdout instead.', ex);
        }
    }

    if(!loggingStream && process.stdout.isTTY) {
        loggingStream = process.stdout;
    }

    logger.stream = loggingStream;
}
else {
    configuration = process.env[enums.EnvironmentVar.Configuration];
}

if(clusterInstanceCount) {
    var workerEnv = { };
    workerEnv[enums.EnvironmentVar.Configuration] = configuration;

    cluster.on('message', logger.workerMessage);

    cluster.on('exit', function(worker, code) {
        if(code === 0) {
            logger.log(enums.LogType.Info, 'Worker ' + worker.process.pid + ' has shutdown');
        }
        else {
            logger.log(enums.LogType.Warning, 'Worker ' + worker.process.pid + ' has exited unexpectedly, restarting');
        }
    });

    for(var i = 0; i < clusterInstanceCount; i++) {
        cluster.fork(workerEnv);
    }
}
else {
    logger.log(enums.LogType.Info, 'Just a test');
}

/*function resolveConfigAlias(config, entry) {
    if(typeof entry === 'string') {
        entry = resolveConfigAlias(config, config[entry]);
    }
    return entry;
}

function loadConfig(path) {
    var config = require(path);

    for(var property in config.bindings) {
        if(config.bindings.hasOwnProperty(property)) {
            config.bindings[property] = resolveConfigAlias(config.bindings, config.bindings[property]);
        }
    }

    return config;
}

var instances = args.instances;
if(isNaN(instances)) {
    instances = undefined;
}
var clustered = args.l || args.cluster || instances > 1;

if(cluster.isMaster && clustered) {
    var numberOfWorkers = instances || require('os').cpus().length;
    var workersOnline = 0;
    var stopFork = false;

    cluster.on('online', function() {
        if(++workersOnline === numberOfWorkers) {
            logger.log(enums.LogType.Info, 'All workers are now online');
        }
    });

    cluster.on('exit', function(worker, code) {
        if(code > 0) { // Restart the worker on an error
            logger.log(enums.LogType.Warning, 'Worker ' + worker.process.pid + ' has exited unexpectedly, restarting');
            cluster.fork();
        }
    });

    for(var i = 0; i < numberOfWorkers && !stopFork; i++) {
        var env = {};
        env[library.outputEnabledEnvironmentVariable] = i === 0;
        cluster.fork(env);
    }
}
else {
    var nodelite = require('../lib/index.js');

    // Try to load the default configuration file. If we're not able to for some reason, continue on with a warning.
    var defaultConfiguration;
    if(args.default !== false) {
        try {
            defaultConfiguration = loadConfig('../conf/config.json');
        }
        catch(e) {
            logger.log(enums.LogType.Warning, 'Continuing without loading a default configuration');
            defaultConfiguration = { };
        }
    }

    var externalConfigurations = library.buildFlatArray([ args.c, args.config ]);
    var config;
    for(var i = 0; i < externalConfigurations.length; i++) {
        try {
            if(config == null) {
                config = loadConfig(externalConfigurations[i]);
            }
            else {
                library.mergeObjects(config, loadConfig(externalConfigurations[i]));
            }
        }
        catch(e) {
            logger.log(enums.LogType.Fatal, 'Unable to load configuration file: \'' + externalConfigurations[i] + '\'', e);
        }
    }

    if(config != null) {
        library.mergeObjects(config, defaultConfiguration);
    }
    else if(defaultConfiguration != null) {
        logger.log(enums.LogType.Info, 'Using only default configuraiton');
        config = defaultConfiguration;
    }
    else {
        logger.log(enums.LogType.Fatal, 'No configuration file has been loaded.');
    }

    logger.log(enums.LogType.Info, 'Starting...');
    nodelite.ServerPool(config).start();
    logger.log(enums.LogType.Info, 'Server has been started');
}*/