import { useState } from "react";
import type { JSX } from "react";
import { normalizeText } from "../../domain/text";
import type { Translator } from "./i18n";

type GuideSection = {
  id: string;
  label: string;
  searchText: string;
  content: JSX.Element;
};

function guideLines(value: string): string[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function GuideSteps({ value }: { value: string }): JSX.Element {
  return (
    <ol className="guide-steps">
      {guideLines(value).map((line, index) => (
        <li key={`${index}-${line}`}>
          <span className="guide-step-index">{String(index + 1).padStart(2, "0")}</span>
          <p>{line}</p>
        </li>
      ))}
    </ol>
  );
}

function GuideBullets({ value }: { value: string }): JSX.Element {
  return (
    <ul className="guide-bullets">
      {guideLines(value).map((line) => (
        <li key={line}>{line}</li>
      ))}
    </ul>
  );
}

function GuidePanel({
  eyebrow,
  title,
  children,
  tone = "plain",
}: {
  eyebrow?: string;
  title: string;
  children: JSX.Element;
  tone?: "plain" | "accent" | "warning";
}): JSX.Element {
  return (
    <article className={`guide-panel guide-panel-${tone}`}>
      {eyebrow && <span className="guide-panel-eyebrow">{eyebrow}</span>}
      <h3>{title}</h3>
      {children}
    </article>
  );
}

export function GuideView({ t }: { t: Translator }): JSX.Element {
  const [query, setQuery] = useState("");
  const [copiedPath, setCopiedPath] = useState("");
  const normalizedQuery = normalizeText(query);

  async function copyPath(path: string): Promise<void> {
    if (!navigator.clipboard || typeof navigator.clipboard.writeText !== "function") {
      return;
    }
    try {
      await navigator.clipboard.writeText(path);
      setCopiedPath(path);
      window.setTimeout(() => setCopiedPath(""), 2200);
    } catch {
      setCopiedPath("");
    }
  }

  const sections: GuideSection[] = [
    {
      id: "guide-start",
      label: t("guide.indexStart"),
      searchText: `${t("guide.startTitle")} ${t("guide.startCopy")} ${t("guide.startSteps")}`,
      content: (
        <section className="guide-section" id="guide-start">
          <header className="guide-section-heading">
            <span className="eyebrow">{t("guide.startEyebrow")}</span>
            <h2>{t("guide.startTitle")}</h2>
            <p>{t("guide.startCopy")}</p>
          </header>
          <div className="guide-section-grid">
            <GuidePanel title={t("guide.indexStart")} tone="accent">
              <GuideSteps value={t("guide.startSteps")} />
            </GuidePanel>
            <GuidePanel title={t("guide.startTipTitle")} tone="plain">
              <p>{t("guide.startTipCopy")}</p>
            </GuidePanel>
          </div>
        </section>
      ),
    },
    {
      id: "guide-covers",
      label: t("guide.indexCovers"),
      searchText: `${t("guide.coversTitle")} ${t("guide.coversCopy")} ${t("guide.coversSteps")} ${t("guide.coversTroubleTitle")} ${t("guide.coversTroubleSteps")}`,
      content: (
        <section className="guide-section" id="guide-covers">
          <header className="guide-section-heading">
            <span className="eyebrow">{t("guide.coversEyebrow")}</span>
            <h2>{t("guide.coversTitle")}</h2>
            <p>{t("guide.coversCopy")}</p>
          </header>
          <div className="guide-section-grid">
            <GuidePanel title={t("guide.indexCovers")} tone="accent">
              <GuideSteps value={t("guide.coversSteps")} />
            </GuidePanel>
            <GuidePanel
              eyebrow={t("guide.coversTroubleTitle")}
              title={t("guide.indexCovers")}
              tone="warning"
            >
              <>
                <p>{t("guide.coversTroubleCopy")}</p>
                <GuideBullets value={t("guide.coversTroubleSteps")} />
              </>
            </GuidePanel>
          </div>
        </section>
      ),
    },
    {
      id: "guide-import",
      label: t("guide.indexImport"),
      searchText: `${t("guide.importTitle")} ${t("guide.importCopy")} ${t("guide.importSteps")} ${t("guide.importWarningTitle")} ${t("guide.importWarningSteps")} ${t("guide.importErrorTitle")} ${t("guide.importErrorSteps")}`,
      content: (
        <section className="guide-section" id="guide-import">
          <header className="guide-section-heading">
            <span className="eyebrow">{t("guide.importEyebrow")}</span>
            <h2>{t("guide.importTitle")}</h2>
            <p>{t("guide.importCopy")}</p>
          </header>
          <div className="guide-section-grid guide-section-grid-import">
            <GuidePanel title={t("guide.indexImport")} tone="accent">
              <GuideSteps value={t("guide.importSteps")} />
            </GuidePanel>
            <div className="guide-panel-stack">
              <GuidePanel
                eyebrow={t("guide.importWarningTitle")}
                title={t("guide.indexImport")}
                tone="warning"
              >
                <>
                  <p>{t("guide.importWarningCopy")}</p>
                  <GuideBullets value={t("guide.importWarningSteps")} />
                </>
              </GuidePanel>
              <GuidePanel
                eyebrow={t("guide.importErrorTitle")}
                title={t("guide.indexImport")}
                tone="plain"
              >
                <>
                  <p>{t("guide.importErrorCopy")}</p>
                  <GuideBullets value={t("guide.importErrorSteps")} />
                </>
              </GuidePanel>
            </div>
          </div>
        </section>
      ),
    },
    {
      id: "guide-library",
      label: t("guide.indexLibrary"),
      searchText: `${t("guide.libraryTitle")} ${t("guide.libraryCopy")} ${t("guide.librarySteps")}`,
      content: (
        <section className="guide-section" id="guide-library">
          <header className="guide-section-heading">
            <span className="eyebrow">{t("guide.libraryEyebrow")}</span>
            <h2>{t("guide.libraryTitle")}</h2>
            <p>{t("guide.libraryCopy")}</p>
          </header>
          <div className="guide-section-grid">
            <GuidePanel title={t("guide.indexLibrary")} tone="accent">
              <GuideSteps value={t("guide.librarySteps")} />
            </GuidePanel>
            <div className="guide-library-rail">
              <span className="guide-library-symbol" aria-hidden="true">/ /</span>
              <p>{t("guide.storageHintCopy")}</p>
            </div>
          </div>
        </section>
      ),
    },
    {
      id: "guide-storage",
      label: t("guide.indexStorage"),
      searchText: `${t("guide.storageTitle")} ${t("guide.storageCopy")} ${t("guide.storagePaths")} ${t("guide.storageHintCopy")}`,
      content: (
        <section className="guide-section" id="guide-storage">
          <header className="guide-section-heading">
            <span className="eyebrow">{t("guide.storageEyebrow")}</span>
            <h2>{t("guide.storageTitle")}</h2>
            <p>{t("guide.storageCopy")}</p>
          </header>
          <div className="guide-path-list">
            {guideLines(t("guide.storagePaths")).map((entry) => {
              const separator = entry.indexOf("|");
              const label = separator >= 0 ? entry.slice(0, separator) : entry;
              const path = separator >= 0 ? entry.slice(separator + 1) : "";
              return (
                <div className="guide-path-row" key={entry}>
                  <span>{label}</span>
                  <code>{path}</code>
                  <button
                    className="guide-copy-path"
                    type="button"
                    onClick={() => void copyPath(path)}
                    disabled={!path}
                    aria-label={
                      copiedPath === path
                        ? t("guide.pathCopied")
                        : t("guide.copyPath")
                    }
                  >
                    {copiedPath === path ? t("guide.pathCopied") : t("guide.copyPath")}
                  </button>
                </div>
              );
            })}
          </div>
          <div className="guide-storage-note">
            <span className="guide-panel-eyebrow">{t("guide.storageHintTitle")}</span>
            <p>{t("guide.storageHintCopy")}</p>
          </div>
        </section>
      ),
    },
    {
      id: "guide-trouble",
      label: t("guide.indexTrouble"),
      searchText: `${t("guide.troubleTitle")} ${t("guide.troubleCopy")} ${t("guide.troubleCoverTitle")} ${t("guide.troubleCoverCopy")} ${t("guide.troubleImportTitle")} ${t("guide.troubleImportCopy")} ${t("guide.troubleDataTitle")} ${t("guide.troubleDataCopy")}`,
      content: (
        <section className="guide-section" id="guide-trouble">
          <header className="guide-section-heading">
            <span className="eyebrow">{t("guide.troubleEyebrow")}</span>
            <h2>{t("guide.troubleTitle")}</h2>
            <p>{t("guide.troubleCopy")}</p>
          </header>
          <div className="guide-trouble-grid">
            <GuidePanel eyebrow="01" title={t("guide.troubleCoverTitle")} tone="warning">
              <p>{t("guide.troubleCoverCopy")}</p>
            </GuidePanel>
            <GuidePanel eyebrow="02" title={t("guide.troubleImportTitle")} tone="warning">
              <p>{t("guide.troubleImportCopy")}</p>
            </GuidePanel>
            <GuidePanel eyebrow="03" title={t("guide.troubleDataTitle")} tone="plain">
              <p>{t("guide.troubleDataCopy")}</p>
            </GuidePanel>
          </div>
        </section>
      ),
    },
  ];

  const visibleSections = normalizedQuery
    ? sections.filter((section) =>
        normalizeText(`${section.label} ${section.searchText}`).includes(normalizedQuery),
      )
    : sections;

  return (
    <div className="page-content guide-page">
      <section className="guide-hero">
        <div className="guide-hero-copy">
          <span className="eyebrow">
            <span className="eyebrow-line" />
            {t("guide.eyebrow")}
          </span>
          <h1>
            {t("guide.titleLead")} <span>{t("guide.titleAccent")}</span>
          </h1>
          <p>{t("guide.intro")}</p>
        </div>
        <div className="guide-hero-mark" aria-hidden="true">
          <strong>?</strong>
          <span>TXT</span>
          <span>REVIEW</span>
          <span>LIBRARY</span>
        </div>
      </section>

      <section className="guide-quickstart" aria-labelledby="guide-quickstart-title">
        <div className="guide-section-heading guide-quickstart-heading">
          <span className="eyebrow">{t("guide.quickEyebrow")}</span>
          <h2 id="guide-quickstart-title">{t("guide.quickTitle")}</h2>
          <p>{t("guide.quickCopy")}</p>
        </div>
        <div className="guide-quick-grid">
          <article className="guide-quick-card">
            <span>01</span>
            <h3>{t("guide.quickAddTitle")}</h3>
            <p>{t("guide.quickAddCopy")}</p>
          </article>
          <article className="guide-quick-card">
            <span>02</span>
            <h3>{t("guide.quickImportTitle")}</h3>
            <p>{t("guide.quickImportCopy")}</p>
          </article>
          <article className="guide-quick-card guide-quick-card-accent">
            <span>03</span>
            <h3>{t("guide.quickCoverTitle")}</h3>
            <p>{t("guide.quickCoverCopy")}</p>
          </article>
        </div>
      </section>

      <div className="guide-search-row">
        <label className="guide-search-box">
          <span className="guide-search-icon" aria-hidden="true">/</span>
          <span className="sr-only">{t("guide.searchLabel")}</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("guide.searchPlaceholder")}
            aria-label={t("guide.searchLabel")}
          />
          {query && (
            <button type="button" onClick={() => setQuery("")} aria-label={t("guide.searchLabel")}>
              x
            </button>
          )}
        </label>
        <span className="guide-search-hint">{t("guide.indexTitle")}</span>
      </div>

      <div className="guide-layout">
        <aside className="guide-index" aria-label={t("guide.indexTitle")}>
          <span className="guide-index-label">{t("guide.indexTitle")}</span>
          <nav>
            {visibleSections.map((section, index) => (
              <a href={`#${section.id}`} key={section.id}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                {section.label}
              </a>
            ))}
          </nav>
        </aside>
        <div className="guide-content">
          {visibleSections.length > 0 ? (
            visibleSections.map((section) => section.content)
          ) : (
            <div className="guide-no-results">{t("guide.searchNoResults")}</div>
          )}
          <section className="guide-final-note">
            <span className="eyebrow">{t("guide.finalEyebrow")}</span>
            <h2>{t("guide.finalTitle")}</h2>
            <p>{t("guide.finalCopy")}</p>
          </section>
        </div>
      </div>
    </div>
  );
}
