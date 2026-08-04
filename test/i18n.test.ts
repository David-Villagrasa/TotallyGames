import assert from "node:assert/strict";
import test from "node:test";
import {
  CATALOG,
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  createTranslator,
  resolveLocale,
  t,
  type TranslationKey,
} from "../src/renderer/src/i18n";

function leafPaths(value: object, prefix = ""): string[] {
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof child === "string"
      ? [path]
      : leafPaths(child as object, path);
  });
}

const importIssueCodes = [
  "invalid-date",
  "missing-year",
  "year-conflict",
  "unparsed-legacy-row",
  "missing-name",
  "missing-required-field",
  "invalid-score",
  "unknown-recommendation",
  "mixed-rating-fields",
  "ambiguous-year",
  "unknown-format",
  "read-error",
  "encoding-replacement",
  "mixed-rating-batch",
  "summary-row",
] as const;

test("defines exactly the supported locales with Spanish as the fallback", () => {
  assert.deepEqual(SUPPORTED_LOCALES, ["es", "en", "ja"]);
  assert.equal(DEFAULT_LOCALE, "es");
  assert.equal(resolveLocale("en-US"), "en");
  assert.equal(resolveLocale("ja_JP"), "ja");
  assert.equal(resolveLocale("fr-FR"), "es");
  assert.equal(resolveLocale(), "es");
  assert.equal(t("navigation.overview"), "Resumen");
});

test("keeps every locale catalog structurally complete", () => {
  const expected = leafPaths(CATALOG.es).sort();

  for (const locale of SUPPORTED_LOCALES) {
    assert.deepEqual(leafPaths(CATALOG[locale]).sort(), expected, locale);
  }
});

test("translates and interpolates names and counts", () => {
  const english = createTranslator("en");
  const japanese = createTranslator("ja");

  assert.equal(
    english("modal.export.copy", { count: 3 }),
    "Export 3 entries. Fields that do not exist in the selected format are kept inside the comments instead of being dropped.",
  );
  assert.equal(
    english("accessibility.deleteGame", { name: "Outer Wilds" }),
    "Delete Outer Wilds",
  );
  assert.equal(japanese("navigation.library"), "ライブラリ");
  assert.equal(
    japanese("toasts.importedWithDuplicates", { count: 2, duplicates: 1 }),
    "2件のゲームをインポートしました。1件の重複を省略しました。",
  );
});

test("provides localized templates for every import issue code", () => {
  const values = {
    line: 12,
    value: "31/11/23",
    year: 2024,
    message: "EACCES: permission denied",
  };

  for (const locale of SUPPORTED_LOCALES) {
    const translate = createTranslator(locale);
    for (const code of importIssueCodes) {
      const key = `importIssues.${code}` as TranslationKey;
      const message = translate(key, values);

      assert.ok(message.length > 0, `${locale} ${code} is empty`);
      assert.doesNotMatch(message, /\{(?:line|value|year|message)\}/);
    }
  }

  const english = createTranslator("en");
  assert.equal(
    english("importIssues.invalid-date", {
      line: 7,
      value: "31/11/23",
    }),
    'Invalid date "31/11/23" on line 7.',
  );
  assert.equal(
    english("importIssues.read-error", { message: "EACCES: denied" }),
    "Could not read the file: EACCES: denied",
  );
});
