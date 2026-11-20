import assert from "node:assert";
import { createRequire } from "node:module";
import { describe, it } from "node:test";

import { validate } from "schema-utils";

import check from "../src/options.check.js";
import schema from "../src/options.json" with { type: "json" };

import { compile, getCompiler } from "./helpers/index.js";

const require = createRequire(import.meta.url);

/**
 * @param {EXPECTED_ANY} options loader options
 * @returns {boolean} whether the schema accepts them
 */
function isValid(options) {
  try {
    validate(/** @type {EXPECTED_ANY} */ (schema), options);

    return true;
  } catch {
    return false;
  }
}

describe("validate options", () => {
  // Options that are not an object never pass the check. `validate` takes an
  // array as a list of options objects, so it accepts `[]`; the check failing
  // there only means webpack falls back to the full validation.
  for (const value of [[], "invalid", 42, null]) {
    it(`should not pass the check with ${JSON.stringify(value)}`, () => {
      assert.strictEqual(check(value), false);
    });
  }

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

  /**
   * @param {EXPECTED_ANY} value value
   * @returns {string} stringified value
   */
  function stringifyValue(value) {
    if (
      Array.isArray(value) ||
      (value && typeof value === "object" && value.constructor === Object)
    ) {
      return JSON.stringify(value);
    }

    return value;
  }

  /**
   * @param {string} key key
   * @param {EXPECTED_ANY} value value
   * @param {string} type type
   * @returns {Promise<void>} created test case
   */
  function createTestCase(key, value, type) {
    it(`should ${
      type === "success" ? "successfully validate" : "throw an error on"
    } the "${key}" option with "${stringifyValue(value)}" value`, async (t) => {
      // webpack trusts a check that passes and skips the schema, so the two
      // must agree on every value
      assert.strictEqual(check({ [key]: value }), isValid({ [key]: value }));
      assert.strictEqual(check({ [key]: value }), type === "success");

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
