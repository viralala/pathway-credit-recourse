/**
 * Facts the legal pages render. Kept as data so the pages can be re-skinned without touching the
 * wording, and so lib/__tests__/security.test.ts can check the licence table against node_modules.
 */

import { CONSENT_COOKIE, CURSOR_STORAGE_KEY } from "@/lib/storage-keys";

export const LEGAL_UPDATED = { iso: "2026-10-04", label: "4 October 2026" } as const;

export const ANTHROPIC_PRIVACY_URL = "https://www.anthropic.com/legal/privacy";
export const VERCEL_PRIVACY_URL = "https://vercel.com/legal/privacy-policy";
export const KAGGLE_COMPETITION_URL = "https://www.kaggle.com/c/GiveMeSomeCredit";

/** Everything Pathway stores in the browser. Nothing else is set by Pathway. */
export interface StorageItem {
  name: string;
  kind: string;
  purpose: string;
  category: string;
  duration: string;
}

/** Single source of truth (lib/storage-keys.ts): the names the consent code actually reads and writes. */
export { CONSENT_COOKIE, CURSOR_STORAGE_KEY };

export const STORAGE_ITEMS: StorageItem[] = [
  {
    name: CONSENT_COOKIE,
    kind: "First-party cookie",
    purpose: "Remembers your cookie choice, so the banner does not ask again on every page.",
    category: "Strictly necessary",
    duration: "180 days",
  },
  {
    name: CURSOR_STORAGE_KEY,
    kind: "Local storage, this browser only",
    purpose: "Remembers whether the money-cursor animation is switched on or off.",
    category: "Functional, set only with your consent",
    duration: "Until you clear site data; deleted when you withdraw consent",
  },
];

export interface SoftwareCredit {
  /** npm package name. */
  name: string;
  /** Installed version, verified against node_modules by a unit test. */
  version: string;
  /** SPDX identifier, verified against the package's own package.json by a unit test. */
  license: string;
  homepage: string;
  usedFor: string;
}

/** Code that runs on our server or ships to your browser (including stylesheets). */
export const RUNTIME_SOFTWARE: SoftwareCredit[] = [
  { name: "next", version: "16.3.8", license: "MIT", homepage: "https://nextjs.org", usedFor: "Web framework, server rendering and routing" },
  { name: "react", version: "19.2.8", license: "MIT", homepage: "https://react.dev", usedFor: "User interface library" },
  { name: "react-dom", version: "19.2.8", license: "MIT", homepage: "https://react.dev", usedFor: "Renders React in the browser and on the server" },
  { name: "recharts", version: "3.10.1", license: "MIT", homepage: "https://github.com/recharts/recharts", usedFor: "Timeline and fairness charts" },
  { name: "motion", version: "14.0.0", license: "MIT", homepage: "https://github.com/motiondivision/motion", usedFor: "Animations and transitions" },
  { name: "radix-ui", version: "1.6.7", license: "MIT", homepage: "https://radix-ui.com/primitives", usedFor: "Accessible interface primitives" },
  { name: "lucide-react", version: "1.52.0", license: "ISC", homepage: "https://lucide.dev", usedFor: "Icons" },
  { name: "class-variance-authority", version: "0.7.1", license: "Apache-2.0", homepage: "https://github.com/joe-bell/cva", usedFor: "Component style variants" },
  { name: "cn", version: "0.4.0", license: "MIT", homepage: "https://github.com/shadcn-ui/cn", usedFor: "Class name merging" },
  { name: "shadcn", version: "4.21.1", license: "MIT", homepage: "https://ui.shadcn.com", usedFor: "Component source and base styles" },
  { name: "tw-animate-css", version: "1.4.0", license: "MIT", homepage: "https://github.com/Wombosvideo/tw-animate-css", usedFor: "CSS animation utilities" },
];

/** Tools used to build and test the site; they do not ship to visitors. */
export const BUILD_SOFTWARE: SoftwareCredit[] = [
  { name: "tailwindcss", version: "4.3.3", license: "MIT", homepage: "https://tailwindcss.com", usedFor: "Generates the site's CSS" },
  { name: "@tailwindcss/postcss", version: "4.3.3", license: "MIT", homepage: "https://tailwindcss.com", usedFor: "Tailwind CSS build plugin" },
  { name: "typescript", version: "5.9.3", license: "Apache-2.0", homepage: "https://www.typescriptlang.org", usedFor: "Type checking" },
  { name: "vitest", version: "5.0.3", license: "MIT", homepage: "https://vitest.dev", usedFor: "Unit tests" },
  { name: "eslint", version: "9.39.5", license: "MIT", homepage: "https://eslint.org", usedFor: "Code linting" },
  { name: "eslint-config-next", version: "16.3.8", license: "MIT", homepage: "https://nextjs.org/docs/app/api-reference/config/eslint", usedFor: "Lint rules for Next.js" },
  { name: "tsx", version: "4.23.15", license: "MIT", homepage: "https://tsx.hirok.io", usedFor: "Runs the evaluation script" },
];

/** Bundled inside another package rather than installed directly. */
export const BUNDLED_SOFTWARE = {
  name: "@vercel/og",
  version: "0.11.1",
  license: "MPL-2.0",
  homepage: "https://vercel.com/docs/og-image-generation",
  usedFor: "Ships inside next as next/og; draws the social preview image and the home-screen icon",
  /** Path, relative to node_modules, of the package.json that proves version and licence. */
  packageJson: "next/dist/compiled/@vercel/og/package.json",
} as const;

export interface AssetCredit {
  name: string;
  license: string;
  homepage: string;
  note: string;
}

export const FONT_CREDITS: AssetCredit[] = [
  {
    name: "Manrope",
    license: "SIL Open Font License 1.1",
    homepage: "https://fonts.google.com/specimen/Manrope",
    note: "Main typeface. Downloaded at build time by next/font and served from our own domain, so your browser makes no request to Google.",
  },
  {
    name: "Noto Sans Devanagari",
    license: "SIL Open Font License 1.1",
    homepage: "https://fonts.google.com/noto/specimen/Noto+Sans+Devanagari",
    note: "Hindi and Marathi text. Self-hosted the same way.",
  },
  {
    name: "Geist",
    license: "SIL Open Font License 1.1",
    homepage: "https://vercel.com/font",
    note: "Bundled with next/og and used only inside the generated social preview image.",
  },
];

export const ICON_CREDIT: AssetCredit = {
  name: "Lucide",
  license: "ISC License",
  homepage: "https://lucide.dev",
  note: "Copyright (c) Lucide Icons and Contributors. Some icons derive from Feather by Cole Bemis (MIT License).",
};

/** Exact text of /LICENSE in the repository. */
export const MIT_LICENSE_TEXT = `MIT License

Copyright (c) 2026 Pathway contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;
