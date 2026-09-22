import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const prosemirrorAliases = {
  "prosemirror-model": require.resolve("prosemirror-model"),
  "prosemirror-state": require.resolve("prosemirror-state"),
  "prosemirror-transform": require.resolve("prosemirror-transform"),
  "prosemirror-view": require.resolve("prosemirror-view"),
} as const;

function applyProsemirrorAliases(config: {
  resolve?: { alias?: Record<string, string> | Array<{ name: string; alias: string }> };
}) {
  config.resolve ??= {};
  const existing = config.resolve.alias;
  if (Array.isArray(existing)) {
    config.resolve.alias = [
      ...Object.entries(prosemirrorAliases).map(([name, alias]) => ({
        name,
        alias,
      })),
      ...existing,
    ];
    return;
  }
  config.resolve.alias = { ...existing, ...prosemirrorAliases };
}

const nextConfig: NextConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  // TipTap/ProseMirror: two copies of prosemirror-model make Enter/splitBlock
  // throw "Can not convert <> to a Fragment". Force one copy in both bundlers.
  turbopack: {
    resolveAlias: { ...prosemirrorAliases },
  },
  webpack(config) {
    applyProsemirrorAliases(config);
    config.module.rules.push({
      test: /pdfjs-dist[\\/]build[\\/]pdf\.mjs$/,
      enforce: "pre",
      use: [path.resolve(process.cwd(), "webpack/pdfjs-dist-loader.cjs")],
    });

    return config;
  },
};

export default withNextIntl(nextConfig);
