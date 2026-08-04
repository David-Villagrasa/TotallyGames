import {
  createContext,
  startTransition,
  useDeferredValue,
  useEffect,
  useContext,
  useRef,
  useState,
} from "react";
import type { CSSProperties, FormEvent, JSX, RefObject } from "react";
import type {
  CanonicalRatingMode,
  CanonicalRecommendation,
  ExportFormat,
  GameDraft,
  GameEntry,
  ImportBatch,
  ImportFormat,
  ImportIssue,
  LibraryState,
  ParsedGame,
  PreservedRow,
} from "../../domain/types";
import {
  canonicalizeRecommendation,
  DEFAULT_NO_RATING_SCORE,
  recommendationToScore,
  RECOMMENDATION_LABELS,
  scoreToRecommendation,
} from "../../domain/rating";
import { createFingerprint, normalizeText } from "../../domain/text";
import {
  createTranslator,
  DEFAULT_LOCALE,
  resolveLocale,
  SUPPORTED_LOCALES,
} from "./i18n";
import type { Locale, TranslationKey, Translator } from "./i18n";

type View = "overview" | "library" | "import";
type EditorState = { mode: "create" } | { mode: "edit"; game: GameEntry };
type SortKey = "name" | "date" | "rating" | "notes";
type SortDirection = "ascending" | "descending";
type SortState = { key: SortKey; direction: SortDirection };
type RatingLike = Pick<
  GameEntry,
  "name" | "date" | "score" | "recommendation" | "notes"
>;
type RendererError = { operation: string; message: string; stack?: string };
type ExtraMessageKey =
  | "settings.open"
  | "settings.localFirstTitle"
  | "settings.resetDescription"
  | "settings.resetTitle"
  | "settings.resetCopy"
  | "settings.resetSuccess"
  | "rating.modeLabel"
  | "rating.chooseMode"
  | "rating.reviewWarning"
  | "rating.sourceValues"
  | "rating.chooseRecommendation"
  | "rating.scoreHelp"
  | "rating.recommendationHelp"
  | "rating.legacyHelp"
  | "rating.mixedFormat"
  | "sort.ascending"
  | "sort.descending"
  | "sort.activate"
  | "errors.title"
  | "errors.copyDetails"
  | "errors.copied"
  | "errors.clipboardUnavailable"
  | "confirm.deleteConsequence"
  | "preserved.title"
  | "preserved.line"
  | "preserved.kind"
  | "preserved.raw"
  | "preserved.reason"
  | "preserved.metadata"
  | "preserved.unparsed"
  | "preserved.rejected";

const recommendationOptions = RECOMMENDATION_LABELS;
const ratingModeOptions: readonly CanonicalRatingMode[] = [
  "legacy-2021",
  "semicolon-score",
  "semicolon-recommendation",
];

const extraCatalog: Record<Locale, Record<ExtraMessageKey, string>> = {
  es: {
    "settings.open": "Abrir ajustes",
    "settings.localFirstTitle": "Datos locales primero",
    "settings.resetDescription":
      "Borra la biblioteca interna y los ajustes. Los TXT originales y los logs no se tocan.",
    "settings.resetTitle": "Restablecer datos internos?",
    "settings.resetCopy":
      "Se borraran tus entradas guardadas y los ajustes de idioma. Los archivos TXT originales y los logs permaneceran intactos.",
    "settings.resetSuccess":
      "Datos internos restablecidos. Los TXT originales y los logs no se han tocado.",
    "rating.modeLabel": "Modo de puntuacion",
    "rating.chooseMode": "Elige un modo de puntuacion antes de guardar.",
    "rating.reviewWarning":
      "Este registro contiene valores de puntuacion que requieren revision. Elige un modo canonico y guarda para resolverlos. Los valores de origen se conservan hasta entonces.",
    "rating.sourceValues": "Valores de origen conservados",
    "rating.chooseRecommendation": "Elige una recomendacion canonica",
    "rating.scoreHelp": "Solo se guardara una puntuacion entera de 0 a 10.",
    "rating.recommendationHelp": "Solo se guardara una recomendacion canonica.",
    "rating.legacyHelp": "Este modo no guarda puntuacion ni recomendacion.",
    "rating.mixedFormat": "Formato con puntuaciones mezcladas",
    "sort.ascending": "ascendente",
    "sort.descending": "descendente",
    "sort.activate": "Ordenar por {column}. Direccion actual: {direction}.",
    "errors.title": "Error de operacion",
    "errors.copyDetails": "Copiar detalles",
    "errors.copied": "Detalles copiados.",
    "errors.clipboardUnavailable": "El portapapeles no esta disponible.",
    "confirm.deleteConsequence":
      "Solo se eliminara la entrada interna. El TXT original no se tocara.",
    "preserved.title": "Filas conservadas",
    "preserved.line": "Linea",
    "preserved.kind": "Tipo",
    "preserved.raw": "Original",
    "preserved.reason": "Motivo",
    "preserved.metadata": "Metadato",
    "preserved.unparsed": "No interpretada",
    "preserved.rejected": "Rechazada",
  },
  en: {
    "settings.open": "Open settings",
    "settings.localFirstTitle": "Local data first",
    "settings.resetDescription":
      "Clears the internal library and settings. Original TXT files and logs are not touched.",
    "settings.resetTitle": "Reset internal data?",
    "settings.resetCopy":
      "Saved entries and language settings will be removed. Original TXT files and logs will remain intact.",
    "settings.resetSuccess":
      "Internal data reset. Original TXT files and logs were not touched.",
    "rating.modeLabel": "Rating mode",
    "rating.chooseMode": "Choose a rating mode before saving.",
    "rating.reviewWarning":
      "This entry contains rating values that need review. Choose a canonical mode and save to resolve them. Source values stay preserved until then.",
    "rating.sourceValues": "Preserved source values",
    "rating.chooseRecommendation": "Choose a canonical recommendation",
    "rating.scoreHelp": "Only an integer score from 0 to 10 will be saved.",
    "rating.recommendationHelp": "Only a canonical recommendation will be saved.",
    "rating.legacyHelp": "This mode stores neither a score nor a recommendation.",
    "rating.mixedFormat": "Mixed rating format",
    "sort.ascending": "ascending",
    "sort.descending": "descending",
    "sort.activate": "Sort by {column}. Current direction: {direction}.",
    "errors.title": "Operation error",
    "errors.copyDetails": "Copy details",
    "errors.copied": "Details copied.",
    "errors.clipboardUnavailable": "Clipboard is not available.",
    "confirm.deleteConsequence":
      "Only the internal entry will be removed. The original TXT will not be touched.",
    "preserved.title": "Preserved rows",
    "preserved.line": "Line",
    "preserved.kind": "Kind",
    "preserved.raw": "Raw",
    "preserved.reason": "Reason",
    "preserved.metadata": "Metadata",
    "preserved.unparsed": "Unparsed",
    "preserved.rejected": "Rejected",
  },
  ja: {
    "settings.open": "設定を開く",
    "settings.localFirstTitle": "ローカルデータを優先",
    "settings.resetDescription":
      "内部ライブラリと設定を消去します。元のTXTファイルとログは変更しません。",
    "settings.resetTitle": "内部データをリセットしますか？",
    "settings.resetCopy":
      "保存したエントリーと言語設定を削除します。元のTXTファイルとログはそのまま残ります。",
    "settings.resetSuccess":
      "内部データをリセットしました。元のTXTファイルとログは変更していません。",
    "rating.modeLabel": "評価モード",
    "rating.chooseMode": "保存する前に評価モードを選択してください。",
    "rating.reviewWarning":
      "このエントリーには確認が必要な評価値があります。正規のモードを選んで保存すると解決します。それまでは元の値を保持します。",
    "rating.sourceValues": "保持された元の値",
    "rating.chooseRecommendation": "正規の評価を選択",
    "rating.scoreHelp": "0から10までの整数スコアだけを保存します。",
    "rating.recommendationHelp": "正規の評価だけを保存します。",
    "rating.legacyHelp": "このモードではスコアも評価も保存しません。",
    "rating.mixedFormat": "混在した評価形式",
    "sort.ascending": "昇順",
    "sort.descending": "降順",
    "sort.activate": "{column}で並べ替え。現在の方向: {direction}。",
    "errors.title": "操作エラー",
    "errors.copyDetails": "詳細をコピー",
    "errors.copied": "詳細をコピーしました。",
    "errors.clipboardUnavailable": "クリップボードを利用できません。",
    "confirm.deleteConsequence":
      "内部エントリーだけを削除します。元のTXTは変更しません。",
    "preserved.title": "保持された行",
    "preserved.line": "行",
    "preserved.kind": "種類",
    "preserved.raw": "原文",
    "preserved.reason": "理由",
    "preserved.metadata": "メタデータ",
    "preserved.unparsed": "未解析",
    "preserved.rejected": "却下",
  },
};

function extraText(
  locale: Locale,
  key: ExtraMessageKey,
  values: Readonly<Record<string, string | number>> = {},
): string {
  return extraCatalog[locale][key].replace(
    /\{([A-Za-z0-9_]+)\}/g,
    (token, name: string) =>
      Object.prototype.hasOwnProperty.call(values, name)
        ? String(values[name])
        : token,
  );
}

