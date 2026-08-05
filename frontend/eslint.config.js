import js from "@eslint/js";
import globals from "globals";
import reactPlugin from "eslint-plugin-react";

export default [
  js.configs.recommended,
  {
    files: ["src/**/*.jsx", "src/**/*.js"],
    plugins: { react: reactPlugin },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: { jsx: true },
        ecmaVersion: "latest",
        sourceType: "module"
      },
      globals: {
        ...globals.browser,
        ...globals.es2021
      }
    },
    rules: {
      "no-undef": "error",
      "react/jsx-no-undef": "error",
      "no-unused-vars": "off"
    }
  }
];
