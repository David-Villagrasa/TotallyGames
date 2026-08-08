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
  GameCover,
  GameDraft,
  GameEntry,
  GameStatusKey,
  ImportBatch,
  ImportFormat,
  ImportIssue,
  LibraryState,
  ParsedGame,
  PreservedRow,
  ReviewReason,
} from "../../domain/types";
import type { CoverSearchResult, TableMode } from "../../shared/api";
import { PLATFORM_LABELS, RAW_PLATFORM_EXTRA_KEY } from "../../domain/platform";
import type { Platform } from "../../domain/platform";
import {
  canonicalizeRecommendation,
  isValidScore,
  recommendationToScore,
  RECOMMENDATION_LABELS,
  scoreToRecommendation,
} from "../../domain/rating";
import { createFingerprint, normalizeText } from "../../domain/text";
import { createImportRowKey } from "../../domain/review";
import {
  createTranslator,
  DEFAULT_LOCALE,
  resolveLocale,
  SUPPORTED_LOCALES,
} from "./i18n";
import type { Locale, TranslationKey, Translator } from "./i18n";
import floppyIconUrl from "../../../assets/disco-flexible.png";
import { GuideView } from "./GuideView";

type View = "overview" | "library" | "import" | "guide";
type EditorState = { mode: "create" } | { mode: "edit"; game: GameEntry };
type FilterKey =
  | "all"
  | "name"
  | "year"
  | "date"
  | "platform"
  | "rating"
  | "completed"
  | "platinum"
  | "favorite"
  | "notes";
type SortKey = Exclude<FilterKey, "all">;
type SortDirection = "ascending" | "descending";
type SortState = { key: SortKey; direction: SortDirection } | null;
type RatingLike = Pick<
  GameEntry,
  | "name"
  | "year"
  | "date"
  | "score"
  | "recommendation"
  | "platform"
  | "notes"
  | GameStatusKey
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
  | "review.entryWarning"
  | "review.missingDate"
  | "review.invalidDate"
  | "review.missingYear"
  | "review.yearConflict"
  | "review.invalidScore"
  | "review.unknownRecommendation"
  | "review.unknownPlatform"
  | "review.mixedRating"
  | "review.ambiguousYear"
  | "review.unknownStatus"
  | "sort.ascending"
  | "sort.descending"
  | "sort.clear"
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
const platformOptions: readonly (Platform | null)[] = [null, ...PLATFORM_LABELS];
const ratingModeOptions: readonly CanonicalRatingMode[] = [
  "legacy-2021",
  "semicolon-score",
  "semicolon-recommendation",
];
const filterOptions: readonly FilterKey[] = [
  "all",
  "name",
  "year",
  "date",
  "platform",
  "rating",
  "completed",
  "platinum",
  "favorite",
  "notes",
];
const sortOptions: readonly SortKey[] = filterOptions.filter(
  (key): key is SortKey => key !== "all",
);

