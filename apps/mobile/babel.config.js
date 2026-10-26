module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    // Reanimated 4 compiles worklets in react-native-worklets; its own plugin entry only forwards here.
    // Must stay last in the list.
    plugins: ["react-native-worklets/plugin"],
  };
};
