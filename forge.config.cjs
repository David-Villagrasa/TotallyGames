const legacyFiles =
  /(^|\\|\/)(?:src|test|design|docs|legacy|scripts|\.opencode|venv|__pycache__|node_modules|\.git|out)(?:\\|\/|$)/;
const legacyExtensions =
  /(^|\\|\/)(?:[^\\/]+\.(?:py|pyc)|requirements\.txt|config\.json|electron\.vite\.config\.ts|tsconfig\.json|README\.md|AGENTS\.md|opencode\.json|forge\.config\.cjs|resources\.qrc|package-lock\.json|\.gitignore)$/;

module.exports = {
  packagerConfig: {
    asar: true,
    icon: "assets/floppy",
    name: "DigitalGameTracker",
    ignore: (filePath) =>
      legacyFiles.test(filePath) || legacyExtensions.test(filePath),
  },
  makers: [
    {
      name: "@electron-forge/maker-zip",
      platforms: ["win32"],
    },
  ],
};
