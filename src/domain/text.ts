export function normalizeText(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeHeader(value: string): string {
  return normalizeText(value)
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function splitSemicolon(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const next = line[index + 1];

    if (character === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (character === '"') {
      quoted = !quoted;
      continue;
    }

    if (character === ";" && !quoted) {
      values.push(current.trim());
      current = "";
      continue;
    }

    current += character;
  }

  values.push(current.trim());
  return values;
}

export function extractYearFromFileName(fileName: string): number | null {
  const match = fileName.match(/(?:^|[^0-9])(20[0-9]{2})(?:[^0-9]|$)/);
  return match ? Number(match[1]) : null;
}

export function createFingerprint(input: {
  name: string;
  date: string;
  score: number | null;
  recommendation: string | null;
}): string {
  return [
    normalizeText(input.name),
    input.date,
    input.score === null ? "" : String(input.score),
    normalizeText(input.recommendation ?? ""),
  ].join("|");
}
