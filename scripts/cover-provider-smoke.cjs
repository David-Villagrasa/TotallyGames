const { app } = require("electron");
require("tsx/cjs");
const { mkdtemp, rm } = require("node:fs/promises");
const { tmpdir } = require("node:os");
const { join } = require("node:path");

app.whenReady().then(async () => {
  const { HltbCoverProvider } = require("../src/main/hltb-provider.ts");
  const { CoverStore } = require("../src/main/cover-store.ts");
  const provider = new HltbCoverProvider();
  let directory;
  try {
    const results = await provider.search(process.argv.slice(2).join(" ") || "dark souls remastered");
    directory = await mkdtemp(join(tmpdir(), "dgt-cover-smoke-"));
    const store = new CoverStore(directory);
    const saved = results.length > 0 ? await store.saveSearchResult(results[0]) : null;
    const preview = results.length > 0 ? await store.readSearchPreview(results[0]) : null;
    const dataUrl = saved ? await store.readDataUrl(saved.key) : null;
    console.log(JSON.stringify({
      results,
      saved,
      previewBytes: preview?.length ?? 0,
      dataUrlBytes: dataUrl?.length ?? 0,
    }));
    process.exitCode = results.length > 0 && preview && dataUrl ? 0 : 2;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  } finally {
    if (directory) await rm(directory, { recursive: true, force: true });
    provider.dispose();
    app.quit();
  }
});
