/** Keep mask/subtract fills when SVGR converts SVGs for react-native-svg. */
module.exports = {
  native: true,
  svgoConfig: {
    plugins: [
      {
        name: "preset-default",
        params: {
          overrides: {
            removeUnknownsAndDefaults: false,
          },
        },
      },
    ],
  },
};
