const path = require("node:path");

const legacyFiles =
  /^(?:src|test|design|docs|legacy|scripts|\.opencode|venv|__pycache__|\.git|out)(?:\\|\/|$)/;
const legacyExtensions =
  /(^|\\|\/)(?:[^\\/]+\.(?:py|pyc)|requirements\.txt|config\.json|electron\.vite\.config\.ts|tsconfig\.json|README\.md|AGENTS\.md|opencode\.json|forge\.config\.cjs|resources\.qrc|package-lock\.json|\.gitignore)$/;

function relativeProjectPath(filePath) {
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.join(__dirname, filePath);
  return path.relative(__dirname, absolutePath);
}

module.exports = {
  packagerConfig: {
    asar: true,
    icon: "assets/floppy",
    name: "DigitalGameTracker",
    ignore: (filePath) => {
      const relativePath = relativeProjectPath(filePath);
      return legacyFiles.test(relativePath) || legacyExtensions.test(relativePath);
    },
  },
  makers: [
    {
      name: "@electron-forge/maker-zip",
      platforms: ["win32"],
    },
  ],
};
