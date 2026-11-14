module.exports = function (api) {
  api.cache(true);
  return {
    // babel-preset-expo adds react-native-worklets/plugin itself (SDK 58); listing it
    // again would run the worklets transform twice.
    presets: [["babel-preset-expo"]],
  };
};
