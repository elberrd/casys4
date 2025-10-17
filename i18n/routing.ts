import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const routing = defineRouting({
  // All supported locales
  locales: ['pt', 'en'],

  // Default locale (Portuguese for Brazilian immigration law context)
  defaultLocale: 'pt',

  // Locale prefix strategy
  // 'always' - Always show locale prefix (/pt/dashboard, /en/dashboard)
  localePrefix: 'always'
});

// Create typed navigation utilities
export const { Link, redirect, usePathname, useRouter } = createNavigation(routing);