const importIssueTranslationKeys: Record<string, TranslationKey> = {
  "invalid-date": "importIssues.invalid-date",
  "missing-year": "importIssues.missing-year",
  "year-conflict": "importIssues.year-conflict",
  "unparsed-legacy-row": "importIssues.unparsed-legacy-row",
  "missing-name": "importIssues.missing-name",
  "missing-required-field": "importIssues.missing-required-field",
  "invalid-score": "importIssues.invalid-score",
  "unknown-recommendation": "importIssues.unknown-recommendation",
  "mixed-rating-fields": "importIssues.mixed-rating-fields",
  "ambiguous-year": "importIssues.ambiguous-year",
  "unknown-format": "importIssues.unknown-format",
  "read-error": "importIssues.read-error",
  "encoding-replacement": "importIssues.encoding-replacement",
  "mixed-rating-batch": "importIssues.mixed-rating-batch",
  "summary-row": "importIssues.summary-row",
};

function formatImportIssue(issue: ImportIssue, t: Translator): string {
  const key = importIssueTranslationKeys[issue.code];
  if (!key) return issue.message;

  const quotedValue = issue.message.match(/"([^"]+)"/)?.[1];
  const years = issue.message.match(/(20\d{2}).*?(20\d{2})/);
  return t(key, {
    line: issue.line || "?",
    value: quotedValue ?? issue.raw ?? issue.message,
    year: years?.[2] ?? "?",
    message: issue.message,
  });
}

const TranslatorContext = createContext<Translator>(createTranslator(DEFAULT_LOCALE));
const LocaleContext = createContext<Locale>(DEFAULT_LOCALE);

function useT(): Translator {
  return useContext(TranslatorContext);
}

function useLocale(): Locale {
  return useContext(LocaleContext);
}

function isCanonicalRatingMode(
  value: string | undefined,
): value is CanonicalRatingMode {
  return (
    value === "legacy-2021" ||
    value === "semicolon-score" ||
    value === "semicolon-recommendation"
  );
}

function recommendationTranslationKey(
  value: CanonicalRecommendation,
):
  | "recommendations.veryRecommended"
  | "recommendations.recommended"
  | "recommendations.lowRecommended"
  | "recommendations.notRecommended" {
  if (value === "Muy Recomendado") return "recommendations.veryRecommended";
  if (value === "Recomendado") return "recommendations.recommended";
  if (value === "Poco Recomendado") return "recommendations.lowRecommended";
  return "recommendations.notRecommended";
}

