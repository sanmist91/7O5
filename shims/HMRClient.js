// @expo/metro-runtime calls require(...).default but RN exports as module.exports = HMRClient.
// We forward to the actual RN HMRClient; the metro.config.js resolver must NOT intercept
// this shim's internal requires (only intercept when requester is metro-runtime).
// Safe fallback: stub that satisfies the HMRClientNativeInterface.
const stub = {
  enable() {},
  disable() {},
  registerBundle(_url) {},
  log(_level, _data) {},
  setup(_opts) {},
};
module.exports = stub;
module.exports.default = stub;
