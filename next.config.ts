import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';
import path from "node:path";

const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

const nextConfig: NextConfig = {
  eslint: {
    // Warning: This allows production builds to successfully complete even if
    // your project has ESLint errors.
    ignoreDuringBuilds: true,
  },
  webpack(config) {
    config.module.rules.push({
      test: /pdfjs-dist[\\/]build[\\/]pdf\.mjs$/,
      enforce: "pre",
      use: [path.resolve(process.cwd(), "webpack/pdfjs-dist-loader.cjs")],
    });

    return config;
  },
};

export default withNextIntl(nextConfig);
