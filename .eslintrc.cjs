/** Root-level ESLint config that extends the shared base rules. */
module.exports = {
  root: true,
  extends: ["./.eslintrc.base.js"],
  ignorePatterns: [
    "**/dist/**",
    "**/build/**",
    "**/node_modules/**",
    "**/src-tauri/**",
    "**/.turbo/**",
    "**/coverage/**"
  ]
}
