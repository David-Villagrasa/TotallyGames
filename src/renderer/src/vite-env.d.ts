import type { DgtApi } from "../../shared/api";

declare global {
  interface Window {
    dgt: DgtApi;
  }
}

export {};
