'use strict';

var cluster = require('cluster'),
    library = require('../lib/functions.js'),
    logger = require('../lib/logger.js'),
    enums = require('../lib/enums.js');

var args = require('minimist')(process.argv.slice(2));

if(args.v || args.version) {
    var npmPackage = require('../package.json');
    console.log(npmPackage.name + ' ' + npmPackage.version);
    process.stdout.write('Written by ');
    for(var i in npmPackage.contributors) {
        if(npmPackage.contributors.hasOwnProperty(i)) {
            process.stdout.write(npmPackage.contributors[i].name + (i < npmPackage.contributors.length - 1 ? ',' : '\n'));
        }
    }
    process.exit();
}
if(args.h || args.help) {
    var npmPackage = require('../package.json');
    console.log('Usage: ' + npmPackage.name + ' [options]');
    console.log('\nOptions:\n' +
        '  -c, --config [config file]   Uses the configuration file specified.\n' +
        '  --no-default                 Disable loading of the default configuration\n' +
        '  -v, --version                Print version information and exit\n' +
        '  -h, --help                   Prints this help information\n' +
        '  --instances [number]         Number of childs to create. Default is CPU count\n' +
        '  -l, --cluster                Use worker processes; implied by --instances > 1');
    process.exit();
}

function resolveConfigAlias(config, entry) {
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
}