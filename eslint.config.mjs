import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "eslint/config";
import configs from "eslint-config-webpack/configs.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig([
  {
    extends: [configs["recommended-dirty"]],
    languageOptions: {
      ecmaVersion: 2025,
    },
  },
  {
    files: ["test/**/*.{js,cjs,mjs}"],
    settings: {
      n: { version: ">=22.11.0" },
      node: { version: ">=22.11.0" },
    },
    rules: {
      "import/no-extraneous-dependencies": [
        "error",
        {
          devDependencies: true,
          peerDependencies: true,
          packageDir: __dirname,
        },
      ],
    },
  },
  {
    files: ["test/setup-snapshots.js"],
    rules: {
      "n/no-unsupported-features/node-builtins": "off",
    },
  },
]);
