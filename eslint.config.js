import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import prettier from "eslint-config-prettier";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig(
  { ignores: ["dist", "playwright-report", "test-results"] },
  js.configs.recommended,
  tseslint.configs.strict,
  prettier,
  { languageOptions: { globals: { ...globals.browser, ...globals.node } } },
  {
    // The run rules are pure: no Phaser, no browser storage, tested in node.
    files: ["src/logic/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: ["phaser", "**/game/**"] },
      ],
    },
  },
);