function formatDate(date: string, locale: Locale, t: Translator): string {
  if (!date) return t("labels.noDate");
  const timestamp = validDateTimestamp(date);
  if (timestamp === null) return date;
  return new Intl.DateTimeFormat(
    locale === "ja" ? "ja-JP" : locale === "en" ? "en-US" : "es-ES",
    { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" },
  ).format(timestamp);
}

function formatFormat(format: ImportFormat, t: Translator, locale: Locale): string {
  if (format === "legacy-2021") return t("formats.legacy2021");
  if (format === "semicolon-score") return t("formats.semicolonScore");
  if (format === "semicolon-recommendation") {
    return t("formats.semicolonRecommendation");
  }
  if (format === "semicolon-mixed") return extraText(locale, "rating.mixedFormat");
  return t("formats.unknown");
}

function recommendationLabel(value: string, t: Translator): string {
  const canonical = canonicalizeRecommendation(value);
  return canonical ? t(recommendationTranslationKey(canonical)) : value;
}

function scoreLabel(game: RatingLike, t: Translator): string {
  const values: string[] = [];
  if (game.score !== null) values.push(`${game.score}/10`);
  if (game.recommendation) values.push(recommendationLabel(game.recommendation, t));
  return values.length ? values.join(" / ") : t("labels.noScore");
}

function ratingNumber(game: RatingLike): number | null {
  if (game.score !== null) return game.score;
  const recommendation = canonicalizeRecommendation(game.recommendation);
  if (recommendation !== null) return recommendationToScore(recommendation);
  return null;
}

function ratingBucket(game: RatingLike): CanonicalRecommendation | null {
  if (game.score !== null) return scoreToRecommendation(game.score);
  if (game.recommendation === null) return null;
  return canonicalizeRecommendation(game.recommendation);
}

function scoreClass(game: RatingLike): string {
  if (game.score === null && game.recommendation === null) {
    return "score score-neutral";
  }
  const value = ratingNumber(game) ?? DEFAULT_NO_RATING_SCORE;
  if (value >= 9) return "score score-high";
  if (value >= 7) return "score score-mid";
  if (canonicalizeRecommendation(game.recommendation) === null && game.score === null) {
    return "score score-neutral";
  }
  if (value < 7) return "score score-low";
  return "score score-neutral";
}

function draftFromGame(game: GameEntry): GameDraft {
  return {
    name: game.name,
    date: game.date,
    score: game.score,
    recommendation: game.recommendation,
    notes: game.notes,
    year: game.year,
    ...(game.needsReview || !isCanonicalRatingMode(game.ratingMode)
      ? { ratingMode: undefined }
      : { ratingMode: game.ratingMode }),
  };
}

function emptyDraft(): GameDraft {
  return {
    name: "",
    date: "",
    score: null,
    recommendation: null,
    notes: "",
    year: null,
    ratingMode: undefined,
  };
}

function getUniqueYears(games: GameEntry[]): number[] {
  return [
    ...new Set(
      games
        .map((game) => game.year)
        .filter((year): year is number => year !== null),
    ),
  ].sort((left, right) => right - left);
}

function getAverageScore(
  games: GameEntry[],
  locale: Locale,
  t: Translator,
): string {
  const scores = games.flatMap((game) => {
    if (game.score !== null) return [game.score];
    const recommendation = canonicalizeRecommendation(game.recommendation);
    if (recommendation !== null) return [recommendationToScore(recommendation)];
    return [];
  });
  if (!scores.length) return t("forms.scorePlaceholder");
  const average = scores.reduce((total, score) => total + score, 0) / scores.length;
  return new Intl.NumberFormat(
    locale === "ja" ? "ja-JP" : locale === "en" ? "en-US" : "es-ES",
    { minimumFractionDigits: 1, maximumFractionDigits: 1 },
  ).format(average);
}

function getRecommendedCount(games: GameEntry[]): number {
  return games.filter((game) => {
    const bucket = ratingBucket(game);
    return bucket === "Recomendado" || bucket === "Muy Recomendado";
  }).length;
}

function validDateTimestamp(value: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    ? date.getTime()
    : null;
}

function compareSortValues(left: RatingLike, right: RatingLike, key: SortKey): number {
  if (key === "date") {
    const leftDate = validDateTimestamp(left.date);
    const rightDate = validDateTimestamp(right.date);
    if (leftDate === null || rightDate === null) {
      if (leftDate === rightDate) return 0;
      return leftDate === null ? 1 : -1;
    }
    return leftDate - rightDate;
  }

  if (key === "rating") {
    const leftRating = ratingNumber(left);
    const rightRating = ratingNumber(right);
    if (leftRating === null || rightRating === null) {
      if (leftRating === rightRating) return 0;
      return leftRating === null ? 1 : -1;
    }
    return leftRating - rightRating;
  }

  const leftValue = normalizeText(key === "name" ? left.name : left.notes);
  const rightValue = normalizeText(key === "name" ? right.name : right.notes);
  return leftValue.localeCompare(rightValue);
}

function stableSortGames<T extends RatingLike>(games: readonly T[], sort: SortState): T[] {
  return games
    .map((game, index) => ({ game, index }))
    .sort((left, right) => {
      const comparison = compareSortValues(left.game, right.game, sort.key);
      if (comparison === 0) return left.index - right.index;
      if (sort.key === "date" &&
          (validDateTimestamp(left.game.date) === null ||
            validDateTimestamp(right.game.date) === null)) {
        return comparison;
      }
      if (sort.key === "rating" &&
          (ratingNumber(left.game) === null || ratingNumber(right.game) === null)) {
        return comparison;
      }
      return sort.direction === "ascending" ? comparison : -comparison;
    })
    .map(({ game }) => game);
}

function sortColumnLabel(key: SortKey, t: Translator): string {
  if (key === "name") return t("grid.game");
  if (key === "date") return t("grid.date");
  if (key === "rating") return t("grid.scoreVerdict");
  return t("grid.notes");
}

function sortAria(sort: SortState, key: SortKey): "ascending" | "descending" | "none" {
  return sort.key === key ? sort.direction : "none";
}

function sortButtonClass(sort: SortState, key: SortKey): string {
  if (sort.key !== key) return "sortable-button";
  return `sortable-button is-active is-${sort.direction === "ascending" ? "ascending" : "descending"}`;
}

function describeReason(reason: unknown, fallback: string, operation: string): RendererError {
  if (reason instanceof Error) {
    return {
      operation,
      message: reason.message || fallback,
      ...(reason.stack ? { stack: reason.stack } : {}),
    };
  }
  if (typeof reason === "string" && reason.trim()) {
    return { operation, message: reason };
  }
  return { operation, message: fallback };
}

export function App(): JSX.Element {
  const [state, setState] = useState<LibraryState | null>(null);
  const [view, setView] = useState<View>("overview");
  const [query, setQuery] = useState("");
  const [yearFilter, setYearFilter] = useState("all");
  const [recommendationFilter, setRecommendationFilter] = useState("all");
  const [batch, setBatch] = useState<ImportBatch | null>(null);
  const [allowDuplicates, setAllowDuplicates] = useState(false);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [dakosMode, setDakosMode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<RendererError | null>(null);
  const [toast, setToast] = useState("");
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsBusy, setSettingsBusy] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<GameEntry | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const deferredQuery = useDeferredValue(query);
  const t = createTranslator(locale);

  function reportFailure(
    operation: string,
    reason: unknown,
    fallback: string,
  ): void {
    const failure = describeReason(reason, fallback, operation);
    setError(failure);
    try {
      void window.dgt.reportRendererError(failure).catch(() => undefined);
    } catch {
      // Reporting must never replace the original renderer error.
    }
  }

  useEffect(() => {
    let active = true;
    void (async () => {
      const [stateResult, settingsResult] = await Promise.allSettled([
        Promise.resolve().then(() => window.dgt.loadState()),
        Promise.resolve().then(() => window.dgt.loadSettings()),
      ]);
      if (!active) return;

      const nextLocale =
        settingsResult.status === "fulfilled"
          ? resolveLocale(settingsResult.value.locale)
          : DEFAULT_LOCALE;
      setLocale(nextLocale);
      const initialTranslator = createTranslator(nextLocale);

      if (stateResult.status === "fulfilled") {
        setState(stateResult.value);
      } else {
        reportFailure(
          "library:load",
          stateResult.reason,
          initialTranslator("errors.loadLibrary"),
        );
      }

      if (settingsResult.status !== "fulfilled") {
        reportFailure(
          "settings:load",
          settingsResult.reason,
          initialTranslator("errors.unexpected"),
        );
      }
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(""), 4200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    document.title = dakosMode
      ? t("brand.dakosProduct")
      : t("brand.product");
    document.documentElement.lang = locale;
  }, [dakosMode, locale]);

  useEffect(() => {
    if (!settingsOpen || resetOpen) return undefined;
    function closeOnEscape(event: KeyboardEvent): void {
      if (event.key === "Escape") setSettingsOpen(false);
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [resetOpen, settingsOpen]);

  useEffect(() => {
    function handleShortcuts(event: KeyboardEvent): void {
      if (event.key === "F2") {
        event.preventDefault();
        setDakosMode((active) => !active);
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", handleShortcuts);
    return () => window.removeEventListener("keydown", handleShortcuts);
  }, []);

  const games = state?.games ?? [];
  const years = getUniqueYears(games);
  const filteredGames = games
    .filter((game) => yearFilter === "all" || String(game.year) === yearFilter)
    .filter(
      (game) =>
        recommendationFilter === "all" ||
        ratingBucket(game) === recommendationFilter,
    )
    .filter((game) => {
      const haystack =
        `${game.name} ${game.notes} ${game.year ?? ""}`.toLowerCase();
      return haystack.includes(deferredQuery.toLowerCase());
    });

  function navigate(nextView: View): void {
    startTransition(() => setView(nextView));
  }

  async function importWith(
    action: () => Promise<ImportBatch | null>,
  ): Promise<void> {
    setError(null);
    setBusy(true);
    try {
      const selected = await action();
      if (selected) {
        setBatch(selected);
        navigate("import");
      }
    } catch (reason: unknown) {
      reportFailure("import:prepare", reason, t("errors.prepareFiles"));
    } finally {
      setBusy(false);
    }
  }

  async function commitImport(): Promise<void> {
    if (!batch) return;
    setBusy(true);
    setError(null);
    try {
      const result = await window.dgt.commitImport(batch.id, allowDuplicates);
      setState(result.state);
      setBatch(null);
      setAllowDuplicates(false);
      navigate("library");
      setToast(
        result.skippedDuplicates
          ? t("toasts.importedWithDuplicates", {
              count: result.imported,
              duplicates: result.skippedDuplicates,
            })
          : t("toasts.imported", { count: result.imported }),
      );
    } catch (reason: unknown) {
      reportFailure("import:commit", reason, t("errors.confirmImport"));
    } finally {
      setBusy(false);
    }
  }

  async function saveGame(draft: GameDraft): Promise<void> {
    if (!draft.ratingMode) {
      setError({
        operation: "game:save:validation",
        message: extraText(locale, "rating.chooseMode"),
      });
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const next =
        editor?.mode === "edit"
          ? await window.dgt.updateGame(editor.game.id, draft)
          : await window.dgt.createGame(draft);
      setState(next);
      setEditor(null);
      setToast(
        editor?.mode === "edit"
          ? t("toasts.updated")
          : t("toasts.added"),
      );
    } catch (reason: unknown) {
      reportFailure("game:save", reason, t("errors.saveGame"));
    } finally {
      setBusy(false);
    }
  }

  function deleteGame(game: GameEntry): void {
    setDeleteTarget(game);
  }

  async function confirmDelete(): Promise<void> {
    if (!deleteTarget) return;
    const game = deleteTarget;
    setBusy(true);
    setError(null);
    try {
      const next = await window.dgt.deleteGames([game.id]);
      setState(next);
      setDeleteTarget(null);
      setToast(t("toasts.deleted"));
    } catch (reason: unknown) {
      reportFailure("game:delete", reason, t("errors.deleteGame"));
    } finally {
      setBusy(false);
    }
  }

  async function exportLibrary(format: ExportFormat): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const result = await window.dgt.exportLibrary(format);
      if (result) {
        setShowExport(false);
        setToast(
          result.warnings.length
            ? t("toasts.exportedWithWarnings", {
                count: result.rows,
                warnings: result.warnings.length,
              })
            : t("toasts.exported", { count: result.rows }),
        );
      }
    } catch (reason: unknown) {
      reportFailure("library:export", reason, t("errors.exportLibrary"));
    } finally {
      setBusy(false);
    }
  }

  async function changeLocale(nextLocale: Locale): Promise<void> {
    const previousLocale = locale;
    setSettingsBusy(true);
    setBusy(true);
    setError(null);
    try {
      const saved = await window.dgt.saveSettings({
        schemaVersion: 1,
        locale: nextLocale,
      });
      setLocale(resolveLocale(saved.locale));
    } catch (reason: unknown) {
      setLocale(previousLocale);
      reportFailure("settings:save", reason, t("errors.unexpected"));
    } finally {
      setSettingsBusy(false);
      setBusy(false);
    }
  }

  async function resetApplication(): Promise<void> {
    setBusy(true);
    setSettingsBusy(true);
    setError(null);
    try {
      const result = await window.dgt.resetApplicationData();
      setState({ schemaVersion: 2, games: [], imports: [] });
      setBatch(null);
      setAllowDuplicates(false);
      setEditor(null);
      setShowExport(false);
      setQuery("");
      setYearFilter("all");
      setRecommendationFilter("all");
      setLocale(resolveLocale(result.settings.locale));
      setResetOpen(false);
      setSettingsOpen(false);
      setToast(extraText(DEFAULT_LOCALE, "settings.resetSuccess"));
    } catch (reason: unknown) {
      reportFailure("app:reset", reason, t("errors.unexpected"));
    } finally {
      setSettingsBusy(false);
      setBusy(false);
    }
  }

  async function copyErrorDetails(): Promise<void> {
    if (!error) return;
    const details = [
      `Operation: ${error.operation}`,
      `Message: ${error.message}`,
      ...(error.stack ? [`Stack: ${error.stack}`] : []),
    ].join("\n");
    if (!navigator.clipboard || typeof navigator.clipboard.writeText !== "function") {
      setToast(extraText(locale, "errors.clipboardUnavailable"));
      return;
    }
    try {
      await navigator.clipboard.writeText(details);
      setToast(extraText(locale, "errors.copied"));
    } catch {
      setToast(extraText(locale, "errors.clipboardUnavailable"));
    }
  }

  const content = loading ? (
    <LoadingScreen />
  ) : (
    <div className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <Sidebar
        view={view}
        onNavigate={navigate}
        gameCount={games.length}
        importCount={state?.imports.length ?? 0}
        dakosMode={dakosMode}
        settingsOpen={settingsOpen}
        onSettings={() => setSettingsOpen(true)}
      />
      <SettingsPanel
        open={settingsOpen}
        locale={locale}
        busy={settingsBusy}
        onClose={() => setSettingsOpen(false)}
        onLocaleChange={(nextLocale) => void changeLocale(nextLocale)}
        onReset={() => setResetOpen(true)}
      />
      <main className="main-shell">
        <Topbar
          query={query}
          onQueryChange={setQuery}
          searchRef={searchRef}
          onImport={() => void importWith(() => window.dgt.selectImportFiles())}
          onExport={() => setShowExport(true)}
          onAdd={() => setEditor({ mode: "create" })}
          busy={busy}
        />
        {view === "overview" && (
          <Overview
            games={games}
            years={years}
            importCount={state?.imports.length ?? 0}
            onImport={() => void importWith(() => window.dgt.selectImportFiles())}
            onNavigate={navigate}
            onEdit={(game) => setEditor({ mode: "edit", game })}
          />
        )}
        {view === "library" && (
          <LibraryView
            games={filteredGames}
            allGames={games}
            years={years}
            yearFilter={yearFilter}
            recommendationFilter={recommendationFilter}
            onYearFilter={setYearFilter}
            onRecommendationFilter={setRecommendationFilter}
            onEdit={(game) => setEditor({ mode: "edit", game })}
            onDelete={deleteGame}
            onAdd={() => setEditor({ mode: "create" })}
          />
        )}
        {view === "import" && (
          <ImportView
            batch={batch}
            allowDuplicates={allowDuplicates}
            busy={busy}
            onAllowDuplicates={setAllowDuplicates}
            onChooseFiles={() =>
              void importWith(() => window.dgt.selectImportFiles())
            }
            onChooseFolder={() =>
              void importWith(() => window.dgt.selectImportFolder())
            }
            onCommit={() => void commitImport()}
            onCancel={() => setBatch(null)}
          />
        )}
      </main>
      {editor && (
        <GameEditor
          key={editor.mode === "edit" ? editor.game.id : "create"}
          editor={editor}
          busy={busy}
          onClose={() => setEditor(null)}
          onSave={saveGame}
        />
      )}
      {showExport && (
        <ExportDialog
          busy={busy}
          gameCount={games.length}
          onClose={() => setShowExport(false)}
          onExport={exportLibrary}
        />
      )}
      {deleteTarget && (
        <ConfirmationModal
          kind="delete"
          title={t("dialogs.deleteGame", { name: deleteTarget.name })}
          copy={extraText(locale, "confirm.deleteConsequence")}
          busy={busy}
          confirmLabel={t("buttons.delete")}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => void confirmDelete()}
        />
      )}
      {resetOpen && (
        <ConfirmationModal
          kind="reset"
          title={extraText(locale, "settings.resetTitle")}
          copy={extraText(locale, "settings.resetCopy")}
          busy={busy}
          confirmLabel={t("buttons.reset")}
          onCancel={() => setResetOpen(false)}
          onConfirm={() => void resetApplication()}
        />
      )}
      {toast && <div className="toast toast-in">{toast}</div>}
      {error && (
        <ErrorToast
          error={error}
          onDismiss={() => setError(null)}
          onCopy={() => void copyErrorDetails()}
        />
      )}
    </div>
  );

  return (
    <LocaleContext.Provider value={locale}>
      <TranslatorContext.Provider value={t}>{content}</TranslatorContext.Provider>
    </LocaleContext.Provider>
  );
}

function LoadingScreen(): JSX.Element {
  const t = useT();
  return (
    <div className="loading-screen">
      <div className="loading-mark">{t("brand.mark")}</div>
      <div className="loading-line">
        <span />
      </div>
      <p>{t("status.openingLibrary")}</p>
    </div>
  );
}

function SettingsPanel({
  open,
  locale,
  busy,
  onClose,
  onLocaleChange,
  onReset,
}: {
  open: boolean;
  locale: Locale;
  busy: boolean;
  onClose: () => void;
  onLocaleChange: (locale: Locale) => void;
  onReset: () => void;
}): JSX.Element {
  const t = useT();
  return (
    <aside
      id="settings-panel"
      className="settings-panel"
      hidden={!open}
      role="dialog"
      aria-modal="false"
      aria-labelledby="settings-title"
    >
      <div className="settings-panel-heading">
        <div>
          <div className="small-eyebrow">{t("settings.title")}</div>
          <h2 id="settings-title">{t("settings.title")}</h2>
        </div>
        <button
          className="settings-panel-close"
          type="button"
          onClick={onClose}
          aria-label={t("accessibility.close")}
          title={t("tooltips.close")}
        >
          x
        </button>
      </div>
      <div className="settings-panel-section">
        <span className="settings-panel-label">{t("settings.language")}</span>
        <div className="settings-panel-row">
          <span>{t("settings.languageDescription")}</span>
          <select
            className="settings-panel-control"
            value={locale}
            disabled={busy}
            onChange={(event) => {
              const nextLocale = event.target.value;
              if ((SUPPORTED_LOCALES as readonly string[]).includes(nextLocale)) {
                onLocaleChange(nextLocale as Locale);
              }
            }}
            aria-label={t("settings.language")}
          >
            {SUPPORTED_LOCALES.map((supportedLocale) => (
              <option key={supportedLocale} value={supportedLocale}>
                {supportedLocale === "es"
                  ? t("settings.spanish")
                  : supportedLocale === "en"
                    ? t("settings.english")
                    : t("settings.japanese")}
              </option>
            ))}
          </select>
        </div>
        <p className="settings-panel-copy">{t("settings.fallback")}</p>
      </div>
      <div className="settings-panel-section">
        <span className="settings-panel-label">
          {t("brand.localFirst")}
        </span>
        <h3>{extraText(locale, "settings.localFirstTitle")}</h3>
        <p className="settings-panel-copy">{t("brand.originalsStayYours")}</p>
        <p className="settings-panel-copy">
          {extraText(locale, "settings.resetDescription")}
        </p>
      </div>
      <div className="settings-panel-actions">
        <button
          className="button button-danger"
          type="button"
          onClick={onReset}
          disabled={busy}
        >
          {t("buttons.reset")}
        </button>
      </div>
    </aside>
  );
}

function ConfirmationModal({
  kind,
  title,
  copy,
  busy,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  kind: "delete" | "reset";
  title: string;
  copy: string;
  busy: boolean;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}): JSX.Element {
  const t = useT();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = kind === "delete" ? "delete-confirm-title" : "reset-confirm-title";

  useEffect(() => {
    cancelRef.current?.focus();
    function cancelOnEscape(event: KeyboardEvent): void {
      if (event.key === "Escape") {
        event.preventDefault();
        onCancel();
      }
    }
    window.addEventListener("keydown", cancelOnEscape);
    return () => window.removeEventListener("keydown", cancelOnEscape);
  }, [onCancel]);

  return (
    <div
      className="modal-backdrop destructive-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onCancel();
      }}
    >
      <section
        className={kind === "delete" ? "destructive-modal" : "confirmation-modal"}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="modal-top">
          <div className="destructive-mark" aria-hidden="true">
            !
          </div>
          <button
            className="modal-close"
            type="button"
            onClick={onCancel}
            aria-label={t("accessibility.close")}
            title={t("tooltips.close")}
          >
            x
          </button>
        </div>
        <h2 id={titleId}>{title}</h2>
        <p className="destructive-warning">{copy}</p>
        <div className="modal-actions">
          <button
            ref={cancelRef}
            type="button"
            className="button button-ghost"
            onClick={onCancel}
          >
            {t("buttons.cancel")}
          </button>
          <button
            type="button"
            className="button button-danger"
            onClick={onConfirm}
            disabled={busy}
          >
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

function Sidebar({
  view,
  onNavigate,
  gameCount,
  importCount,
  dakosMode,
  settingsOpen,
  onSettings,
}: {
  view: View;
  onNavigate: (view: View) => void;
  gameCount: number;
  importCount: number;
  dakosMode: boolean;
  settingsOpen: boolean;
  onSettings: () => void;
}): JSX.Element {
  const t = useT();
  const locale = useLocale();
  return (
    <aside className="sidebar">
      <div className="brand-lockup">
        <svg
          className="brand-glyph floppy-glyph"
          viewBox="0 0 32 32"
          role="img"
          aria-label={t("accessibility.floppyDisk")}
        >
          <rect x="3" y="3" width="26" height="26" rx="3" />
          <path d="M8 5h15v8H8z" />
          <path d="M11 5v5h9V5" />
          <circle cx="16" cy="21" r="6" />
          <circle className="floppy-center" cx="16" cy="21" r="2" />
        </svg>
        <div>
          <div className="brand-name">
            {dakosMode ? t("brand.dakos") : t("brand.digital")}
          </div>
          <div className="brand-subtitle">{t("brand.subtitle")}</div>
        </div>
      </div>
      <div className="side-rule" />
      <nav className="side-nav" aria-label={t("navigation.main")}>
        <button
          className={view === "overview" ? "nav-item active" : "nav-item"}
          onClick={() => onNavigate("overview")}
          title={t("navigation.overview")}
        >
          <span className="nav-dot" /> {t("navigation.overview")}
        </button>
        <button
          className={view === "library" ? "nav-item active" : "nav-item"}
          onClick={() => onNavigate("library")}
          title={t("navigation.library")}
        >
          <span className="nav-dot" /> {t("navigation.library")} {" "}
          <span className="nav-count">{gameCount}</span>
        </button>
        <button
          className={view === "import" ? "nav-item active" : "nav-item"}
          onClick={() => onNavigate("import")}
          title={t("navigation.importHistory")}
        >
          <span className="nav-dot" /> {t("navigation.importHistory")} {" "}
          <span className="nav-count">{importCount}</span>
        </button>
      </nav>
      <button
        className="settings-panel-trigger settings-trigger-mobile"
        type="button"
        onClick={onSettings}
        aria-expanded={settingsOpen}
        aria-controls="settings-panel"
        aria-label={extraText(locale, "settings.open")}
        title={extraText(locale, "settings.open")}
      >
        <span aria-hidden="true">⚙</span>
        <span className="settings-trigger-label">{t("settings.title")}</span>
      </button>
      <div className="sidebar-footer">
        <div className="offline-row">
          <div className="offline-pill">
            <span className="status-pulse" /> {t("brand.localFirst")}
          </div>
          <button
            className="settings-panel-trigger"
            type="button"
            onClick={onSettings}
            aria-expanded={settingsOpen}
            aria-controls="settings-panel"
            aria-label={extraText(locale, "settings.open")}
            title={extraText(locale, "settings.open")}
          >
            <span aria-hidden="true">⚙</span>
            <span>{t("settings.title")}</span>
          </button>
        </div>
        <p>{t("brand.originalsStayYours")}</p>
        <span className="version-label">{t("brand.migrationVersion")}</span>
      </div>
    </aside>
  );
}

function Topbar({
  query,
  onQueryChange,
  searchRef,
  onImport,
  onExport,
  onAdd,
  busy,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  searchRef: RefObject<HTMLInputElement | null>;
  onImport: () => void;
  onExport: () => void;
  onAdd: () => void;
  busy: boolean;
}): JSX.Element {
  const t = useT();
  return (
    <header className="topbar">
      <label className="search-box" title={t("tooltips.search")}>
        <span className="search-icon">/</span>
        <input
          ref={searchRef}
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={t("forms.searchPlaceholder")}
          aria-label={t("accessibility.search")}
        />
        <span className="search-shortcut">{t("forms.searchShortcut")}</span>
      </label>
      <div className="topbar-actions">
        <button
          className="button button-ghost"
          onClick={onExport}
          disabled={busy}
          title={t("tooltips.export")}
        >
          {t("buttons.export")}
        </button>
        <button
          className="button button-ghost"
          onClick={onImport}
          disabled={busy}
          title={t("tooltips.import")}
        >
          <span className="button-plus">+</span> {t("buttons.import")}
        </button>
        <button
          className="button button-primary"
          onClick={onAdd}
          disabled={busy}
          title={t("tooltips.addGame")}
        >
          {t("buttons.addGame")} <span className="button-arrow">-&gt;</span>
        </button>
      </div>
    </header>
  );
}

function Overview({
  games,
  years,
  importCount,
  onImport,
  onNavigate,
  onEdit,
}: {
  games: GameEntry[];
  years: number[];
  importCount: number;
  onImport: () => void;
  onNavigate: (view: View) => void;
  onEdit: (game: GameEntry) => void;
}): JSX.Element {
  const t = useT();
  const locale = useLocale();
  const recent = [...games]
    .sort((left, right) => right.date.localeCompare(left.date))
    .slice(0, 5);
  const latestYear = years[0];
  const yearRows = years.slice(0, 5).map((year) => ({
    year,
    count: games.filter((game) => game.year === year).length,
  }));
  const maxYearCount = Math.max(...yearRows.map((row) => row.count), 1);

  return (
    <div className="page-content overview-page">
      <section className="intro-row reveal reveal-one">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-line" /> {t("headings.overviewEyebrow")}
          </div>
          <h1>
            {t("headings.overviewLead")}
            <br />
            <em>{t("headings.overviewAccent")}</em>{" "}
            {t("headings.overviewTail")}
          </h1>
          <p className="intro-copy">
            {t("copy.overviewIntro")}
          </p>
        </div>
        <div className="hero-orbit" aria-hidden="true">
          <div className="orbit orbit-large" />
          <div className="orbit orbit-small" />
          <span className="orbit-star star-one" />
          <span className="orbit-star star-two" />
          <span className="orbit-core">{latestYear ?? "--"}</span>
          <span className="orbit-caption">
            {t("headings.latest")}
            <br />
            {t("headings.chapter")}
          </span>
        </div>
      </section>

      <section className="stat-grid reveal reveal-two">
        <StatCard
          label={t("headings.gamesLogged")}
          value={String(games.length)}
          detail={t("headings.acrossYears")}
          accent="lime"
        />
        <StatCard
          label={t("headings.averageScore")}
          value={getAverageScore(games, locale, t)}
          detail={t("headings.outOfTen")}
          accent="coral"
        />
        <StatCard
          label={t("headings.lovedLiked")}
          value={`${getRecommendedCount(games)}`}
          detail={t("headings.sevenPlusOrRecommended")}
          accent="blue"
        />
        <StatCard
          label={t("headings.importSessions")}
          value={String(importCount)}
          detail={t("headings.originalsUntouched")}
          accent="violet"
        />
      </section>

      <section className="dashboard-grid reveal reveal-three">
        <div className="panel arc-panel">
          <PanelHeading
            eyebrow={t("headings.arcEyebrow")}
            title={t("headings.yearsInPlay")}
            action={t("buttons.viewLibrary")}
            onAction={() => onNavigate("library")}
          />
          <div className="year-chart">
            {yearRows.length === 0 && <EmptyChart />}
            {yearRows.map((row, index) => (
              <div
                className="chart-row"
                key={row.year}
                style={{ "--row-delay": `${index * 80}ms` } as CSSProperties}
              >
                <span className="chart-year">{row.year}</span>
                <div className="chart-track">
                  <div
                    className="chart-fill"
                    style={{ width: `${(row.count / maxYearCount) * 100}%` }}
                  />
                </div>
                <span className="chart-count">
                  {row.count.toString().padStart(2, "0")}
                </span>
              </div>
            ))}
          </div>
          <div className="panel-footnote">
            <span className="mini-mark" /> {t("copy.everyYearFootnote")}
          </div>
        </div>
        <div className="panel recent-panel">
          <PanelHeading
            eyebrow={t("headings.recentlyPlayedEyebrow")}
            title={t("headings.lastEntries")}
            action={t("buttons.seeAll")}
            onAction={() => onNavigate("library")}
          />
          <div className="recent-list">
            {recent.length === 0 && (
              <EmptyState
                compact
                title={t("empty.recentTitle")}
                copy={t("empty.recentCopy")}
              />
            )}
            {recent.map((game, index) => (
              <button
                className="recent-item"
                key={game.id}
                onClick={() => onEdit(game)}
                style={{ "--row-delay": `${index * 65}ms` } as CSSProperties}
              >
                <span className="recent-index">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="recent-name">{game.name}</span>
                <span className={scoreClass(game)}>{scoreLabel(game, t)}</span>
                <span className="recent-date">
                  {formatDate(game.date, locale, t)}
                </span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="import-callout reveal reveal-four">
        <div className="callout-stamp">{t("headings.importCalloutStamp")}</div>
        <div className="callout-copy">
          <h2>{t("headings.importCalloutTitle")}</h2>
          <p>{t("copy.importCallout")}</p>
        </div>
        <button className="button button-light" onClick={onImport}>
          {t("buttons.startImport")} <span className="button-arrow">-&gt;</span>
        </button>
      </section>
    </div>
  );
}

function StatCard({
  label,
  value,
  detail,
  accent,
}: {
  label: string;
  value: string;
  detail: string;
  accent: string;
}): JSX.Element {
  return (
    <div className={`stat-card stat-${accent}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-detail">
        <span /> {detail}
      </div>
    </div>
  );
}

function PanelHeading({
  eyebrow,
  title,
  action,
  onAction,
}: {
  eyebrow: string;
  title: string;
  action: string;
  onAction: () => void;
}): JSX.Element {
  return (
    <div className="panel-heading">
      <div>
        <div className="small-eyebrow">{eyebrow}</div>
        <h2>{title}</h2>
      </div>
      <button className="text-button" onClick={onAction} title={action}>
        {action} <span>-&gt;</span>
      </button>
    </div>
  );
}

function EmptyChart(): JSX.Element {
  const t = useT();
  return (
    <div className="empty-chart">
      {t("empty.chart")}
    </div>
  );
}

function SortableColumn({
  column,
  label,
  sort,
  onSort,
}: {
  column: SortKey;
  label: string;
  sort: SortState;
  onSort: (column: SortKey) => void;
}): JSX.Element {
  const locale = useLocale();
  const direction = sortAria(sort, column);
  const nextDirection =
    sort.key === column && sort.direction === "ascending"
      ? "descending"
      : "ascending";
  const nextDirectionLabel =
    nextDirection === "ascending"
      ? extraText(locale, "sort.ascending")
      : extraText(locale, "sort.descending");
  return (
    <div className="sortable-column" role="columnheader" aria-sort={direction}>
      <button
        className={sortButtonClass(sort, column)}
        onClick={() => onSort(column)}
        aria-label={extraText(locale, "sort.activate", {
          column: label,
          direction: nextDirectionLabel,
        })}
        title={extraText(locale, "sort.activate", {
          column: label,
          direction: nextDirectionLabel,
        })}
      >
        {label}
        <span className="sortable-indicator" aria-hidden="true" />
      </button>
    </div>
  );
}

function LibraryView({
  games,
  allGames,
  years,
  yearFilter,
  recommendationFilter,
  onYearFilter,
  onRecommendationFilter,
  onEdit,
  onDelete,
  onAdd,
}: {
  games: GameEntry[];
  allGames: GameEntry[];
  years: number[];
  yearFilter: string;
  recommendationFilter: string;
  onYearFilter: (value: string) => void;
  onRecommendationFilter: (value: string) => void;
  onEdit: (game: GameEntry) => void;
  onDelete: (game: GameEntry) => void;
  onAdd: () => void;
}): JSX.Element {
  const t = useT();
  const locale = useLocale();
  const [sort, setSort] = useState<SortState>({
    key: "date",
    direction: "descending",
  });
  const sortedGames = stableSortGames(games, sort);

  function onSort(column: SortKey): void {
    setSort((current) => ({
      key: column,
      direction:
        current.key === column && current.direction === "ascending"
          ? "descending"
          : "ascending",
    }));
  }

  return (
    <div className="page-content library-page">
      <div className="page-heading reveal reveal-one">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-line" /> {t("headings.libraryEyebrow")}
          </div>
          <h1>
            {t("headings.libraryLead")}
            <br />
            <em>{t("headings.libraryAccent")}</em>
          </h1>
        </div>
        <div className="heading-note">
          <strong>{games.length.toString().padStart(2, "0")}</strong>{" "}
          {t("labels.libraryCount", {
            shown: "",
            total: allGames.length,
          })}
        </div>
      </div>
      <div className="filter-bar reveal reveal-two">
        <div className="filter-label">{t("forms.filterBy")}</div>
        <select
          value={yearFilter}
          onChange={(event) => onYearFilter(event.target.value)}
          aria-label={t("forms.allYears")}
        >
          <option value="all">{t("forms.allYears")}</option>
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
        <select
          value={recommendationFilter}
          onChange={(event) => onRecommendationFilter(event.target.value)}
          aria-label={t("forms.allVerdicts")}
        >
          <option value="all">{t("forms.allVerdicts")}</option>
          {recommendationOptions.map((option) => (
            <option key={option} value={option}>
              {t(recommendationTranslationKey(option))}
            </option>
          ))}
        </select>
        <button
          className="filter-reset"
          onClick={() => {
            onYearFilter("all");
            onRecommendationFilter("all");
          }}
          title={t("tooltips.resetFilters")}
        >
          {t("buttons.reset")}
        </button>
        <button
          className="button button-primary button-small"
          onClick={onAdd}
          title={t("tooltips.addGame")}
        >
          + {t("buttons.addGame")}
        </button>
      </div>
      <div className="library-list reveal reveal-three">
        <div className="library-list-head">
          <SortableColumn
            column="name"
            label={t("grid.libraryGameYear")}
            sort={sort}
            onSort={onSort}
          />
          <SortableColumn
            column="date"
            label={t("grid.date")}
            sort={sort}
            onSort={onSort}
          />
          <SortableColumn
            column="rating"
            label={t("grid.verdict")}
            sort={sort}
            onSort={onSort}
          />
          <SortableColumn
            column="notes"
            label={t("grid.notes")}
            sort={sort}
            onSort={onSort}
          />
          <span />
        </div>
        {games.length === 0 && (
          <EmptyState
            title={t("empty.libraryTitle")}
            copy={t("empty.libraryCopy")}
          />
        )}
        {sortedGames.map((game, index) => (
          <GameRow
            key={game.id}
            game={game}
            index={index}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </div>
    </div>
  );
}

function GameRow({
  game,
  index,
  onEdit,
  onDelete,
}: {
  game: GameEntry;
  index: number;
  onEdit: (game: GameEntry) => void;
  onDelete: (game: GameEntry) => void;
}): JSX.Element {
  const t = useT();
  const locale = useLocale();
  return (
    <div
      className="game-row"
      style={
        { "--row-delay": `${Math.min(index, 12) * 35}ms` } as CSSProperties
      }
    >
      <button className="game-main" onClick={() => onEdit(game)}>
        <span className="row-index">{String(index + 1).padStart(2, "0")}</span>
          <span>
            <strong>{game.name}</strong>
            <small>{game.year ?? t("labels.noYear")}</small>
          </span>
        </button>
      <span className="game-date">{formatDate(game.date, locale, t)}</span>
      <span className={scoreClass(game)}>{scoreLabel(game, t)}</span>
      <span className="game-notes">
        {game.notes || t("forms.scorePlaceholder")}
      </span>
      <div className="row-actions">
        <button
          aria-label={t("accessibility.editGame", { name: game.name })}
          title={t("tooltips.editGame", { name: game.name })}
          onClick={() => onEdit(game)}
        >
          {t("buttons.edit")}
        </button>
        <button
          aria-label={t("accessibility.deleteGame", { name: game.name })}
          title={t("tooltips.deleteGame", { name: game.name })}
          onClick={() => onDelete(game)}
        >
          {t("buttons.delete")}
        </button>
      </div>
    </div>
  );
}

function ImportView({
  batch,
  allowDuplicates,
  busy,
  onAllowDuplicates,
  onChooseFiles,
  onChooseFolder,
  onCommit,
  onCancel,
}: {
  batch: ImportBatch | null;
  allowDuplicates: boolean;
  busy: boolean;
  onAllowDuplicates: (value: boolean) => void;
  onChooseFiles: () => void;
  onChooseFolder: () => void;
  onCommit: () => void;
  onCancel: () => void;
}): JSX.Element {
  const t = useT();
  const locale = useLocale();
  const rows = batch?.files.flatMap((file) => file.rows) ?? [];
  const [sort, setSort] = useState<SortState>({
    key: "date",
    direction: "ascending",
  });
  const sortedRows = stableSortGames<ParsedGame>(rows, sort);
  const preserved =
    batch?.files.reduce(
      (total, file) => total + file.preservedRows.length,
      0,
    ) ?? 0;
  const errors =
    batch?.files.reduce((total, file) => total + file.errors.length, 0) ?? 0;
  const warnings =
    batch?.files.reduce((total, file) => total + file.warnings.length, 0) ?? 0;
  const seen = new Set<string>();
  let duplicateCount = 0;
  rows.forEach((row) => {
    const fingerprint = createFingerprint(row);
    if (seen.has(fingerprint)) duplicateCount += 1;
    seen.add(fingerprint);
  });

  function onSort(column: SortKey): void {
    setSort((current) => ({
      key: column,
      direction:
        current.key === column && current.direction === "ascending"
          ? "descending"
          : "ascending",
    }));
  }

  if (!batch) {
    return (
      <div className="page-content import-page">
        <div className="page-heading reveal reveal-one">
          <div>
            <div className="eyebrow">
              <span className="eyebrow-line" /> {t("headings.importStudioEyebrow")}
            </div>
            <h1>
              {t("headings.importLead")}
              <br />
              <em>{t("headings.importAccent")}</em>
            </h1>
          </div>
        </div>
        <div className="import-empty reveal reveal-two">
          <div className="import-ring">
            <span>TXT</span>
          </div>
          <div className="import-empty-copy">
            <h2>{t("headings.safeStepTitle")}</h2>
            <p>{t("copy.safeStep")}</p>
          </div>
          <div className="import-actions">
            <button className="button button-primary" onClick={onChooseFiles}>
              {t("buttons.chooseTxtFiles")} {" "}
              <span className="button-arrow">-&gt;</span>
            </button>
            <button className="button button-ghost" onClick={onChooseFolder}>
              {t("buttons.scanFolder")}
            </button>
          </div>
        </div>
        <div className="principle-grid reveal reveal-three">
          <Principle
            number="01"
            title={t("import.principles.detect")}
            copy={t("import.principles.detectCopy")}
          />
          <Principle
            number="02"
            title={t("import.principles.review")}
            copy={t("import.principles.reviewCopy")}
          />
          <Principle
            number="03"
            title={t("import.principles.preserve")}
            copy={t("import.principles.preserveCopy")}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="page-content import-page">
      <div className="page-heading import-heading reveal reveal-one">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-line" /> {t("headings.reviewEyebrow")}
          </div>
          <h1>
            {t("headings.reviewLead")}
            <br />
            <em>{t("headings.reviewAccent")}</em>
          </h1>
        </div>
        <button className="text-button" onClick={onCancel}>
          {t("buttons.cancelPreview")} <span>x</span>
        </button>
      </div>
      <div className="import-summary-grid reveal reveal-two">
        <ImportSummary
          label={t("labels.files")}
          value={String(batch.files.length)}
          accent="lime"
        />
        <ImportSummary
          label={t("labels.rowsReady")}
          value={String(rows.length)}
          accent="blue"
        />
        <ImportSummary
          label={t("labels.warnings")}
          value={String(warnings)}
          accent="coral"
        />
        <ImportSummary
          label={t("labels.preserved")}
          value={String(preserved + errors)}
          accent="violet"
        />
      </div>
      <div className="batch-list reveal reveal-three">
        {batch.files.length === 0 && (
          <div className="panel empty-batch">
            <h2>{t("empty.noTxtFilesTitle")}</h2>
            <p>{t("empty.noTxtFilesCopy")}</p>
          </div>
        )}
        {batch.files.map((file) => (
          <ImportFileCard key={file.filePath} file={file} />
        ))}
      </div>
      {rows.length > 0 && (
        <div className="panel preview-panel reveal reveal-four">
          <div className="panel-heading">
            <div>
              <div className="small-eyebrow">{t("headings.firstRows")}</div>
              <h2>{t("headings.whatWillEnterLibrary")}</h2>
            </div>
            <span className="preview-count">
              {t("labels.previewRows", { count: rows.length })}
            </span>
          </div>
          <div className="preview-table">
            <div className="preview-head">
              <SortableColumn
                column="name"
                label={t("grid.game")}
                sort={sort}
                onSort={onSort}
              />
              <SortableColumn
                column="date"
                label={t("grid.date")}
                sort={sort}
                onSort={onSort}
              />
              <SortableColumn
                column="rating"
                label={t("grid.scoreVerdict")}
                sort={sort}
                onSort={onSort}
              />
              <SortableColumn
                column="notes"
                label={t("grid.notes")}
                sort={sort}
                onSort={onSort}
              />
            </div>
            {sortedRows.slice(0, 8).map((row, index) => (
              <div
                className="preview-row"
                key={`${row.source.filePath}-${row.source.line}-${index}`}
              >
                <strong>{row.name}</strong>
                <span>{formatDate(row.date, locale, t)}</span>
                <span className={scoreClass(row)}>{scoreLabel(row, t)}</span>
                <span>{row.notes || t("forms.scorePlaceholder")}</span>
              </div>
            ))}
          </div>
          {rows.length > 8 && (
            <div className="preview-more">
              {t("labels.morePreviewRows", { count: rows.length - 8 })}
            </div>
          )}
        </div>
      )}
      <div className="import-confirm-bar reveal reveal-four">
        <div>
          <label className="duplicate-toggle">
            <input
              type="checkbox"
              checked={allowDuplicates}
              onChange={(event) => onAllowDuplicates(event.target.checked)}
            />
            <span className="toggle-track">
              <span />
            </span>
            <span>{t("forms.allowRepeatedEntries")}</span>
          </label>
          <p>
            {duplicateCount
              ? duplicateCount === 1
                ? t("import.duplicateSingular", { count: duplicateCount })
                : t("import.duplicatePlural", { count: duplicateCount })
              : t("import.repeatedDefault")}
          </p>
        </div>
        <button
          className="button button-light"
          onClick={onCommit}
          disabled={busy || rows.length === 0}
        >
          {busy ? t("status.saving") : t("buttons.confirmImport")} {" "}
          <span className="button-arrow">-&gt;</span>
        </button>
      </div>
    </div>
  );
}

function ImportSummary({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}): JSX.Element {
  return (
    <div className={`import-summary import-${accent}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ImportFileCard({
  file,
}: {
  file: ImportBatch["files"][number];
}): JSX.Element {
  const t = useT();
  const locale = useLocale();
  const yearSource =
    file.yearSource === "filename"
      ? t("import.yearSources.filename")
      : file.yearSource === "content"
        ? t("import.yearSources.content")
        : t("import.yearSources.review");
  return (
    <div className="file-card">
      <div className="file-card-top">
        <span className="file-badge">TXT</span>
        <div className="file-name">
          <strong>{file.fileName}</strong>
          <small>{formatFormat(file.format, t, locale)}</small>
        </div>
        <span
          className={
            file.errors.length
              ? "file-status status-error"
              : file.warnings.length
                ? "file-status status-warning"
                : "file-status status-ok"
          }
        >
          {file.errors.length
            ? t("import.status.reviewNeeded")
            : file.warnings.length
              ? t("import.status.hasNotes")
              : t("import.status.ready")}
        </span>
      </div>
      <div className="file-card-meta">
        <span>
          <b>{file.year ?? t("labels.noYear")}</b> {t("labels.year")} / {yearSource}
        </span>
        <span>
          {t("labels.validRows", { count: file.rows.length })}
        </span>
        <span>
          {t("labels.rejectedRows", { count: file.errors.length })}
        </span>
        <span>
          {t("labels.preservedRows", { count: file.preservedRows.length })}
        </span>
      </div>
      {(file.errors.length > 0 || file.warnings.length > 0) && (
        <div className="issue-list">
          {[...file.errors, ...file.warnings]
            .slice(0, 4)
            .map((entry, index) => (
              <div
                className={`issue issue-${entry.severity}`}
                key={`${entry.code}-${index}`}
              >
                <span>{entry.severity === "error" ? "!" : "~"}</span>
                <div>
                  <strong>
                    {entry.line
                      ? t("labels.line", { line: entry.line })
                      : t("labels.file")}
                  </strong>
                  {formatImportIssue(entry, t)}
                </div>
              </div>
            ))}
        </div>
      )}
      {file.preservedRows.length > 0 && (
        <PreservedRowsTable rows={file.preservedRows} />
      )}
    </div>
  );
}

type PreservedSortKey = "line" | "kind" | "raw" | "reason";

function preservedKindLabel(kind: PreservedRow["kind"], locale: Locale): string {
  if (kind === "metadata") return extraText(locale, "preserved.metadata");
  if (kind === "unparsed") return extraText(locale, "preserved.unparsed");
  return extraText(locale, "preserved.rejected");
}

function PreservedRowsTable({ rows }: { rows: PreservedRow[] }): JSX.Element {
  const t = useT();
  const locale = useLocale();
  const [sort, setSort] = useState<{
    key: PreservedSortKey;
    direction: SortDirection;
  }>({ key: "line", direction: "ascending" });

  const sortedRows = rows
    .map((row, index) => ({ row, index }))
    .sort((left, right) => {
      let comparison = 0;
      if (sort.key === "line") comparison = left.row.line - right.row.line;
      else if (sort.key === "kind") {
        comparison = left.row.kind.localeCompare(right.row.kind);
      } else {
        comparison = normalizeText(left.row[sort.key]).localeCompare(
          normalizeText(right.row[sort.key]),
        );
      }
      if (comparison === 0) comparison = left.index - right.index;
      return sort.direction === "ascending" ? comparison : -comparison;
    })
    .map(({ row }) => row);

  function onSort(key: PreservedSortKey): void {
    setSort((current) => ({
      key,
      direction:
        current.key === key && current.direction === "ascending"
          ? "descending"
          : "ascending",
    }));
  }

  function column(key: PreservedSortKey, label: string): JSX.Element {
    const active = sort.key === key;
    const direction = active ? sort.direction : "none";
    const nextDirection =
      active && sort.direction === "ascending" ? "descending" : "ascending";
    return (
      <div className="sortable-column" role="columnheader" aria-sort={direction}>
        <button
          className={active ? `sortable-button is-active is-${sort.direction}` : "sortable-button"}
          type="button"
          onClick={() => onSort(key)}
          aria-label={extraText(locale, "sort.activate", {
            column: label,
            direction: extraText(locale, `sort.${nextDirection}` as ExtraMessageKey),
          })}
        >
          {label}
          <span className="sortable-indicator" aria-hidden="true" />
        </button>
      </div>
    );
  }

  return (
    <section className="preserved-rows" aria-labelledby="preserved-rows-title">
      <h3 id="preserved-rows-title">{extraText(locale, "preserved.title")}</h3>
      <div className="preview-table preserved-table">
        <div className="preview-head">
          {column("line", extraText(locale, "preserved.line"))}
          {column("kind", extraText(locale, "preserved.kind"))}
          {column("raw", extraText(locale, "preserved.raw"))}
          {column("reason", extraText(locale, "preserved.reason"))}
        </div>
        {sortedRows.map((row) => (
          <div className="preview-row" key={`${row.line}-${row.raw}`}>
            <span>{row.line || "-"}</span>
            <span>{preservedKindLabel(row.kind, locale)}</span>
            <span>{row.raw || "-"}</span>
            <span>{row.reason}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function Principle({
  number,
  title,
  copy,
}: {
  number: string;
  title: string;
  copy: string;
}): JSX.Element {
  return (
    <div className="principle">
      <span>{number}</span>
      <h3>{title}</h3>
      <p>{copy}</p>
    </div>
  );
}

function EmptyState({
  title,
  copy,
  compact = false,
}: {
  title: string;
  copy: string;
  compact?: boolean;
}): JSX.Element {
  return (
    <div className={compact ? "empty-state empty-compact" : "empty-state"}>
      <div className="empty-symbol">+</div>
      <h3>{title}</h3>
      <p>{copy}</p>
    </div>
  );
}

function ErrorToast({
  error,
  onDismiss,
  onCopy,
}: {
  error: RendererError;
  onDismiss: () => void;
  onCopy: () => void;
}): JSX.Element {
  const t = useT();
  const locale = useLocale();
  return (
    <div className="error-toast toast-error" role="alert" aria-live="assertive">
      <span className="error-toast-icon" aria-hidden="true">
        !
      </span>
      <div className="error-toast-content">
        <strong className="error-toast-title">
          {extraText(locale, "errors.title")}
        </strong>
        <span className="error-toast-message">{error.message}</span>
        <div className="error-toast-actions">
          <button className="error-toast-copy" onClick={onCopy}>
            {extraText(locale, "errors.copyDetails")}
          </button>
          <button
            className="error-toast-close"
            onClick={onDismiss}
            aria-label={t("accessibility.dismissError")}
            title={t("accessibility.dismissError")}
          >
            {t("accessibility.close")}
          </button>
        </div>
      </div>
    </div>
  );
}

function GameEditor({
  editor,
  busy,
  onClose,
  onSave,
}: {
  editor: EditorState;
  busy: boolean;
  onClose: () => void;
  onSave: (draft: GameDraft) => void;
}): JSX.Element {
  const t = useT();
  const locale = useLocale();
  const initial =
    editor.mode === "edit" ? draftFromGame(editor.game) : emptyDraft();
  const [draft, setDraft] = useState<GameDraft>(initial);
  const [validation, setValidation] = useState("");
  const needsReview =
    editor.mode === "edit" &&
    (editor.game.needsReview || editor.game.ratingMode === "mixed");

  function preservedRatingValues(): string {
    if (editor.mode !== "edit") return "";
    const conflict = editor.game.ratingConflict;
    const score = conflict?.rawScore ??
      (editor.game.score === null ? null : String(editor.game.score));
    const recommendation = conflict?.rawRecommendation ??
      (editor.game.recommendation ?? null);
    const values = [
      score === null ? null : `${t("forms.score")}: ${score}`,
      recommendation === null
        ? null
        : `${t("forms.verdict")}: ${recommendation}`,
    ].filter((value): value is string => value !== null);
    return values.length ? values.join(" / ") : t("labels.noScore");
  }

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    if (!draft.name.trim()) {
      setValidation(t("forms.validation.nameRequired"));
      return;
    }
    if (!draft.ratingMode) {
      setValidation(extraText(locale, "rating.chooseMode"));
      return;
    }

    if (
      draft.ratingMode === "semicolon-score" &&
      draft.score !== null &&
      (!Number.isInteger(draft.score) || draft.score < 0 || draft.score > 10)
    ) {
      setValidation(t("forms.validation.scoreRange"));
      return;
    }

    const canonicalRecommendation =
      draft.recommendation === null
        ? null
        : canonicalizeRecommendation(draft.recommendation);
    if (draft.ratingMode === "semicolon-recommendation" &&
        draft.recommendation !== null &&
        canonicalRecommendation === null) {
      setValidation(extraText(locale, "rating.chooseRecommendation"));
      return;
    }

    const score = draft.ratingMode === "semicolon-score" ? draft.score : null;
    const recommendation =
      draft.ratingMode === "semicolon-recommendation"
        ? canonicalRecommendation
        : null;
    onSave({
      ...draft,
      score,
      recommendation,
      year: draft.date ? Number(draft.date.slice(0, 4)) : draft.year,
    });
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="editor-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="editor-title"
      >
        <div className="modal-top">
          <div className="small-eyebrow">
            {editor.mode === "edit"
              ? t("modal.editor.editEyebrow")
              : t("modal.editor.newEyebrow")}
          </div>
          <button
            className="modal-close"
            onClick={onClose}
            aria-label={t("accessibility.close")}
            title={t("tooltips.close")}
            type="button"
          >
            x
          </button>
        </div>
        <h2 id="editor-title">
          {editor.mode === "edit"
            ? t("modal.editor.editTitle")
            : t("modal.editor.newTitle")}
        </h2>
        <p className="modal-copy">{t("modal.editor.copy")}</p>
        <form onSubmit={submit} className="editor-form">
          <label>
            {t("forms.gameName")}
            <input
              autoFocus
              required
              value={draft.name}
              onChange={(event) =>
                setDraft({ ...draft, name: event.target.value })
              }
              placeholder={t("forms.exampleGame")}
            />
          </label>
          <label>
            {extraText(locale, "rating.modeLabel")}
            <select
              required
              value={draft.ratingMode ?? ""}
              onChange={(event) => {
                const nextMode = event.target.value;
                setValidation("");
                setDraft({
                  ...draft,
                  ratingMode: isCanonicalRatingMode(nextMode)
                    ? nextMode
                    : undefined,
                });
              }}
            >
              <option value="">{extraText(locale, "rating.chooseMode")}</option>
              {ratingModeOptions.map((mode) => (
                <option key={mode} value={mode}>
                  {formatFormat(mode, t, locale)}
                </option>
              ))}
            </select>
          </label>
          {needsReview && (
            <div className="form-validation">
              <strong>{extraText(locale, "rating.reviewWarning")}</strong>
              <br />
              <span>
                {extraText(locale, "rating.sourceValues")}: {preservedRatingValues()}
              </span>
            </div>
          )}
          {draft.ratingMode && (
            <div className="modal-copy">
              {draft.ratingMode === "semicolon-score"
                ? extraText(locale, "rating.scoreHelp")
                : draft.ratingMode === "semicolon-recommendation"
                  ? extraText(locale, "rating.recommendationHelp")
                  : extraText(locale, "rating.legacyHelp")}
            </div>
          )}
          {draft.ratingMode === "semicolon-score" && (
            <label>
              {t("forms.score")}
              <input
                type="number"
                min="0"
                max="10"
                step="1"
                value={draft.score ?? ""}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    score:
                      event.target.value === ""
                        ? null
                        : Number(event.target.value),
                  })
                }
                placeholder={t("forms.scorePlaceholder")}
              />
            </label>
          )}
          <label>
            {t("forms.date")}
            <input
              type="date"
              required
              value={draft.date}
              onChange={(event) =>
                setDraft({ ...draft, date: event.target.value })
              }
            />
          </label>
          {draft.ratingMode === "semicolon-recommendation" && (
            <label>
              {t("forms.verdict")}
              <select
                value={canonicalizeRecommendation(draft.recommendation) ?? ""}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    recommendation: event.target.value || null,
                  })
                }
              >
                <option value="">
                  {extraText(locale, "rating.chooseRecommendation")}
                </option>
                {recommendationOptions.map((option) => (
                  <option key={option} value={option}>
                    {t(recommendationTranslationKey(option))}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            {t("forms.notes")}
            <textarea
              rows={4}
              value={draft.notes}
              onChange={(event) =>
                setDraft({ ...draft, notes: event.target.value })
              }
              placeholder={t("forms.notesPlaceholder")}
            />
          </label>
          {validation && <div className="form-validation">{validation}</div>}
          <div className="modal-actions">
            <button
              type="button"
              className="button button-ghost"
              onClick={onClose}
            >
              {t("buttons.cancel")}
            </button>
            <button
              type="submit"
              className="button button-primary"
              disabled={busy}
            >
              {busy ? t("status.saving") : t("buttons.saveEntry")} {" "}
              <span className="button-arrow">-&gt;</span>
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function ExportDialog({
  busy,
  gameCount,
  onClose,
  onExport,
}: {
  busy: boolean;
  gameCount: number;
  onClose: () => void;
  onExport: (format: ExportFormat) => Promise<void>;
}): JSX.Element {
  const t = useT();
  const [format, setFormat] = useState<ExportFormat>("semicolon-score");
  const options: Array<{ value: ExportFormat; label: string; copy: string }> = [
    {
      value: "legacy-2021",
      label: t("formats.legacy2021"),
      copy: t("formats.legacy2021Description"),
    },
    {
      value: "semicolon-score",
      label: t("formats.semicolonScore"),
      copy: t("formats.semicolonScoreDescription"),
    },
    {
      value: "semicolon-recommendation",
      label: t("formats.semicolonRecommendation"),
      copy: t("formats.semicolonRecommendationDescription"),
    },
  ];

  function submit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    void onExport(format);
  }

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="editor-modal export-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-title"
      >
        <div className="modal-top">
          <div className="small-eyebrow">{t("modal.export.eyebrow")}</div>
          <button
            className="modal-close"
            onClick={onClose}
            aria-label={t("accessibility.close")}
            title={t("tooltips.close")}
            type="button"
          >
            x
          </button>
        </div>
        <h2 id="export-title">{t("modal.export.title")}</h2>
        <p className="modal-copy">
          {t("modal.export.copy", { count: gameCount })}
        </p>
        <form onSubmit={submit} className="editor-form">
          <div className="export-options">
            {options.map((option) => (
              <label
                className={
                  format === option.value
                    ? "export-option selected"
                    : "export-option"
                }
                key={option.value}
              >
                <input
                  type="radio"
                  name="export-format"
                  value={option.value}
                  checked={format === option.value}
                  onChange={() => setFormat(option.value)}
                />
                <span className="export-radio" />
                <span>
                  <strong>{option.label}</strong>
                  <small>{option.copy}</small>
                </span>
              </label>
            ))}
          </div>
          <div className="modal-actions">
            <button
              type="button"
              className="button button-ghost"
              onClick={onClose}
            >
              {t("buttons.cancel")}
            </button>
            <button
              type="submit"
              className="button button-primary"
              disabled={busy}
            >
              {busy ? t("status.exporting") : t("buttons.chooseLocation")}
              <span className="button-arrow">-&gt;</span>
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
