import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { FileLogger, MAX_LOG_BYTES } from "../src/main/logger";
import { DEFAULT_SETTINGS, SettingsStore } from "../src/main/settings";
import { resetApplicationData } from "../src/main/reset";

test("writes redacted plain-text logs and keeps one capped rotation", async () => {
  const directory = await createTemporaryDirectory("dgt-logger-");
  const logPath = join(directory, "logs", "app.log");
  const logger = new FileLogger(logPath, 256);

  try {
    assert.equal(MAX_LOG_BYTES, 5 * 1024 * 1024);
    await logger.log({
      level: "error",
      process: "renderer",
      operation: "ui:render",
      message:
        "C:\\Users\\dako\\history\\notes.txt notes=private-note password=private-password",
      stack: "Error: failed\n    at render (/Users/dako/My Games/src/App.tsx:1:1)",
    });
    const first = await readFile(logPath, "utf8");
    assert.match(
      first,
      /^\d{4}-\d{2}-\d{2}T.* \| ERROR \| renderer \| ui:render \|/,
    );
    assert.ok(first.includes("notes.txt"));
    assert.ok(!first.includes("C:\\Users\\dako"));
    assert.ok(!first.includes("/Users/dako"));
    assert.ok(!first.includes("private-note"));
    assert.ok(!first.includes("private-password"));
    assert.ok(first.includes("[REDACTED]"));
    assert.ok(first.includes("stack=Error: failed\\n"));

    await logger.log({
      level: "info",
      process: "main",
      operation: "test:rotation",
      message: "x".repeat(300),
    });

    const rotated = await stat(`${logPath}.1`);
    const current = await stat(logPath);
    assert.ok(rotated.size <= 256);
    assert.ok(current.size <= 256);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("logger failures resolve without throwing", async () => {
  const directory = await createTemporaryDirectory("dgt-logger-failure-");
  const blockedPath = join(directory, "not-a-directory");

  try {
    await writeFile(blockedPath, "blocked", "utf8");
    const logger = new FileLogger(join(blockedPath, "app.log"));
    await assert.doesNotReject(
      logger.log({
        level: "error",
        process: "main",
        operation: "test:logger-failure",
        message: "the logger must not throw",
      }),
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("settings are versioned, persisted separately, and reset to the default", async () => {
  const directory = await createTemporaryDirectory("dgt-settings-");
  const settingsPath = join(directory, "settings.v1.json");
  const store = new SettingsStore(settingsPath);

  try {
    assert.deepEqual(await store.load(), DEFAULT_SETTINGS);
    assert.deepEqual(
      await store.save({ schemaVersion: 1, locale: "ja" }),
      { schemaVersion: 1, locale: "ja" },
    );
    assert.deepEqual(JSON.parse(await readFile(settingsPath, "utf8")), {
      schemaVersion: 1,
      locale: "ja",
    });
    assert.deepEqual(await store.reset(), DEFAULT_SETTINGS);
    assert.deepEqual(await store.load(), DEFAULT_SETTINGS);

    await writeFile(settingsPath, '{"schemaVersion":99,"locale":"en"}', "utf8");
    assert.deepEqual(await store.load(), DEFAULT_SETTINGS);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("settings use the supplied system locale only when no preference exists", async () => {
  const directory = await createTemporaryDirectory("dgt-settings-locale-");
  const settingsPath = join(directory, "settings.v1.json");
  const store = new SettingsStore(settingsPath, "ja");

  try {
    assert.deepEqual(await store.load(), { schemaVersion: 1, locale: "ja" });
    assert.deepEqual(
      await store.save({ schemaVersion: 1, locale: "en" }),
      { schemaVersion: 1, locale: "en" },
    );
    assert.deepEqual(await store.load(), { schemaVersion: 1, locale: "en" });
    assert.deepEqual(await store.reset(), { schemaVersion: 1, locale: "ja" });
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("reset requires the typed repository integration and does not touch source files or logs", async () => {
  const directory = await createTemporaryDirectory("dgt-reset-");
  const sourcePath = join(directory, "2025 games.txt");
  const logPath = join(directory, "logs", "app.log");
  let repositoryResets = 0;
  let settingsResets = 0;

  try {
    await writeFile(sourcePath, "original TXT", "utf8");
    await mkdir(join(directory, "logs"), { recursive: true });
    await writeFile(logPath, "original log", "utf8");

    const result = await resetApplicationData(
      {
        reset: async () => {
          repositoryResets += 1;
        },
      },
      {
        reset: async () => {
          settingsResets += 1;
          return { schemaVersion: 1, locale: "es" };
        },
      },
    );

    assert.equal(repositoryResets, 1);
    assert.equal(settingsResets, 1);
    assert.equal(result.libraryReset, true);
    assert.equal(await readFile(sourcePath, "utf8"), "original TXT");
    assert.equal(await readFile(logPath, "utf8"), "original log");
    await assert.rejects(
      resetApplicationData({}, {
        reset: async () => ({ schemaVersion: 1, locale: "es" }),
      }),
      /operacion tipada de reinicio/,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

async function createTemporaryDirectory(prefix: string): Promise<string> {
  return mkdtemp(join(tmpdir(), prefix));
}