const extraCatalog: Record<Locale, Record<ExtraMessageKey, string>> = {
  es: {
    "settings.open": "Abrir ajustes",
    "settings.localFirstTitle": "Datos locales primero",
    "settings.resetDescription":
      "Borra la biblioteca interna y los ajustes. Los TXT originales y los logs no se tocan.",
    "settings.resetTitle": "¿Restablecer datos internos?",
    "settings.resetCopy":
      "Se borrarán tus entradas guardadas y los ajustes de idioma. Los archivos TXT originales y los registros permanecerán intactos.",
    "settings.resetSuccess":
      "Datos internos restablecidos. Los TXT originales y los registros no se han tocado.",
    "rating.modeLabel": "Modo de puntuación",
    "rating.chooseMode": "Elige un modo de puntuación antes de guardar.",
    "rating.reviewWarning":
      "Este registro contiene valores de puntuación que requieren revisión. Elige un modo canónico y guarda para resolverlos. Los valores de origen se conservan hasta entonces.",
    "rating.sourceValues": "Valores de origen conservados",
    "rating.chooseRecommendation": "Elige una recomendación canónica",
    "rating.scoreHelp": "Se guardará una puntuación de 0 a 10 con hasta dos decimales.",
    "rating.recommendationHelp": "Solo se guardará una recomendación canónica.",
    "rating.legacyHelp": "Este modo no guarda puntuación ni recomendación.",
    "rating.mixedFormat": "Formato con puntuaciones mezcladas",
    "review.entryWarning":
      "Esta entrada necesita revisión. Corrige los campos pendientes y guarda para quitar el aviso.",
    "review.missingDate": "Falta una fecha válida.",
    "review.invalidDate": "La fecha original no se pudo interpretar.",
    "review.missingYear": "No se pudo asociar un año a la fecha.",
    "review.yearConflict": "La fecha y el año del archivo no coinciden.",
    "review.invalidScore": "La puntuación original no es válida.",
    "review.unknownRecommendation": "La recomendación original no se reconoce.",
    "review.unknownPlatform": "La plataforma original no se reconoce.",
    "review.mixedRating": "Hay valores de puntuación en conflicto.",
    "review.ambiguousYear": "El año de la entrada necesita confirmación.",
    "review.unknownStatus": "El estado original no se reconoce.",
    "sort.ascending": "ascendente",
    "sort.descending": "descendente",
    "sort.clear": "quitar ordenación",
    "sort.activate": "Ordenar por {column}. Dirección actual: {direction}.",
    "errors.title": "Error de operación",
    "errors.copyDetails": "Copiar detalles",
    "errors.copied": "Detalles copiados.",
    "errors.clipboardUnavailable": "El portapapeles no está disponible.",
    "confirm.deleteConsequence":
      "Solo se eliminara la entrada interna. El TXT original no se tocara.",
    "preserved.title": "Filas conservadas",
    "preserved.line": "Línea",
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
    "rating.scoreHelp": "A score from 0 to 10 with up to two decimals will be saved.",
    "rating.recommendationHelp": "Only a canonical recommendation will be saved.",
    "rating.legacyHelp": "This mode stores neither a score nor a recommendation.",
    "rating.mixedFormat": "Mixed rating format",
    "review.entryWarning":
      "This entry needs review. Correct the pending fields and save to remove the warning.",
    "review.missingDate": "A valid date is missing.",
    "review.invalidDate": "The original date could not be interpreted.",
    "review.missingYear": "The date could not be associated with a year.",
    "review.yearConflict": "The date and file year do not match.",
    "review.invalidScore": "The original score is not valid.",
    "review.unknownRecommendation": "The original recommendation is not recognized.",
    "review.unknownPlatform": "The original platform is not recognized.",
    "review.mixedRating": "The rating values conflict.",
    "review.ambiguousYear": "The entry year needs confirmation.",
    "review.unknownStatus": "The original status is not recognized.",
    "sort.ascending": "ascending",
    "sort.descending": "descending",
    "sort.clear": "clear sorting",
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
    "rating.scoreHelp": "0から10まで、小数点以下2桁までのスコアを保存します。",
    "rating.recommendationHelp": "正規の評価だけを保存します。",
    "rating.legacyHelp": "このモードではスコアも評価も保存しません。",
    "rating.mixedFormat": "混在した評価形式",
    "review.entryWarning":
      "このエントリーは確認が必要です。未入力の項目を修正して保存すると警告が消えます。",
    "review.missingDate": "有効な日付がありません。",
    "review.invalidDate": "元の日付を解釈できませんでした。",
    "review.missingYear": "日付に年を関連付けられませんでした。",
    "review.yearConflict": "日付とファイルの年が一致しません。",
    "review.invalidScore": "元のスコアは無効です。",
    "review.unknownRecommendation": "元の評価を認識できません。",
    "review.unknownPlatform": "元のプラットフォームを認識できません。",
    "review.mixedRating": "評価値が競合しています。",
    "review.ambiguousYear": "エントリーの年を確認してください。",
    "review.unknownStatus": "元の状態を認識できません。",
    "sort.ascending": "昇順",
    "sort.descending": "降順",
    "sort.clear": "並べ替えを解除",
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
  "missing-date": "importIssues.missing-date",
  "missing-required-field": "importIssues.missing-required-field",
  "invalid-score": "importIssues.invalid-score",
  "unknown-recommendation": "importIssues.unknown-recommendation",
  "unknown-platform": "importIssues.unknown-platform",
  "mixed-rating-fields": "importIssues.mixed-rating-fields",
  "ambiguous-year": "importIssues.ambiguous-year",
  "unknown-format": "importIssues.unknown-format",
  "read-error": "importIssues.read-error",
  "encoding-replacement": "importIssues.encoding-replacement",
  "mixed-rating-batch": "importIssues.mixed-rating-batch",
  "summary-row": "importIssues.summary-row",
  "unknown-status": "importIssues.unknown-status",
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

function filterFieldLabel(key: FilterKey, t: Translator): string {
  if (key === "all") return t("filters.allFields");
  if (key === "name") return t("forms.gameName");
  if (key === "year") return t("filters.year");
  if (key === "date") return t("forms.date");
  if (key === "platform") return t("forms.platform");
  if (key === "rating") return t("filters.rating");
  if (key === "completed") return t("status.completed");
  if (key === "platinum") return t("status.platinum");
  if (key === "favorite") return t("status.favorite");
  return t("forms.notes");
}

function filterStatusValue(value: boolean): string {
  return value ? "true" : "false";
}

function matchesFilter(
  game: GameEntry,
  key: FilterKey,
  value: string,
  t: Translator,
): boolean {
  if (key === "all" || !value.trim()) return true;
  if (key === "year") return String(game.year ?? "") === value;
  if (key === "date") return game.date === value;
  if (key === "rating") {
    return (ratingBucket(game) ?? "none") === value;
  }
  if (key === "completed" || key === "platinum" || key === "favorite") {
    return filterStatusValue(game[key]) === value;
  }

  const normalizedValue = normalizeText(value);
  const fieldValue =
    key === "name"
      ? game.name
      : key === "platform"
        ? storedPlatformLabel(game, t)
        : game.notes;
  return normalizeText(fieldValue).includes(normalizedValue);
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
  if (format === "semicolon-recommendation-platform") {
    return t("formats.semicolonRecommendationPlatform");
  }
  if (format === "semicolon-mixed") return extraText(locale, "rating.mixedFormat");
  if (format === "neo-xlsx") return t("formats.neoXlsx");
  if (format === "neo-csv") return t("formats.neoCsv");
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
  const bucket = ratingBucket(game);
  if (bucket === "No Recomendado") return "score score-not-recommended";
  if (bucket === "Poco Recomendado") return "score score-low";
  if (bucket === "Recomendado") return "score score-mid";
  if (bucket === "Muy Recomendado") return "score score-high";
  return "score score-neutral";
}

function reviewReasonLabel(reason: ReviewReason, locale: Locale): string {
  const keys: Record<ReviewReason, ExtraMessageKey> = {
    "missing-date": "review.missingDate",
    "invalid-date": "review.invalidDate",
    "missing-year": "review.missingYear",
    "year-conflict": "review.yearConflict",
    "invalid-score": "review.invalidScore",
    "unknown-recommendation": "review.unknownRecommendation",
    "unknown-platform": "review.unknownPlatform",
    "mixed-rating-fields": "review.mixedRating",
    "ambiguous-year": "review.ambiguousYear",
    "unknown-status": "review.unknownStatus",
  };
  return extraText(locale, keys[reason]);
}

function reviewDescription(
  game: Pick<GameEntry, "reviewReasons">,
  locale: Locale,
): string {
  const reasons = game.reviewReasons?.map((reason) =>
    reviewReasonLabel(reason, locale),
  );
  return reasons?.length
    ? `${extraText(locale, "review.entryWarning")} ${reasons.join(" ")}`
    : extraText(locale, "review.entryWarning");
}

function platformLabel(platform: Platform | null, t: Translator): string {
  return platform ?? t("forms.noPlatform");
}

function platformClass(platform: Platform | null): string {
  if (platform === "Nintendo Switch") return "platform-switch";
  if (platform === "Play Station") return "platform-playstation";
  if (platform === "PC - Steam") return "platform-steam";
  if (platform === "PC - Emulated") return "platform-emulated";
  if (platform === "Xbox") return "platform-xbox";
  return "platform-none";
}

function platformGlyph(platform: Platform | null): string {
  if (platform === "Nintendo Switch") return "NS";
  if (platform === "Play Station") return "PS";
  if (platform === "PC - Steam") return "S";
  if (platform === "PC - Emulated") return "E";
  if (platform === "Xbox") return "X";
  return "--";
}

function storedPlatformLabel(
  game: Pick<GameEntry, "platform" | "extra">,
  t: Translator,
): string {
  return (
    game.platform ??
    game.extra[RAW_PLATFORM_EXTRA_KEY] ??
    t("forms.noPlatform")
  );
}

function PlatformIcon({
  platform,
  label: labelOverride,
}: {
  platform: Platform | null;
  label?: string;
}): JSX.Element {
  const t = useT();
  const label = labelOverride ?? platformLabel(platform, t);
  return (
    <span
      className={`platform-icon ${platformClass(platform)}`}
      role="img"
      aria-label={t("accessibility.platform", { platform: label })}
      title={label}
    >
      <span className="platform-icon-mark" aria-hidden="true">
        {platformGlyph(platform)}
      </span>
      <span className="platform-icon-text" aria-hidden="true">
        {label}
      </span>
    </span>
  );
}

const coverDataUrlCache = new Map<string, string>();
const coverPreviewDataUrlCache = new Map<string, string>();

function CoverImage({
  cover,
  remoteUrl,
  remoteResult,
  alt,
  className,
}: {
  cover?: GameCover | null;
  remoteUrl?: string;
  remoteResult?: CoverSearchResult;
  alt: string;
  className?: string;
}): JSX.Element {
  const [source, setSource] = useState<string | null>(() => {
    if (remoteResult) {
      return coverPreviewDataUrlCache.get(remoteResult.imageUrl) ?? null;
    }
    if (remoteUrl) return remoteUrl;
    return cover?.key ? coverDataUrlCache.get(cover.key) ?? null : null;
  });
  const [failedSource, setFailedSource] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (remoteResult) {
      const cached = coverPreviewDataUrlCache.get(remoteResult.imageUrl);
      setFailedSource(null);
      if (cached) {
        setSource(cached);
        return () => {
          active = false;
        };
      }
      setSource(null);
      void window.dgt
        .readCoverPreview(remoteResult)
        .then((dataUrl) => {
          if (!active) return;
          if (dataUrl) coverPreviewDataUrlCache.set(remoteResult.imageUrl, dataUrl);
          setSource(dataUrl);
        })
        .catch(() => {
          if (active) setSource(null);
        });
      return () => {
        active = false;
      };
    }
    if (remoteUrl) {
      setSource(remoteUrl);
      setFailedSource(null);
      return () => {
        active = false;
      };
    }
    if (!cover?.key) {
      setSource(null);
      setFailedSource(null);
      return () => {
        active = false;
      };
    }
    const cached = coverDataUrlCache.get(cover.key);
    if (cached) {
      setSource(cached);
      setFailedSource(null);
      return () => {
        active = false;
      };
    }
    void window.dgt
      .readCover(cover.key)
      .then((dataUrl) => {
        if (!active) return;
        if (dataUrl) coverDataUrlCache.set(cover.key, dataUrl);
        setSource(dataUrl);
        setFailedSource(null);
      })
      .catch(() => {
        if (active) {
          setSource(null);
          setFailedSource(null);
        }
      });
    return () => {
      active = false;
    };
  }, [cover?.key, remoteResult?.imageUrl, remoteUrl]);

  const visibleSource = source && source !== failedSource ? source : null;
  const remoteSource = remoteResult?.imageUrl ?? remoteUrl;
  return visibleSource ? (
    <img
      className={className}
      src={visibleSource}
      alt={alt}
      loading={remoteSource ? "eager" : "lazy"}
      decoding="async"
      onError={() => {
        setFailedSource(visibleSource);
        if (remoteSource) {
          void window.dgt
            .reportRendererError({
              operation: "cover:preview:load",
              message: `No se pudo cargar la vista previa remota: ${remoteSource}`,
            })
            .catch(() => undefined);
        }
      }}
    />
  ) : (
    <span className={`cover-image-fallback${className ? ` ${className}` : ""}`}>
      {alt}
    </span>
  );
}

