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

type ProviderTokenResult = {
  status: "success" | "error";
  token_id?: string;
  token_type?: string;
  fingerprint_id?: string;
  error_code?: string;
  error_message?: string;
  meta?: Record<string, unknown> | null;
};

type TokenizeCardInput = {
  card_number: string;
  holder_name?: string;
  exp_month: string;
  exp_year: string;
  cvv: string;
  document_number?: string;
  document_type?: "CPF" | "CNPJ";
  email?: string;
};

type TokenizeCardOptions = {
  apiBase?: string;
  evervault?: { enabled?: boolean; js_url?: string; app_id?: string };
  selected_providers?: Array<
    "evervault" | "mercadopago" | "pagarme" | "stripe"
  >;
  providers?: {
    mercadopago?: { public_key?: string; script_url?: string; locale?: string };
    pagarme?: { app_id?: string; public_key?: string; script_url?: string };
    stripe?: {
      public_key?: string;
      script_url?: string;
      card_element?: unknown;
    };
  };
  adapters?: Record<string, (...args: unknown[]) => Promise<unknown>>;
  pix?: { provider?: "abacatepay" | "woovi" };
};

type TokenizeCardResult = {
  success: boolean;
  providers: Record<string, ProviderTokenResult>;
  provider_meta?: Record<string, unknown>;
  masked: { last4: string; brand: string };
  elapsed_ms: number;
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
      tokenizeCard?: (
        input: TokenizeCardInput,
        options?: TokenizeCardOptions,
      ) => Promise<TokenizeCardResult>;
      pix?: {
        createCharge?: (
          input: Record<string, unknown>,
          options?: TokenizeCardOptions,
        ) => Promise<unknown>;
      };
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

  async tokenizeCard(
    input: TokenizeCardInput,
    options: TokenizeCardOptions = {},
  ) {
    await this.loadCheckoutScript({ apiBase: options.apiBase });
    if (!window.VektopayElements?.tokenizeCard) {
      throw new Error("tokenize_card_not_available");
    }
    return window.VektopayElements.tokenizeCard(input, options);
  }

  async createPixCharge(
    input: Record<string, unknown>,
    options: TokenizeCardOptions = {},
  ) {
    await this.loadCheckoutScript({ apiBase: options.apiBase });
    if (!window.VektopayElements?.pix?.createCharge) {
      throw new Error("pix_create_charge_not_available");
    }
    return window.VektopayElements.pix.createCharge(input, options);
  }
}
