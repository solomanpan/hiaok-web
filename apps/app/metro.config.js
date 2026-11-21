const path = require('node:path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

// npm workspaces: watch the repository root so @hiaok/core and @hiaok/api-client (TypeScript sources) are bundled.
const root = path.resolve(__dirname, '../..');
const config = getDefaultConfig(__dirname);
config.watchFolders = [root];
config.resolver.nodeModulesPaths = [path.join(__dirname, 'node_modules'), path.join(root, 'node_modules')];

module.exports = withNativeWind(config, { input: './global.css' });
