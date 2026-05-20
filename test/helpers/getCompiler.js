import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Volume, createFsFromVolume } from "memfs";
import webpack from "webpack";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

export default (fixture, loaderOptions = {}, config = {}) => {
  const fullConfig = {
    mode: "development",
    devtool: config.devtool || false,
    context: path.resolve(__dirname, "../fixtures"),
    entry: path.resolve(__dirname, "../fixtures", fixture),
    output: {
      path: path.resolve(__dirname, "../outputs"),
      filename: "[name].bundle.js",
      chunkFilename: "[name].chunk.js",
      library: "lessLoaderExport",
    },
    module: {
      rules: [
        {
          test: /\.less$/i,
          rules: [
            {
              loader: require.resolve("./testLoader.cjs"),
            },
            {
              loader: path.resolve(__dirname, "../../src/index.js"),
              options: loaderOptions || {},
            },
          ],
        },
      ],
    },
    plugins: [],
    ...config,
  };

  const compiler = webpack(fullConfig);

  if (!config.outputFileSystem) {
    compiler.outputFileSystem = createFsFromVolume(new Volume());
  }

  return compiler;
};
