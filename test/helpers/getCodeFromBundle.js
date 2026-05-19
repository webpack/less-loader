import vm from "node:vm";

import readAsset from "./readAsset.js";

function getCodeFromBundle(stats, compiler, asset) {
  let code = null;

  if (
    stats &&
    stats.compilation &&
    stats.compilation.assets &&
    stats.compilation.assets[asset || "main.bundle.js"]
  ) {
    code = readAsset(asset || "main.bundle.js", compiler, stats);
  }

  if (!code) {
    throw new Error("Can't find compiled code");
  }

  const result = vm.runInNewContext(
    `${code};\nmodule.exports = lessLoaderExport;`,
    {
      module: {},
    },
  );

  return result.__esModule ? result.default : result;
}

export default getCodeFromBundle;
