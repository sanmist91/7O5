// React Native sets global.WebSocket before metro-runtime runs.
// @expo/metro-runtime calls require(...).default but RN exports as module.exports = WS.
const WS = global.WebSocket;
module.exports = WS;
module.exports.default = WS;
