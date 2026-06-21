// Shim: RN 0.77 exports getDevServer as module.exports = fn (no .default),
// but @expo/metro-runtime calls require(...).default. This adds .default.
// In Expo Go, the bundle is always loaded from a server, so we return true.
const FALLBACK = 'http://localhost:8081/';

function getDevServer() {
  let url = FALLBACK;
  try {
    const NativeSourceCode = require('react-native/Libraries/NativeModules/specs/NativeSourceCode');
    const scriptUrl = NativeSourceCode.getConstants().scriptURL;
    const match = scriptUrl.match(/^(https?|exp):\/\/[^/]+\//);
    if (match) url = match[0].replace(/^exp:/, 'http:');
  } catch (_e) {
    // ignore — fallback to localhost
  }
  return {
    url,
    fullBundleUrl: null,
    bundleLoadedFromServer: true,
  };
}

module.exports = getDevServer;
module.exports.default = getDevServer;
