import type { AppSettings, ResetResult } from "../shared/api";

export interface RepositoryResetPort {
  reset(): Promise<void>;
}

export interface SettingsResetPort {
  reset(): Promise<AppSettings>;
}

export async function resetApplicationData(
  repository: unknown,
  settings: SettingsResetPort,
): Promise<ResetResult> {
  const reset = getRepositoryReset(repository);
  await reset();
  return {
    libraryReset: true,
    settings: await settings.reset(),
  };
}

export function getRepositoryReset(
  repository: unknown,
): () => Promise<void> {
  const candidate = repository as Partial<RepositoryResetPort>;
  if (typeof candidate.reset !== "function") {
    throw new Error(
      "El repositorio no ofrece la operación tipada de reinicio interno.",
    );
  }
  const reset = candidate.reset;
  return () => reset.call(repository);
}
