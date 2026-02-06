# @vektopay/angular

Angular service wrapper for Vektopay checkout. The core UI and security live in `checkout.js` served by the API Gateway.

## Install

```bash
bun add @vektopay/angular
# or
npm install @vektopay/angular
```

## Usage

```ts
import { Component } from "@angular/core";
import { VektopayCheckoutService } from "@vektopay/angular";

@Component({
  selector: "app-root",
  template: `
    <button (click)="open()">Open checkout</button>
  `,
})
export class AppComponent {
  constructor(private checkout: VektopayCheckoutService) {}

  open() {
    this.checkout.open({ token: "your_token", apiBase: "http://localhost:3000" });
  }
}
```

## Build

```bash
bun install
bun run build
```

## Publish

```bash
npm version patch
npm publish --access public
```

## Notes
- Tokens are created server-side. Never expose secret keys in the browser.
