import type { ReviewReason, SourceRef } from "./types";

export const RAW_DATE_EXTRA_KEY = "raw-date";

const REVIEW_REASONS: readonly ReviewReason[] = [
  "missing-date",
  "invalid-date",
  "missing-year",
  "year-conflict",
  "invalid-score",
  "unknown-recommendation",
  "unknown-platform",
  "mixed-rating-fields",
  "ambiguous-year",
  "unknown-status",
];

export function isReviewReason(value: unknown): value is ReviewReason {
  return (
    typeof value === "string" &&
    (REVIEW_REASONS as readonly string[]).includes(value)
  );
}

export function addReviewReason(
  reasons: ReviewReason[],
  reason: ReviewReason,
): void {
  if (!reasons.includes(reason)) reasons.push(reason);
}

export function normalizeReviewReasons(value: unknown): ReviewReason[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isReviewReason).filter(
    (reason, index, all) => all.indexOf(reason) === index,
  );
}

export function reviewReasonFromCode(code: string): ReviewReason | null {
  return isReviewReason(code) ? code : null;
}

export function createImportRowKey(
  source: Pick<SourceRef, "filePath" | "line">,
): string {
  return JSON.stringify([source.filePath, source.line]);
}
