var nodelite = require('../lib/index.js'),
	library = require('../lib/functions.js');

var args = require('minimist')(process.argv.slice(2));

function resolveConfigAlias(config, entry) {
	if(typeof entry === 'string') {
		entry = resolveConfigAlias(config, config[entry]);
	}
	return entry;
}

function loadConfig(path) {
	var config = require(path);
	
	for(var property in config.hosts) {
		if(config.hosts.hasOwnProperty(property)) {
			config.hosts[property] = resolveConfigAlias(config.hosts, config.hosts[property]);
		}
	}
	
	return config;
}

// Try to load the default configuration file. If we're not able to for some reason, continue on with a warning.
var defaultConfiguration = undefined;
try {
	defaultConfiguration = loadConfig('../conf/config.json');
}
catch(e) {
	library.makeWarning('Continuing without loading a default configuration');
	defaultConfiguration = { };
}

var externalConfigurations = library.buildFlatArray([ args.c, args.config ]);
var config = undefined;
for(var i = 0; i < externalConfigurations.length; i++) {
	try {
		if(config === undefined) {
			config = loadConfig(externalConfigurations[i]);
		}
		else {
			library.mergeObjects(config, loadConfig(externalConfigurations[i]));
		}
	}
	catch(e) {
		library.makeError('Unable to load configuration file: \'' + externalConfigurations[i] + '\'', 1);
	}
}

if(config !== undefined) {
	library.mergeObjects(config, defaultConfiguration);
}
else {
	library.makeInfo('Using only default configuraiton');
	config = defaultConfiguration;
}

library.makeInfo('Starting...');
nodelite.ServerPool(config).start();
library.makeInfo('Server has been started');