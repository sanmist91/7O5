// Shim: RN 0.77 exports getDevServer as module.exports = fn (no .default),
// but @expo/metro-runtime calls require(...).default. This adds .default.
const NativeSourceCode = require('react-native/Libraries/NativeModules/specs/NativeSourceCode');

let _cachedUrl;
const FALLBACK = 'http://localhost:8081/';

function getDevServer() {
  if (_cachedUrl === undefined) {
    try {
      const scriptUrl = NativeSourceCode.getConstants().scriptURL;
      const match = scriptUrl.match(/^https?:\/\/.*?\//);
      _cachedUrl = match ? match[0] : null;
    } catch (_e) {
      _cachedUrl = null;
    }
  }
  return {
    url: _cachedUrl ?? FALLBACK,
    fullBundleUrl: null,
    bundleLoadedFromServer: _cachedUrl !== null,
  };
}

module.exports = getDevServer;
module.exports.default = getDevServer;
