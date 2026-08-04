import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { createTranslator, DEFAULT_LOCALE } from "./i18n";
import "./styles.css";

interface ErrorBoundaryState {
  error: Error | null;
}

class RendererErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    const message =
      error.message || createTranslator(DEFAULT_LOCALE)("errors.unexpected");
    const stack = [error.stack, info.componentStack]
      .filter((value): value is string => Boolean(value))
      .join("\n");
    try {
      void window.dgt
        .reportRendererError({
          operation: "renderer:render",
          message,
          ...(stack ? { stack } : {}),
        })
        .catch(() => undefined);
    } catch {
      // The fallback must remain visible even if IPC reporting is unavailable.
    }
  }

  render(): ReactNode {
    if (this.state.error) {
      const t = createTranslator(DEFAULT_LOCALE);
      return (
        <div className="error-boundary-fallback" role="alert">
          <section className="error-boundary-card">
            <div className="error-boundary-mark" aria-hidden="true">
              !
            </div>
            <h1 className="error-boundary-title">{t("brand.product")}</h1>
            <p className="error-boundary-copy">{t("errors.unexpected")}</p>
            <pre className="error-boundary-details">
              {this.state.error.message || t("errors.unexpected")}
            </pre>
          </section>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")!).render(
  <RendererErrorBoundary>
    <App />
  </RendererErrorBoundary>,
);
