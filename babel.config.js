const MIN_BABEL_VERSION = 7;

export default (api) => {
  api.assertVersion(MIN_BABEL_VERSION);

  const env = api.env();
  const isEsm = env === "esm";

  return {
    presets: [
      [
        "@babel/preset-env",
        {
          targets: {
            node: "22.11.0",
          },
          modules: isEsm ? false : "commonjs",
          exclude: ["transform-dynamic-import"],
        },
      ],
    ],
  };
};
