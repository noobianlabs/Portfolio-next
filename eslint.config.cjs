const path = require("path");
const shared = require("./packages/eslint-config-custom");

module.exports = [
  ...shared,
  { settings: { next: { rootDir: path.join(__dirname, "apps/*/") } } },
];
