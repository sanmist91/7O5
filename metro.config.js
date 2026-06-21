const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// @expo/metro-runtime uses require('rn-internal-path').default but RN 0.77
// exports these as module.exports = X (no .default). Shims add .default.
const RN_DEFAULT_SHIMS = {
  'react-native/Libraries/Core/Devtools/getDevServer':
    path.resolve(__dirname, 'shims/getDevServer.js'),
  'react-native/Libraries/WebSocket/WebSocket':
    path.resolve(__dirname, 'shims/WebSocket.js'),
  'react-native/Libraries/Utilities/HMRClient':
    path.resolve(__dirname, 'shims/HMRClient.js'),
};

const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (RN_DEFAULT_SHIMS[moduleName]) {
    return { filePath: RN_DEFAULT_SHIMS[moduleName], type: 'sourceFile' };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
