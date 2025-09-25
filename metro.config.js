const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for SVG files
config.transformer.assetPlugins = ['expo-asset/tools/hashAssetFiles'];

// Ensure proper resolver configuration
config.resolver.alias = {
  '@': __dirname,
};

module.exports = config;