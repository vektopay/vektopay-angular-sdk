import { Injectable } from "@angular/core";

type CheckoutHandle = { close?: () => void } | null;

type CheckoutScriptOptions = {
  apiBase?: string;
};

type CheckoutOptions = {
  token: string;
  apiBase?: string;
};

type CardElementHandle = {
  card: unknown;
  getPayload: () => unknown;
  validate: () => void;
};

declare global {
  interface Window {
    VektopayCheckout?: {
      open: (options: CheckoutOptions) => CheckoutHandle;
      embed: (options: CheckoutOptions & { mount: string }) => CheckoutHandle;
    };
    VektopayElements?: {
      createCard: (
        mountSelector: string,
        options?: CheckoutScriptOptions,
      ) => Promise<CardElementHandle>;
    };
  }
}

const scriptCache = new Map<string, Promise<void>>();

function normalizeBase(apiBase?: string) {
  return apiBase ? apiBase.replace(/\/$/, "") : "";
}

@Injectable({ providedIn: "root" })
export class VektopayCheckoutService {
  loadCheckoutScript(options: CheckoutScriptOptions = {}) {
    const base = normalizeBase(options.apiBase);
    const src = `${base}/checkout.js`;
    if (scriptCache.has(src)) return scriptCache.get(src) as Promise<void>;

    const promise = new Promise<void>((resolve, reject) => {
      if (typeof window === "undefined") return resolve();
      if (window.VektopayCheckout && window.VektopayElements) return resolve();
      if (document.querySelector(`script[src=\"${src}\"]`)) return resolve();
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("checkout_script_load_failed"));
      document.head.appendChild(script);
    });

    scriptCache.set(src, promise);
    return promise;
  }

  async open(options: CheckoutOptions) {
    await this.loadCheckoutScript({ apiBase: options.apiBase });
    return window.VektopayCheckout?.open(options) || null;
  }

  async embed(options: CheckoutOptions & { mount: string }) {
    await this.loadCheckoutScript({ apiBase: options.apiBase });
    return window.VektopayCheckout?.embed(options) || null;
  }

  async createCard(mountSelector: string, options: CheckoutScriptOptions = {}) {
    await this.loadCheckoutScript({ apiBase: options.apiBase });
    if (!window.VektopayElements) throw new Error("elements_not_ready");
    return window.VektopayElements.createCard(mountSelector, options);
  }
}
