import assert from "node:assert";
import { createRequire } from "node:module";
import { describe, it } from "node:test";

import { compile, getCompiler } from "./helpers/index.js";

const require = createRequire(import.meta.url);

describe("validate options", () => {
  const tests = {
    lessOptions: {
      success: [
        { strictMath: true },
        () => ({
          strictMath: true,
        }),
      ],
      failure: [1, true, false, "test", []],
    },
    additionalData: {
      success: ["@background: coral;", () => "@background: coral;"],
      failure: [1, true, false, /test/, [], {}],
    },
    sourceMap: {
      success: [true, false],
      failure: ["string"],
    },
    webpackImporter: {
      success: [true, false, "only"],
      failure: ["string"],
    },
    implementation: {
      success: [require("less"), "less"],
      failure: [true, false, () => {}, []],
    },
    lessLogAsWarnOrErr: {
      success: [true, false],
      failure: ["string"],
    },
    unknown: {
      success: [],
      failure: [1, true, false, "test", /test/, [], {}, { foo: "bar" }],
    },
  };

  function stringifyValue(value) {
    if (
      Array.isArray(value) ||
      (value && typeof value === "object" && value.constructor === Object)
    ) {
      return JSON.stringify(value);
    }

    return value;
  }

  function createTestCase(key, value, type) {
    it(`should ${
      type === "success" ? "successfully validate" : "throw an error on"
    } the "${key}" option with "${stringifyValue(value)}" value`, async (t) => {
      const compiler = getCompiler("./basic.less", {
        [key]: value,
      });
      let stats;

      try {
        stats = await compile(compiler);
      } finally {
        if (type === "success") {
          assert.strictEqual(stats.hasErrors(), false);
        } else if (type === "failure") {
          const {
            compilation: { errors },
          } = stats;

          assert.strictEqual(errors.length, 1);
          t.assert.snapshot(errors[0].error.message);
        }
      }
    });
  }

  for (const [key, values] of Object.entries(tests)) {
    for (const type of Object.keys(values)) {
      for (const value of values[type]) {
        createTestCase(key, value, type);
      }
    }
  }
});
