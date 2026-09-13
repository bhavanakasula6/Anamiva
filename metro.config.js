const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Keep Metro conservative for local web development on Windows/sandboxed shells.
// This also makes the web migration easier to verify in constrained environments.
config.maxWorkers = 1;

module.exports = config;
