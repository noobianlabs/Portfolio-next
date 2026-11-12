const next = require("eslint-config-next");
const turbo = require("eslint-config-turbo/flat").default;
const prettier = require("eslint-config-prettier/flat");

module.exports = [
  ...next,
  ...turbo,
  prettier,
  {
    rules: { "@next/next/no-html-link-for-pages": "off" },
    languageOptions: {
      parserOptions: {
        babelOptions: { presets: [require.resolve("next/babel")] },
      },
    },
  },
];
