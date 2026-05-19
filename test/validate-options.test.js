import { compile, getCompiler } from "./helpers/index";

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

  async function createTestCase(key, value, type) {
    it(`should ${
      type === "success" ? "successfully validate" : "throw an error on"
    } the "${key}" option with "${stringifyValue(value)}" value`, async () => {
      const compiler = getCompiler("./basic.less", {
        [key]: value,
      });
      let stats;

      try {
        stats = await compile(compiler);
      } finally {
        if (type === "success") {
          expect(stats.hasErrors()).toBe(false);
        } else if (type === "failure") {
          const {
            compilation: { errors },
          } = stats;

          expect(errors).toHaveLength(1);
          expect(() => {
            throw new Error(errors[0].error.message);
          }).toThrowErrorMatchingSnapshot();
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
