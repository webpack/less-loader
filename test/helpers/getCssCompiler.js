import path from "node:path";
import { fileURLToPath } from "node:url";

import { Volume, createFsFromVolume } from "memfs";
import webpack from "webpack";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Creates a compiler which relies on the built-in CSS support of webpack
 * (i.e. `experiments.css`) instead of `css-loader`/`style-loader`.
 * @param {string} fixture fixture
 * @param {object} loaderOptions loader options
 * @param {object} config webpack config, the `type` property is used as the module type of the rule
 * @returns {Compiler} compiler
 */
export default (fixture, loaderOptions = {}, config = {}) => {
  const { type = "css/auto", ...webpackConfig } = config;
  const fullConfig = {
    mode: "development",
    devtool: config.devtool || false,
    context: path.resolve(__dirname, "../fixtures"),
    entry: path.resolve(__dirname, "../fixtures", fixture),
    output: {
      path: path.resolve(__dirname, "../outputs"),
      filename: "[name].bundle.js",
      chunkFilename: "[name].chunk.js",
      cssFilename: "[name].css",
      cssChunkFilename: "[name].chunk.css",
      assetModuleFilename: "[name][ext]",
      pathinfo: false,
    },
    experiments: {
      css: true,
    },
    module: {
      rules: [
        {
          test: /\.less$/i,
          type,
          use: [
            {
              loader: path.resolve(__dirname, "../../src/index.js"),
              options: loaderOptions || {},
            },
          ],
        },
      ],
    },
    plugins: [],
    ...webpackConfig,
  };

  const compiler = webpack(fullConfig);

  if (!config.outputFileSystem) {
    compiler.outputFileSystem = createFsFromVolume(new Volume());
  }

  return compiler;
};
