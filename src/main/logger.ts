import { appendFile, mkdir, rename, rm, stat } from "node:fs/promises";
import { dirname } from "node:path";

export const MAX_LOG_BYTES = 5 * 1024 * 1024;

export type LogLevel = "debug" | "info" | "warn" | "error";
export type LogProcess = "main" | "preload" | "renderer";

export interface LogEntry {
  level: LogLevel;
  process: LogProcess;
  operation: string;
  message: string;
  stack?: string;
}

export interface MainLogger {
  log(entry: LogEntry): Promise<void>;
}

const SECRET_KEY_PATTERN =
  /\b(password|passwd|pwd|passphrase|token|secret|credential|credentials|api[-_ ]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|private[_-]?key|authorization|cookie|notes?|notas?|comments?|comentarios?)\b\s*([=:])\s*(?:"[^"]*"|'[^']*'|[^|\r\n]+)/gi;
const SECRET_QUERY_PATTERN =
  /([?&](?:password|passwd|pwd|token|secret|credential|api[-_ ]?key|access[_-]?token|refresh[_-]?token|authorization)=)[^&\s]+/gi;
const BEARER_PATTERN = /\bBearer\s+[^\s]+/gi;

function redactPaths(value: string): string {
  let result = value.replace(
    /(?:[A-Za-z]:[\\/]|\\\\)(?:[^\\/\r\n]+[\\/])*([^\\/\r\n]+)/g,
    "$1",
  );
  result = result.replace(
    /(^|[\s\"'=(])\/(?:[^\/\r\n\"'|;\)]+\/)*([^\/\r\n\"'|;\)]+)/g,
    "$1$2",
  );
  return result;
}

export function sanitizeLogText(value: string): string {
  return redactPaths(value)
    .replace(SECRET_KEY_PATTERN, "$1$2[REDACTED]")
    .replace(SECRET_QUERY_PATTERN, "$1[REDACTED]")
    .replace(BEARER_PATTERN, "Bearer [REDACTED]")
    .replace(/[\r\n]+/g, "\\n")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "?");
}

export function fileBasename(filePath: string): string {
  const normalized = filePath.replaceAll("\\", "/");
  const lastSlash = normalized.lastIndexOf("/");
  return lastSlash >= 0 ? normalized.slice(lastSlash + 1) : normalized;
}

function truncateUtf8(value: string, maxBytes: number): string {
  if (Buffer.byteLength(value, "utf8") <= maxBytes) return value;

  let low = 0;
  let high = value.length;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (Buffer.byteLength(value.slice(0, middle), "utf8") <= maxBytes) {
      low = middle;
    } else {
      high = middle - 1;
    }
  }
  return value.slice(0, low);
}

export function formatLogLine(entry: LogEntry, timestamp = new Date()): string {
  const fields = [
    timestamp.toISOString(),
    entry.level.toUpperCase(),
    entry.process,
    sanitizeLogText(entry.operation),
    sanitizeLogText(entry.message),
  ];
  if (entry.stack) fields.push(`stack=${sanitizeLogText(entry.stack)}`);
  return fields.join(" | ");
}

export class FileLogger implements MainLogger {
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(
    private readonly filePath: string,
    private readonly maxBytes = MAX_LOG_BYTES,
  ) {}

  log(entry: LogEntry): Promise<void> {
    const next = this.writeQueue.then(() => this.writeLine(entry));
    this.writeQueue = next.catch(() => undefined);
    return next.catch(() => undefined);
  }

  private async writeLine(entry: LogEntry): Promise<void> {
    const line = `${truncateUtf8(
      formatLogLine(entry),
      Math.max(0, this.maxBytes - 1),
    )}\n`;
    const lineBytes = Buffer.byteLength(line, "utf8");
    const rotatedPath = `${this.filePath}.1`;

    await mkdir(dirname(this.filePath), { recursive: true });

    let currentBytes = 0;
    try {
      currentBytes = (await stat(this.filePath)).size;
    } catch (error) {
      if (!isNodeErrorWithCode(error, "ENOENT")) throw error;
    }

    if (currentBytes > 0 && currentBytes + lineBytes > this.maxBytes) {
      await rm(rotatedPath, { force: true });
      await rename(this.filePath, rotatedPath);
    }

    await appendFile(this.filePath, line, "utf8");
  }
}

function isNodeErrorWithCode(
  error: unknown,
  code: string,
): error is NodeJS.ErrnoException {
  return (
    error instanceof Error &&
    "code" in error &&
    (error as NodeJS.ErrnoException).code === code
  );
}