function CoverThumbnail({
  cover,
  alt,
}: {
  cover: GameCover | null | undefined;
  alt: string;
}): JSX.Element {
  return (
    <span className="game-cover-thumb">
      {cover ? (
        <CoverImage cover={cover} alt={alt} />
      ) : (
        <span className="cover-image-fallback" aria-hidden="true">
          +
        </span>
      )}
    </span>
  );
}

function PlatformPicker({
  value,
  onChange,
}: {
  value: Platform | null;
  onChange: (platform: Platform | null) => void;
}): JSX.Element {
  const t = useT();
  return (
    <fieldset className="platform-picker">
      <legend>{t("forms.platform")}</legend>
      <div className="platform-picker-options">
        {platformOptions.map((platform) => {
          const label = platformLabel(platform, t);
          const selected = value === platform;
          return (
            <label
              className={
                selected
                  ? "platform-picker-option selected"
                  : "platform-picker-option"
              }
              key={platform ?? "none"}
            >
              <input
                type="radio"
                name="game-platform"
                value={platform ?? ""}
                checked={selected}
                aria-label={t("accessibility.platform", { platform: label })}
                onChange={() => onChange(platform)}
              />
              <PlatformIcon platform={platform} />
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function draftFromGame(game: GameEntry): GameDraft {
  return {
    name: game.name,
    date: game.date,
    score: game.score,
    recommendation: game.recommendation,
    platform: game.platform,
    cover: game.cover,
    notes: game.notes,
    year: game.year,
    completed: game.completed,
    platinum: game.platinum,
    favorite: game.favorite,
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
    platform: null,
    cover: null,
    notes: "",
    year: null,
    completed: false,
    platinum: false,
    favorite: false,
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
  if (key === "year") {
    const leftYear = left.year;
    const rightYear = right.year;
    if (leftYear === null || rightYear === null) {
      if (leftYear === rightYear) return 0;
      return leftYear === null ? 1 : -1;
    }
    return leftYear - rightYear;
  }

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

  if (key === "completed" || key === "platinum" || key === "favorite") {
    return Number(left[key]) - Number(right[key]);
  }

  const leftValue = normalizeText(
    key === "name" ? left.name : key === "platform" ? left.platform ?? "" : left.notes,
  );
  const rightValue = normalizeText(
    key === "name"
      ? right.name
      : key === "platform"
        ? right.platform ?? ""
        : right.notes,
  );
  return leftValue.localeCompare(rightValue);
}

function stableSortGames<T extends RatingLike>(games: readonly T[], sort: SortState): T[] {
  if (!sort) return [...games];
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
      if (sort.key === "year" &&
          (left.game.year === null || right.game.year === null)) {
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
  if (key === "year") return t("filters.year");
  if (key === "date") return t("grid.date");
  if (key === "rating") return t("grid.scoreVerdict");
  if (key === "platform") return t("grid.platform");
  if (key === "completed") return t("status.completed");
  if (key === "platinum") return t("status.platinum");
  if (key === "favorite") return t("status.favorite");
  return t("grid.notes");
}

function sortAria(
  sort: SortState,
  key: SortKey,
): "ascending" | "descending" | "none" {
  return sort?.key === key ? sort.direction : "none";
}

function sortButtonClass(sort: SortState, key: SortKey): string {
  if (!sort || sort.key !== key) return "sortable-button";
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
  const [filterKey, setFilterKey] = useState<FilterKey>("all");
  const [filterValue, setFilterValue] = useState("");
  const [batch, setBatch] = useState<ImportBatch | null>(null);
  const [allowDuplicates, setAllowDuplicates] = useState(false);
  const [autoCoverImport, setAutoCoverImport] = useState(false);
  const [selectedReviewRows, setSelectedReviewRows] = useState<Set<string>>(
    new Set(),
  );
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [showExport, setShowExport] = useState(false);
  const [dakosMode, setDakosMode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<RendererError | null>(null);
  const [toast, setToast] = useState("");
  const [locale, setLocale] = useState<Locale>(DEFAULT_LOCALE);
  const [platformColumnEnabled, setPlatformColumnEnabled] = useState(false);
  const [theGamesDbApiKey, setTheGamesDbApiKey] = useState("");
  const [tableMode, setTableMode] = useState<TableMode>("legacy");
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
      setPlatformColumnEnabled(
        settingsResult.status === "fulfilled"
          ? settingsResult.value.platformColumnEnabled
          : false,
      );
      setTheGamesDbApiKey(
        settingsResult.status === "fulfilled"
          ? settingsResult.value.theGamesDbApiKey
          : "",
      );
      setTableMode(
        settingsResult.status === "fulfilled"
          ? settingsResult.value.tableMode
          : "legacy",
      );
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
    .filter((game) => matchesFilter(game, filterKey, filterValue, t))
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
        setAllowDuplicates(false);
        setAutoCoverImport(false);
        setSelectedReviewRows(new Set());
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
      const result = await window.dgt.commitImport(
        batch.id,
        allowDuplicates,
        autoCoverImport,
        [...selectedReviewRows],
      );
      setState(result.state);
      setBatch(null);
      setAllowDuplicates(false);
      setAutoCoverImport(false);
      setSelectedReviewRows(new Set());
      navigate("library");
      const importToast = result.coverImport.enabled
        ? result.skippedDuplicates
          ? t("toasts.importedWithDuplicatesAndCovers", {
              count: result.imported,
              duplicates: result.skippedDuplicates,
              searched: result.coverImport.searched,
              covers: result.coverImport.assigned,
              missing: result.coverImport.notFound,
              errors: result.coverImport.failed,
            })
          : t("toasts.importedWithCovers", {
              count: result.imported,
              searched: result.coverImport.searched,
              covers: result.coverImport.assigned,
              missing: result.coverImport.notFound,
              errors: result.coverImport.failed,
            })
        : result.skippedDuplicates
          ? t("toasts.importedWithDuplicates", {
              count: result.imported,
              duplicates: result.skippedDuplicates,
            })
          : t("toasts.imported", { count: result.imported });
      setToast(
        `${importToast}${
          result.skippedReview
            ? ` ${t("toasts.reviewSkipped", { count: result.skippedReview })}`
            : ""
        }`,
      );
    } catch (reason: unknown) {
      reportFailure("import:commit", reason, t("errors.confirmImport"));
    } finally {
      setBusy(false);
    }
  }

  function cancelImport(): void {
    setError(null);
    setBatch(null);
    setAllowDuplicates(false);
    setAutoCoverImport(false);
    setSelectedReviewRows(new Set());
    navigate("library");
  }

  function selectAllReviewRows(): void {
    if (!batch) return;
    setSelectedReviewRows(
      new Set(
        batch.files
          .flatMap((file) => file.rows)
          .filter((row) => row.needsReview)
          .map((row) => createImportRowKey(row.source)),
      ),
    );
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
      const draftToSave = platformColumnEnabled
        ? draft
        : { ...draft, platform: undefined };
      const next =
        editor?.mode === "edit"
          ? await window.dgt.updateGame(editor.game.id, draftToSave)
          : await window.dgt.createGame(draftToSave);
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

  async function toggleGameStatus(
    id: string,
    status: GameStatusKey,
    value: boolean,
  ): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      setState(await window.dgt.updateGameStatus(id, status, value));
    } catch (reason: unknown) {
      reportFailure("game:update-status", reason, t("errors.saveGame"));
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
        schemaVersion: 4,
        locale: nextLocale,
        platformColumnEnabled,
        theGamesDbApiKey,
        tableMode,
      });
      setLocale(resolveLocale(saved.locale));
      setPlatformColumnEnabled(saved.platformColumnEnabled);
    } catch (reason: unknown) {
      setLocale(previousLocale);
      reportFailure("settings:save", reason, t("errors.unexpected"));
    } finally {
      setSettingsBusy(false);
      setBusy(false);
    }
  }

  async function changePlatformColumn(nextEnabled: boolean): Promise<void> {
    const previousValue = platformColumnEnabled;
    setSettingsBusy(true);
    setBusy(true);
    setError(null);
    try {
      const saved = await window.dgt.saveSettings({
        schemaVersion: 4,
        locale,
        platformColumnEnabled: nextEnabled,
        theGamesDbApiKey,
        tableMode,
      });
      setPlatformColumnEnabled(saved.platformColumnEnabled);
      setLocale(resolveLocale(saved.locale));
    } catch (reason: unknown) {
      setPlatformColumnEnabled(previousValue);
      reportFailure("settings:save", reason, t("errors.unexpected"));
    } finally {
      setSettingsBusy(false);
      setBusy(false);
    }
  }

  async function saveTheGamesDbApiKey(nextKey: string): Promise<void> {
    const previousValue = theGamesDbApiKey;
    const normalized = nextKey.trim();
    setTheGamesDbApiKey(normalized);
    setSettingsBusy(true);
    setBusy(true);
    setError(null);
    try {
      const saved = await window.dgt.saveSettings({
        schemaVersion: 4,
        locale,
        platformColumnEnabled,
        theGamesDbApiKey: normalized,
        tableMode,
      });
      setTheGamesDbApiKey(saved.theGamesDbApiKey);
    } catch (reason: unknown) {
      setTheGamesDbApiKey(previousValue);
      reportFailure("settings:save-thegamesdb-key", reason, t("errors.unexpected"));
    } finally {
      setSettingsBusy(false);
      setBusy(false);
    }
  }

  async function changeTableMode(nextMode: TableMode): Promise<void> {
    const previousValue = tableMode;
    setTableMode(nextMode);
    setSettingsBusy(true);
    setBusy(true);
    setError(null);
    try {
      const saved = await window.dgt.saveSettings({
        schemaVersion: 4,
        locale,
        platformColumnEnabled,
        theGamesDbApiKey,
        tableMode: nextMode,
      });
      setTableMode(saved.tableMode);
    } catch (reason: unknown) {
      setTableMode(previousValue);
      reportFailure("settings:save-table-mode", reason, t("errors.unexpected"));
    } finally {
      setSettingsBusy(false);
      setBusy(false);
    }
  }

  async function clearCoverSearchCache(): Promise<void> {
    setSettingsBusy(true);
    setBusy(true);
    setError(null);
    try {
      await window.dgt.clearCoverSearchCache();
      setToast(t("settings.coverCacheCleared"));
    } catch (reason: unknown) {
      reportFailure("cover:cache:clear", reason, t("errors.unexpected"));
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
      setState({ schemaVersion: 5, games: [], imports: [] });
      setBatch(null);
      setAllowDuplicates(false);
      setAutoCoverImport(false);
      setSelectedReviewRows(new Set());
      setEditor(null);
      setShowExport(false);
      setQuery("");
      setFilterKey("all");
      setFilterValue("");
      setLocale(resolveLocale(result.settings.locale));
      setPlatformColumnEnabled(result.settings.platformColumnEnabled);
      setTheGamesDbApiKey(result.settings.theGamesDbApiKey);
      setTableMode(result.settings.tableMode);
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
        platformColumnEnabled={platformColumnEnabled}
        theGamesDbApiKey={theGamesDbApiKey}
        tableMode={tableMode}
        busy={settingsBusy}
        onClose={() => setSettingsOpen(false)}
        onLocaleChange={(nextLocale) => void changeLocale(nextLocale)}
        onPlatformColumnChange={(nextEnabled) =>
          void changePlatformColumn(nextEnabled)
        }
        onTableModeChange={(nextMode) => void changeTableMode(nextMode)}
        onTheGamesDbApiKeySave={(nextKey) => void saveTheGamesDbApiKey(nextKey)}
        onClearCoverCache={() => void clearCoverSearchCache()}
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
            filterKey={filterKey}
            filterValue={filterValue}
            onFilterKeyChange={(nextKey) => {
              setFilterKey(nextKey);
              setFilterValue("");
            }}
            onFilterValueChange={setFilterValue}
            platformColumnEnabled={platformColumnEnabled}
            tableMode={tableMode}
            busy={busy}
            onStatusChange={(id, status, value) =>
              void toggleGameStatus(id, status, value)
            }
            onEdit={(game) => setEditor({ mode: "edit", game })}
            onDelete={deleteGame}
            onAdd={() => setEditor({ mode: "create" })}
          />
        )}
        {view === "import" && (
          <ImportView
            batch={batch}
            platformColumnEnabled={platformColumnEnabled}
            tableMode={tableMode}
            allowDuplicates={allowDuplicates}
            autoCoverImport={autoCoverImport}
            selectedReviewRows={selectedReviewRows}
            busy={busy}
            onAllowDuplicates={setAllowDuplicates}
            onAutoCoverImport={setAutoCoverImport}
            onReviewRowChange={(key, selected) =>
              setSelectedReviewRows((current) => {
                const next = new Set(current);
                if (selected) next.add(key);
                else next.delete(key);
                return next;
              })
            }
            onSelectAllReviewRows={selectAllReviewRows}
            onClearReviewRows={() => setSelectedReviewRows(new Set())}
            onChooseFiles={() =>
              void importWith(() => window.dgt.selectImportFiles())
            }
            onChooseFolder={() =>
              void importWith(() => window.dgt.selectImportFolder())
            }
            onCommit={() => void commitImport()}
            onCancel={cancelImport}
          />
        )}
        {view === "guide" && <GuideView t={t} />}
      </main>
      {editor && (
        <GameEditor
          key={editor.mode === "edit" ? editor.game.id : "create"}
          editor={editor}
          platformColumnEnabled={platformColumnEnabled}
          tableMode={tableMode}
          busy={busy}
          onClose={() => setEditor(null)}
          onSave={saveGame}
          onFailure={(reason) =>
            reportFailure("cover:search", reason, t("errors.coverSearch"))
          }
        />
      )}
      {showExport && (
        <ExportDialog
          busy={busy}
          gameCount={games.length}
          platformColumnEnabled={platformColumnEnabled}
          tableMode={tableMode}
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
  platformColumnEnabled,
  theGamesDbApiKey,
  tableMode,
  busy,
  onClose,
  onLocaleChange,
  onPlatformColumnChange,
  onTableModeChange,
  onTheGamesDbApiKeySave,
  onClearCoverCache,
  onReset,
}: {
  open: boolean;
  locale: Locale;
  platformColumnEnabled: boolean;
  theGamesDbApiKey: string;
  tableMode: TableMode;
  busy: boolean;
  onClose: () => void;
  onLocaleChange: (locale: Locale) => void;
  onPlatformColumnChange: (enabled: boolean) => void;
  onTableModeChange: (mode: TableMode) => void;
  onTheGamesDbApiKeySave: (apiKey: string) => void;
  onClearCoverCache: () => void;
  onReset: () => void;
}): JSX.Element {
  const t = useT();
  const [apiKeyDraft, setApiKeyDraft] = useState(theGamesDbApiKey);

  useEffect(() => {
    if (open) setApiKeyDraft(theGamesDbApiKey);
  }, [open, theGamesDbApiKey]);

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
          ×
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
        <span className="settings-panel-label">{t("settings.tableMode")}</span>
        <div className="settings-panel-row">
          <span>{t("settings.tableModeDescription")}</span>
          <select
            className="settings-panel-control"
            value={tableMode}
            disabled={busy}
            onChange={(event) => {
              if (event.target.value === "legacy" || event.target.value === "neo") {
                onTableModeChange(event.target.value);
              }
            }}
            aria-label={t("settings.tableMode")}
          >
            <option value="legacy">{t("settings.legacyMode")}</option>
            <option value="neo">{t("settings.neoMode")}</option>
          </select>
        </div>
      </div>
      <div className="settings-panel-section">
        <span className="settings-panel-label">
          {t("settings.platformColumn")}
        </span>
        <div className="settings-panel-row settings-panel-toggle-row">
          <div className="settings-panel-toggle-copy">
            <strong>{t("settings.platformColumn")}</strong>
            <span>{t("settings.platformColumnDescription")}</span>
          </div>
          <button
            className="settings-panel-toggle"
            type="button"
            aria-pressed={platformColumnEnabled}
            aria-label={t("settings.platformColumn")}
            title={t("settings.platformColumn")}
            disabled={busy}
            onClick={() => onPlatformColumnChange(!platformColumnEnabled)}
          />
        </div>
      </div>
      <div className="settings-panel-section">
        <label className="settings-api-key">
          <span className="settings-panel-label">
            {t("settings.theGamesDbApiKey")}
          </span>
          <input
            type="password"
            autoComplete="off"
            value={apiKeyDraft}
            placeholder={t("settings.theGamesDbApiKeyPlaceholder")}
            disabled={busy}
            onChange={(event) => setApiKeyDraft(event.target.value)}
            onBlur={() => onTheGamesDbApiKeySave(apiKeyDraft)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onTheGamesDbApiKeySave(apiKeyDraft);
              }
            }}
            aria-label={t("settings.theGamesDbApiKey")}
          />
          <span>{t("settings.theGamesDbApiKeyDescription")}</span>
        </label>
      </div>
      <div className="settings-panel-section">
        <span className="settings-panel-label">{t("settings.coverCache")}</span>
        <p className="settings-panel-copy">
          {t("settings.coverCacheDescription")}
        </p>
        <button
          className="button button-ghost button-small settings-clear-cache"
          type="button"
          onClick={onClearCoverCache}
          disabled={busy}
        >
          {t("settings.clearCoverCache")}
        </button>
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
        <img
          className="brand-glyph floppy-image"
          src={floppyIconUrl}
          alt={t("accessibility.floppyDisk")}
        />
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
        <button
          className={view === "guide" ? "nav-item active" : "nav-item"}
          onClick={() => onNavigate("guide")}
          title={t("navigation.guide")}
        >
          <span className="nav-dot" /> {t("navigation.guide")}
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
    !sort || sort.key !== column
      ? "ascending"
      : sort.direction === "ascending"
        ? "descending"
        : "clear";
  const nextDirectionLabel =
    nextDirection === "ascending"
      ? extraText(locale, "sort.ascending")
      : nextDirection === "descending"
        ? extraText(locale, "sort.descending")
        : extraText(locale, "sort.clear");
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
  filterKey,
  filterValue,
  platformColumnEnabled,
  tableMode,
  busy,
  onFilterKeyChange,
  onFilterValueChange,
  onStatusChange,
  onEdit,
  onDelete,
  onAdd,
}: {
  games: GameEntry[];
  allGames: GameEntry[];
  years: number[];
  filterKey: FilterKey;
  filterValue: string;
  platformColumnEnabled: boolean;
  tableMode: TableMode;
  busy: boolean;
  onFilterKeyChange: (value: FilterKey) => void;
  onFilterValueChange: (value: string) => void;
  onStatusChange: (id: string, status: GameStatusKey, value: boolean) => void;
  onEdit: (game: GameEntry) => void;
  onDelete: (game: GameEntry) => void;
  onAdd: () => void;
}): JSX.Element {
  const t = useT();
  const locale = useLocale();
  const [sort, setSort] = useState<SortState>(null);
  const sortedGames = stableSortGames(games, sort);

  const filterControl =
    filterKey === "year" ? (
      <select
        value={filterValue}
        onChange={(event) => onFilterValueChange(event.target.value)}
        aria-label={filterFieldLabel(filterKey, t)}
      >
        <option value="">{t("filters.anyValue")}</option>
        {years.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
    ) : filterKey === "rating" ? (
      <select
        value={filterValue}
        onChange={(event) => onFilterValueChange(event.target.value)}
        aria-label={filterFieldLabel(filterKey, t)}
      >
        <option value="">{t("filters.anyValue")}</option>
        {recommendationOptions.map((option) => (
          <option key={option} value={option}>
            {t(recommendationTranslationKey(option))}
          </option>
        ))}
        <option value="none">{t("forms.noVerdict")}</option>
      </select>
    ) : filterKey === "completed" ||
      filterKey === "platinum" ||
      filterKey === "favorite" ? (
      <select
        value={filterValue}
        onChange={(event) => onFilterValueChange(event.target.value)}
        aria-label={filterFieldLabel(filterKey, t)}
      >
        <option value="">{t("filters.anyValue")}</option>
        <option value="true">{t("filters.active")}</option>
        <option value="false">{t("filters.inactive")}</option>
      </select>
    ) : filterKey === "date" ? (
      <input
        type="date"
        value={filterValue}
        onChange={(event) => onFilterValueChange(event.target.value)}
        aria-label={filterFieldLabel(filterKey, t)}
      />
    ) : filterKey === "all" ? (
      <span className="filter-hint">{t("filters.chooseField")}</span>
    ) : (
      <input
        type="search"
        value={filterValue}
        onChange={(event) => onFilterValueChange(event.target.value)}
        placeholder={t("filters.value")}
        aria-label={filterFieldLabel(filterKey, t)}
      />
    );

  function onSort(column: SortKey): void {
    setSort((current) => {
      if (!current || current.key !== column) {
        return { key: column, direction: "ascending" };
      }
      if (current.direction === "ascending") {
        return { key: column, direction: "descending" };
      }
      return null;
    });
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
        <label className="filter-control">
          <span className="filter-control-label">{t("filters.field")}</span>
          <select
            value={filterKey}
            onChange={(event) => {
              const nextKey = event.target.value as FilterKey;
              if (filterOptions.includes(nextKey)) onFilterKeyChange(nextKey);
            }}
            aria-label={t("filters.field")}
          >
            {filterOptions.map((option) => (
              <option key={option} value={option}>
                {filterFieldLabel(option, t)}
              </option>
            ))}
          </select>
        </label>
        <label className="filter-control filter-value-control">
          <span className="filter-control-label">{t("filters.value")}</span>
          {filterControl}
        </label>
        <label className="filter-control filter-sort-control">
          <span className="filter-control-label">{t("filters.sortBy")}</span>
          <select
            value={sort?.key ?? "none"}
            onChange={(event) => {
              const nextKey = event.target.value;
              if (nextKey === "none") {
                setSort(null);
              } else if (sortOptions.includes(nextKey as SortKey)) {
                setSort({
                  key: nextKey as SortKey,
                  direction: sort?.direction ?? "ascending",
                });
              }
            }}
            aria-label={t("filters.sortBy")}
          >
            <option value="none">{t("filters.noSorting")}</option>
            {sortOptions.map((option) => (
              <option key={option} value={option}>
                {sortColumnLabel(option, t)}
              </option>
            ))}
          </select>
        </label>
        <label className="filter-control filter-direction-control">
          <span className="filter-control-label">{t("filters.direction")}</span>
          <select
            value={sort?.direction ?? "ascending"}
            disabled={!sort}
            onChange={(event) => {
              if (
                sort &&
                (event.target.value === "ascending" ||
                  event.target.value === "descending")
              ) {
                setSort({ ...sort, direction: event.target.value });
              }
            }}
            aria-label={t("filters.direction")}
          >
            <option value="ascending">{t("filters.ascending")}</option>
            <option value="descending">{t("filters.descending")}</option>
          </select>
        </label>
        <button
          className="filter-reset"
          onClick={() => {
            onFilterKeyChange("all");
            onFilterValueChange("");
            setSort(null);
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
      <div
        className={`library-list${platformColumnEnabled ? " library-list-platform" : ""}${tableMode === "neo" ? " library-list-neo" : ""} reveal reveal-three`}
      >
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
          {platformColumnEnabled && (
            <SortableColumn
              column="platform"
              label={t("grid.platform")}
              sort={sort}
              onSort={onSort}
            />
          )}
          <SortableColumn
            column="rating"
            label={t("grid.verdict")}
            sort={sort}
            onSort={onSort}
          />
          {tableMode === "neo" && (
            <SortableColumn
              column="completed"
              label={t("grid.status")}
              sort={sort}
              onSort={onSort}
            />
          )}
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
            platformColumnEnabled={platformColumnEnabled}
            tableMode={tableMode}
            busy={busy}
            onStatusChange={onStatusChange}
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
  platformColumnEnabled,
  tableMode,
  busy,
  onStatusChange,
  onEdit,
  onDelete,
}: {
  game: GameEntry;
  index: number;
  platformColumnEnabled: boolean;
  tableMode: TableMode;
  busy: boolean;
  onStatusChange: (id: string, status: GameStatusKey, value: boolean) => void;
  onEdit: (game: GameEntry) => void;
  onDelete: (game: GameEntry) => void;
}): JSX.Element {
  const t = useT();
  const locale = useLocale();
  return (
    <div
      className={game.needsReview ? "game-row game-row-review" : "game-row"}
      title={game.needsReview ? reviewDescription(game, locale) : undefined}
      style={
        { "--row-delay": `${Math.min(index, 12) * 35}ms` } as CSSProperties
      }
    >
      <button className="game-main" onClick={() => onEdit(game)}>
        <span className="row-index">{String(index + 1).padStart(2, "0")}</span>
        <CoverThumbnail cover={game.cover} alt={t("accessibility.cover", { name: game.name })} />
        <span>
          <strong>
            {game.name}
            {game.needsReview && (
              <span
                className="review-badge"
                aria-label={extraText(locale, "review.entryWarning")}
              >
                !
              </span>
            )}
          </strong>
          <small>{game.year ?? t("labels.noYear")}</small>
        </span>
      </button>
      <span className="game-date" data-label={t("grid.date")}>
        {formatDate(game.date, locale, t)}
      </span>
      {platformColumnEnabled && (
        <span
          className="platform-cell game-platform"
          data-label={t("grid.platform")}
        >
          <PlatformIcon
            platform={game.platform}
            label={storedPlatformLabel(game, t)}
          />
        </span>
      )}
      <span
        className={`game-rating ${scoreClass(game)}`}
        data-label={t("grid.verdict")}
      >
        {scoreLabel(game, t)}
      </span>
      {tableMode === "neo" && (
        <GameStatusControls
          game={game}
          busy={busy}
          onStatusChange={onStatusChange}
        />
      )}
      <span className="game-notes" data-label={t("grid.notes")}>
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

function GameStatusControls({
  game,
  busy,
  onStatusChange,
}: {
  game: GameEntry;
  busy: boolean;
  onStatusChange: (id: string, status: GameStatusKey, value: boolean) => void;
}): JSX.Element {
  const t = useT();
  const statuses: ReadonlyArray<{
    key: GameStatusKey;
    label: string;
    className: string;
  }> = [
    {
      key: "completed",
      label: t("status.completed"),
      className: "status-completed",
    },
    {
      key: "platinum",
      label: t("status.platinum"),
      className: "status-platinum",
    },
    {
      key: "favorite",
      label: t("status.favorite"),
      className: "status-favorite",
    },
  ];
  return (
    <div
      className="game-status-controls"
      aria-label={t("grid.status")}
      data-label={t("grid.status")}
    >
      {statuses.map((status) => {
        const active = game[status.key];
        return (
          <button
            className={`status-toggle ${status.className}${active ? " is-active" : ""}`}
            type="button"
            key={status.key}
            aria-pressed={active}
            disabled={busy}
            aria-label={t("accessibility.statusToggle", {
              status: status.label,
              name: game.name,
            })}
            title={`${status.label}: ${active ? "on" : "off"}`}
            onClick={() => onStatusChange(game.id, status.key, !active)}
          >
            <StatusGlyph status={status.key} />
          </button>
        );
      })}
    </div>
  );
}

function GameStatusSummary({
  game,
  className,
}: {
  game: Pick<GameEntry, GameStatusKey>;
  className?: string;
}): JSX.Element {
  const t = useT();
  const statuses: ReadonlyArray<{
    key: GameStatusKey;
    label: string;
    className: string;
  }> = [
    {
      key: "completed",
      label: t("status.completed"),
      className: "status-completed",
    },
    {
      key: "platinum",
      label: t("status.platinum"),
      className: "status-platinum",
    },
    {
      key: "favorite",
      label: t("status.favorite"),
      className: "status-favorite",
    },
  ];
  return (
    <span
      className={`game-status-summary${className ? ` ${className}` : ""}`}
      aria-label={t("grid.status")}
      data-label={t("grid.status")}
    >
      {statuses.map((status) => (
        <span
          className={`status-summary-mark ${status.className}${game[status.key] ? " is-active" : ""}`}
          key={status.key}
          title={status.label}
          aria-hidden="true"
        >
          <StatusGlyph status={status.key} />
        </span>
      ))}
    </span>
  );
}

function StatusGlyph({ status }: { status: GameStatusKey }): JSX.Element {
  if (status === "completed") return <span aria-hidden="true">✓</span>;
  if (status === "favorite") return <span aria-hidden="true">★</span>;
  return (
    <svg
      className="status-glyph"
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M7 3h10v3c0 3.2-1.8 5.7-5 6.7V16h4v2H8v-2h4v-3.3C8.8 11.7 7 9.2 7 6V3Zm-3 1h2v2c0 1.8.7 3.2 2 4.1C5.3 9.7 4 7.9 4 5V4Zm14 0h2v1c0 2.9-1.3 4.7-4 5.1 1.3-.9 2-2.3 2-4.1V4ZM9 20h6v1H9v-1Z" />
    </svg>
  );
}

function ImportView({
  batch,
  platformColumnEnabled,
  tableMode,
  allowDuplicates,
  autoCoverImport,
  selectedReviewRows,
  busy,
  onAllowDuplicates,
  onAutoCoverImport,
  onReviewRowChange,
  onSelectAllReviewRows,
  onClearReviewRows,
  onChooseFiles,
  onChooseFolder,
  onCommit,
  onCancel,
}: {
  batch: ImportBatch | null;
  platformColumnEnabled: boolean;
  tableMode: TableMode;
  allowDuplicates: boolean;
  autoCoverImport: boolean;
  selectedReviewRows: ReadonlySet<string>;
  busy: boolean;
  onAllowDuplicates: (value: boolean) => void;
  onAutoCoverImport: (value: boolean) => void;
  onReviewRowChange: (key: string, selected: boolean) => void;
  onSelectAllReviewRows: () => void;
  onClearReviewRows: () => void;
  onChooseFiles: () => void;
  onChooseFolder: () => void;
  onCommit: () => void;
  onCancel: () => void;
}): JSX.Element {
  const t = useT();
  const locale = useLocale();
  const rows = batch?.files.flatMap((file) => file.rows) ?? [];
  const reviewRows = rows.filter((row) => row.needsReview);
  const selectedReviewCount = reviewRows.filter((row) =>
    selectedReviewRows.has(createImportRowKey(row.source)),
  ).length;
  const rowsToImport = rows.length - reviewRows.length + selectedReviewCount;
  const [sort, setSort] = useState<SortState>(null);
  const sortedRows = stableSortGames<ParsedGame>(rows, sort);
  const preserved =
    batch?.files.reduce(
      (total, file) => total + file.preservedRows.length,
      0,
    ) ?? 0;
  const errors =
    batch?.files.reduce((total, file) => total + file.errors.length, 0) ?? 0;
  const seen = new Set<string>();
  let duplicateCount = 0;
  rows.forEach((row) => {
    const fingerprint = createFingerprint(row);
    if (seen.has(fingerprint)) duplicateCount += 1;
    seen.add(fingerprint);
  });

  function onSort(column: SortKey): void {
    setSort((current) => {
      if (!current || current.key !== column) {
        return { key: column, direction: "ascending" };
      }
      if (current.direction === "ascending") {
        return { key: column, direction: "descending" };
      }
      return null;
    });
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
            <span>TXT + NEO</span>
           </div>
           <div className="import-empty-copy">
            <h2>{t("headings.safeStepTitle")}</h2>
            <p>{t("copy.safeStep")}</p>
         </div>
         <div className="import-actions">
           <button className="button button-primary" onClick={onChooseFiles}>
              {t("buttons.chooseImportFiles")} {" "}
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
        <button className="text-button" type="button" onClick={onCancel}>
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
          label={t("labels.rowsToImport")}
          value={String(rowsToImport)}
          accent="blue"
        />
        <ImportSummary
          label={t("labels.reviewRows")}
          value={String(reviewRows.length)}
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
             <div className="empty-batch-mark" aria-hidden="true">!</div>
             <div>
               <h2>{t("empty.noImportFilesTitle")}</h2>
               <p>{t("empty.noImportFilesCopy")}</p>
             </div>
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
          <div
            className={
               `${platformColumnEnabled ? "preview-table preview-table-platform" : "preview-table"}${tableMode === "neo" ? " preview-table-neo" : ""}`
            }
          >
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
              {platformColumnEnabled && (
                <SortableColumn
                  column="platform"
                  label={t("grid.platform")}
                  sort={sort}
                  onSort={onSort}
                />
              )}
                <SortableColumn
                  column="rating"
                label={t("grid.scoreVerdict")}
                sort={sort}
                  onSort={onSort}
                />
                {tableMode === "neo" && (
                  <SortableColumn
                    column="completed"
                    label={t("grid.status")}
                    sort={sort}
                    onSort={onSort}
                  />
                )}
              <SortableColumn
                column="notes"
                label={t("grid.notes")}
                sort={sort}
                onSort={onSort}
              />
            </div>
            {sortedRows.slice(0, 8).map((row, index) => (
              <div
                className={row.needsReview ? "preview-row preview-row-review" : "preview-row"}
                key={`${row.source.filePath}-${row.source.line}-${index}`}
              >
                <strong
                  className="preview-game"
                  data-label={t("grid.game")}
                  title={row.needsReview ? reviewDescription(row, locale) : undefined}
                >
                  {row.name}
                  {row.needsReview && (
                    <span
                      className="review-badge"
                      aria-label={extraText(locale, "review.entryWarning")}
                    >
                      !
                    </span>
                  )}
                </strong>
                <span className="preview-date" data-label={t("grid.date")}>
                  {formatDate(row.date, locale, t)}
                </span>
                {platformColumnEnabled && (
                  <span
                    className="platform-cell preview-platform"
                    data-label={t("grid.platform")}
                  >
                    <PlatformIcon
                      platform={row.platform}
                      label={storedPlatformLabel(row, t)}
                    />
                  </span>
                )}
                <span
                  className={`preview-rating ${scoreClass(row)}`}
                  data-label={t("grid.scoreVerdict")}
                >
                  {scoreLabel(row, t)}
                </span>
                {tableMode === "neo" && (
                  <GameStatusSummary game={row} className="preview-status" />
                )}
                <span className="preview-notes" data-label={t("grid.notes")}>
                  {row.notes || t("forms.scorePlaceholder")}
                </span>
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
      {reviewRows.length > 0 && (
        <ReviewRowsSelector
          rows={reviewRows}
          selectedRows={selectedReviewRows}
          onChange={onReviewRowChange}
          onSelectAll={onSelectAllReviewRows}
          onClear={onClearReviewRows}
        />
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
          <label className="duplicate-toggle cover-import-toggle">
            <input
              type="checkbox"
              checked={autoCoverImport}
              onChange={(event) => onAutoCoverImport(event.target.checked)}
            />
            <span className="toggle-track">
              <span />
            </span>
            <span>{t("forms.autoCoverImport")}</span>
          </label>
          <p className="cover-import-description">
            {t("forms.autoCoverImportDescription")}
          </p>
        </div>
        <button
          type="button"
          className="button button-ghost"
          onClick={onCancel}
          disabled={busy}
        >
          {t("buttons.cancelPreview")}
        </button>
        <button
          type="button"
          className="button button-light"
          onClick={onCommit}
          disabled={busy || rowsToImport === 0}
        >
          {busy
            ? autoCoverImport
              ? t("status.searchingCovers")
              : t("status.saving")
            : t("buttons.confirmImport")} {" "}
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

function ReviewRowsSelector({
  rows,
  selectedRows,
  onChange,
  onSelectAll,
  onClear,
}: {
  rows: ParsedGame[];
  selectedRows: ReadonlySet<string>;
  onChange: (key: string, selected: boolean) => void;
  onSelectAll: () => void;
  onClear: () => void;
}): JSX.Element {
  const t = useT();
  const locale = useLocale();
  const selectedCount = rows.filter((row) =>
    selectedRows.has(createImportRowKey(row.source)),
  ).length;

  return (
    <section className="panel review-selection-panel reveal reveal-four">
      <div className="panel-heading review-selection-heading">
        <div>
          <div className="small-eyebrow">{t("headings.reviewRowsEyebrow")}</div>
          <h2>{t("headings.reviewRowsTitle")}</h2>
        </div>
        <div className="review-selection-actions">
          <button
            type="button"
            className="button button-ghost button-small"
            onClick={onSelectAll}
          >
            {t("buttons.selectAllReviewRows")}
          </button>
          <button
            type="button"
            className="button button-ghost button-small"
            onClick={onClear}
          >
            {t("buttons.clearReviewRows")}
          </button>
        </div>
      </div>
      <p className="review-selection-copy">{t("import.reviewRowsCopy")}</p>
      <p className="review-selection-count">
        {t("labels.selectedReviewRows", {
          selected: selectedCount,
          total: rows.length,
        })}
      </p>
      <div className="review-row-options">
        {rows.map((row) => {
          const key = createImportRowKey(row.source);
          const selected = selectedRows.has(key);
          return (
            <label
              className={
                selected
                  ? "review-row-option is-selected"
                  : "review-row-option"
              }
              key={key}
            >
              <input
                type="checkbox"
                checked={selected}
                onChange={(event) => onChange(key, event.target.checked)}
                aria-label={t("accessibility.selectReviewRow", {
                  name: row.name,
                })}
              />
              <span className="review-row-option-copy">
                <strong>{row.name}</strong>
                <small>
                  {formatDate(row.date, locale, t)} · {t("labels.line", {
                    line: row.source.line,
                  })}
                </small>
                <small>{reviewDescription(row, locale)}</small>
              </span>
            </label>
          );
        })}
      </div>
    </section>
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
         <span className="file-badge">
           {file.format === "neo-xlsx"
             ? "XLSX"
             : file.format === "neo-csv"
               ? "CSV"
               : "TXT"}
         </span>
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
          <b>
            {file.years && file.years.length > 1
              ? file.years.join(" / ")
              : file.year ?? t("labels.noYear")}
          </b>{" "}
          {t("labels.year")} / {yearSource}
        </span>
        <span>
          {t("labels.validRows", { count: file.rows.length })}
        </span>
        <span>
          {t("labels.reviewRows", {
            count: file.rows.filter((row) => row.needsReview).length,
          })}
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
type PreservedSortState = {
  key: PreservedSortKey;
  direction: SortDirection;
} | null;

function preservedKindLabel(kind: PreservedRow["kind"], locale: Locale): string {
  if (kind === "metadata") return extraText(locale, "preserved.metadata");
  if (kind === "unparsed") return extraText(locale, "preserved.unparsed");
  return extraText(locale, "preserved.rejected");
}

function PreservedRowsTable({ rows }: { rows: PreservedRow[] }): JSX.Element {
  const t = useT();
  const locale = useLocale();
  const [sort, setSort] = useState<PreservedSortState>(null);

  const sortedRows = (sort ? rows
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
    .map(({ row }) => row) : [...rows]);

  function onSort(key: PreservedSortKey): void {
    setSort((current) => {
      if (!current || current.key !== key) {
        return { key, direction: "ascending" };
      }
      if (current.direction === "ascending") {
        return { key, direction: "descending" };
      }
      return null;
    });
  }

  function column(key: PreservedSortKey, label: string): JSX.Element {
    const active = sort?.key === key;
    const direction = active && sort ? sort.direction : "none";
    const nextDirection =
      !sort || sort.key !== key
        ? "ascending"
        : sort.direction === "ascending"
          ? "descending"
          : "clear";
    const nextDirectionLabel =
      nextDirection === "ascending"
        ? extraText(locale, "sort.ascending")
        : nextDirection === "descending"
          ? extraText(locale, "sort.descending")
          : extraText(locale, "sort.clear");
    return (
      <div className="sortable-column" role="columnheader" aria-sort={direction}>
        <button
          className={
            active && sort
              ? `sortable-button is-active is-${sort.direction}`
              : "sortable-button"
          }
          type="button"
          onClick={() => onSort(key)}
          aria-label={extraText(locale, "sort.activate", {
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
            <span data-label={extraText(locale, "preserved.line")}>
              {row.line || "-"}
            </span>
            <span data-label={extraText(locale, "preserved.kind")}>
              {preservedKindLabel(row.kind, locale)}
            </span>
            <span data-label={extraText(locale, "preserved.raw")}>
              {row.raw || "-"}
            </span>
            <span data-label={extraText(locale, "preserved.reason")}>
              {row.reason}
            </span>
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

function CoverPicker({
  name,
  cover,
  onChange,
  onFailure,
}: {
  name: string;
  cover: GameCover | null;
  onChange: (cover: GameCover | null) => void;
  onFailure: (reason: unknown) => void;
}): JSX.Element {
  const t = useT();
  const [results, setResults] = useState<CoverSearchResult[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">(
    "idle",
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState("");
  const requestId = useRef(0);

  async function searchNow(value = name): Promise<void> {
    const query = value.trim();
    if (query.length < 2) {
      setResults([]);
      setStatus("idle");
      return;
    }
    const currentRequest = ++requestId.current;
    setStatus("loading");
    setError("");
    try {
      const found = await window.dgt.searchCovers(query);
      if (currentRequest !== requestId.current) return;
      setResults(found);
      setStatus("ready");
      if (found.length === 0) {
        void window.dgt
          .reportRendererError({
            operation: "cover:search:empty",
            message: `HowLongToBeat no devolvio candidatas para "${query}".`,
          })
          .catch(() => undefined);
      }
    } catch {
      if (currentRequest !== requestId.current) return;
      setResults([]);
      setStatus("error");
      setError(t("covers.unavailable"));
      onFailure(new Error(`No se pudo buscar la portada de "${query}" en HowLongToBeat.`));
    }
  }

  async function chooseSearchResult(result: CoverSearchResult): Promise<void> {
    setSaving(result.sourceId);
    setError("");
    try {
      const saved = await window.dgt.saveCoverFromSearch(result);
      onChange(saved);
    } catch {
      setError(t("errors.coverSearch"));
      onFailure(new Error(`No se pudo guardar la portada de "${result.title}".`));
    } finally {
      setSaving("");
    }
  }

  async function chooseManualFile(): Promise<void> {
    setSaving("manual");
    setError("");
    try {
      const saved = await window.dgt.selectCoverFile();
      if (saved) onChange(saved);
    } catch {
      setError(t("errors.coverSearch"));
      onFailure(new Error("No se pudo guardar la imagen local seleccionada."));
    } finally {
      setSaving("");
    }
  }

  return (
    <section className="cover-picker" aria-labelledby="cover-picker-title">
      <div className="cover-picker-heading">
        <div>
          <span className="settings-panel-label" id="cover-picker-title">
            {t("covers.title")}
          </span>
          <p>{t("covers.automatic")}</p>
        </div>
        <CoverThumbnail cover={cover} alt={cover?.title ?? t("covers.noCover")} />
      </div>
      <div className="cover-picker-actions">
        <button
          type="button"
          className="button button-ghost button-small"
          onClick={() => void searchNow()}
          disabled={status === "loading" || saving.length > 0 || name.trim().length < 2}
        >
          {status === "loading" ? t("covers.searching") : t("covers.search")}
        </button>
        <button
          type="button"
          className="button button-ghost button-small"
          onClick={() => void chooseManualFile()}
          disabled={saving.length > 0}
        >
          {t("covers.manual")}
        </button>
        {cover && (
          <button
            type="button"
            className="cover-remove-button"
            onClick={() => onChange(null)}
            disabled={saving.length > 0}
          >
            {t("covers.remove")}
          </button>
        )}
      </div>
      {status === "loading" && (
        <p className="cover-picker-status" aria-live="polite">
          {t("covers.searching")}
        </p>
      )}
      {status === "error" && <p className="cover-picker-error">{error}</p>}
      {status === "ready" && results.length === 0 && (
        <p className="cover-picker-status">{t("covers.noResults")}</p>
      )}
      {results.length > 0 && (
        <div className="cover-results" aria-label={t("covers.title")}>
          {results.map((result) => (
            <button
              type="button"
              className="cover-result"
              key={result.sourceId}
              onClick={() => void chooseSearchResult(result)}
              disabled={saving.length > 0}
              title={t("covers.choose")}
            >
              <CoverImage
                remoteResult={result}
                alt={result.title}
                className="cover-result-image"
              />
              <span className="cover-result-copy">
                <strong>{result.title}</strong>
                <small>
                  {result.provider === "thegamesdb"
                    ? t("covers.sourceTheGamesDb")
                    : t("covers.sourceHltb")}
                </small>
              </span>
              <span className="cover-result-action">
                {saving === result.sourceId ? "..." : "+"}
              </span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function GameEditor({
  editor,
  platformColumnEnabled,
  tableMode,
  busy,
  onClose,
  onSave,
  onFailure,
}: {
  editor: EditorState;
  platformColumnEnabled: boolean;
  tableMode: TableMode;
  busy: boolean;
  onClose: () => void;
  onSave: (draft: GameDraft) => void;
  onFailure: (reason: unknown) => void;
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
      !isValidScore(draft.score)
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
          <CoverPicker
            name={draft.name}
            cover={draft.cover ?? null}
            onChange={(cover) => setDraft({ ...draft, cover })}
            onFailure={onFailure}
          />
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
            <div className="form-validation review-warning">
              <strong>{extraText(locale, "review.entryWarning")}</strong>
              {editor.mode === "edit" && editor.game.reviewReasons?.length ? (
                <ul className="review-reason-list">
                  {editor.game.reviewReasons.map((reason) => (
                    <li key={reason}>{reviewReasonLabel(reason, locale)}</li>
                  ))}
                </ul>
              ) : null}
              {editor.mode === "edit" &&
                (editor.game.ratingConflict || editor.game.ratingMode === "mixed") && (
                  <>
                    <br />
                    <span>
                      {extraText(locale, "rating.reviewWarning")} {extraText(locale, "rating.sourceValues")}: {preservedRatingValues()}
                    </span>
                  </>
                )}
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
                step="0.01"
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
              value={draft.date}
              onChange={(event) =>
                setDraft({ ...draft, date: event.target.value })
              }
            />
          </label>
          {platformColumnEnabled && (
            <PlatformPicker
              value={draft.platform ?? null}
              onChange={(platform) => setDraft({ ...draft, platform })}
            />
          )}
          {tableMode === "neo" && (
            <fieldset className="game-status-editor">
              <legend>{t("grid.status")}</legend>
              {(["completed", "platinum", "favorite"] as const).map((status) => (
                <label key={status}>
                  <input
                    type="checkbox"
                    checked={draft[status] === true}
                    onChange={(event) =>
                      setDraft({ ...draft, [status]: event.target.checked })
                    }
                  />
                  {t(`status.${status}`)}
                </label>
              ))}
            </fieldset>
          )}
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
  platformColumnEnabled,
  tableMode,
  onClose,
  onExport,
}: {
  busy: boolean;
  gameCount: number;
  platformColumnEnabled: boolean;
  tableMode: TableMode;
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
  if (platformColumnEnabled) {
    options.push({
      value: "semicolon-recommendation-platform",
      label: t("formats.semicolonRecommendationPlatform"),
      copy: t("formats.semicolonRecommendationPlatformDescription"),
    });
  }
  if (tableMode === "neo") {
    options.push(
      {
        value: "neo-xlsx",
        label: t("formats.neoXlsx"),
        copy: t("formats.neoXlsxDescription"),
      },
      {
        value: "neo-csv",
        label: t("formats.neoCsv"),
        copy: t("formats.neoCsvDescription"),
      },
    );
  }

  useEffect(() => {
    if (
      !platformColumnEnabled &&
      format === "semicolon-recommendation-platform"
    ) {
      setFormat("semicolon-score");
    }
  }, [format, platformColumnEnabled]);

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
