# i18n Implementation for CASYS4

## Overview

This document describes the internationalization (i18n) implementation for CASYS4, an immigration law process management system. The system supports Portuguese (pt) as the primary language and English (en) as the secondary language.

## Technology Stack

- **next-intl v4.3.12** - i18n library for Next.js 15.5.4 App Router
- **Next.js 15.5.4** - React framework with App Router
- **TypeScript** - Type-safe development

## Implementation Details

### 1. File Structure

```
casys4/
├── messages/
│   ├── pt.json          # Portuguese translations (primary)
│   └── en.json          # English translations
├── i18n/
│   ├── routing.ts       # Routing configuration
│   └── request.ts       # Request configuration with formats
├── middleware.ts        # Locale detection + Convex auth integration
├── next.config.ts       # Next.js config with next-intl plugin
└── app/
    ├── layout.tsx       # Minimal root layout
    └── [locale]/
        ├── layout.tsx   # Locale-aware layout with providers
        ├── page.tsx     # Home page
        ├── (dashboard)/ # Dashboard routes
        │   ├── layout.tsx
        │   ├── dashboard/
        │   └── settings/  # Settings page with language switcher
        ├── login/
        └── signin/
```

### 2. Locale Configuration

**Default Locale:** Portuguese (pt)
**Supported Locales:** Portuguese (pt), English (en)
**Locale Prefix Strategy:** Always show locale in URL (`/pt/dashboard`, `/en/dashboard`)
**Time Zone:** America/Sao_Paulo (Brazilian timezone)
**Date Format:** DD/MM/YYYY (Brazilian format)
**Currency:** BRL (Brazilian Real)

### 3. Key Components

#### Translation Files (`/messages/*.json`)

Organized by namespace:
- **Common**: Buttons and common UI elements
- **Navigation**: Sidebar menu items
- **Settings**: Language settings page
- **Auth**: Authentication related strings
- **Metadata**: Page metadata and SEO

#### i18n Configuration

- **`i18n/routing.ts`**: Defines supported locales, default locale, and exports typed navigation utilities (Link, useRouter, usePathname, redirect)
- **`i18n/request.ts`**: Loads translations dynamically, sets timezone, and configures date/number formats

#### Middleware Integration

The middleware combines:
1. **next-intl middleware** - Handles locale detection and routing
2. **Convex auth middleware** - Handles authentication and protected routes

Both middlewares work together seamlessly, ensuring locale is preserved across auth redirects.

### 4. Translated Components

- **AppSidebar** (`components/app-sidebar.tsx`) - Main navigation sidebar with all menu items translated
- **LanguageSwitcher** (`components/language-switcher.tsx`) - Dropdown to switch between languages
- **Settings Page** (`app/[locale]/(dashboard)/settings/page.tsx`) - Page where users can change language

### 5. Navigation

All navigation uses i18n-aware components from `@/i18n/routing`:
- `Link` - Locale-aware Link component
- `useRouter()` - Locale-aware router hook
- `usePathname()` - Locale-aware pathname hook
- `redirect()` - Locale-aware redirect function

**DO NOT** use components from `next/navigation` directly.

## Adding New Translations

### Step 1: Add to Translation Files

Add the new key to both `/messages/pt.json` and `/messages/en.json`:

```json
// messages/pt.json
{
  "Navigation": {
    "newItem": "Novo Item"
  }
}

// messages/en.json
{
  "Navigation": {
    "newItem": "New Item"
  }
}
```

### Step 2: Use in Components

**Server Components:**
```typescript
import { getTranslations } from 'next-intl/server';

export default async function MyPage() {
  const t = await getTranslations('Navigation');
  return <h1>{t('newItem')}</h1>;
}
```

**Client Components:**
```typescript
'use client';
import { useTranslations } from 'next-intl';

export function MyComponent() {
  const t = useTranslations('Navigation');
  return <button>{t('newItem')}</button>;
}
```

## Adding a New Language

To add a new language (e.g., Spanish):

1. Create `/messages/es.json` with all translations
2. Update `i18n/routing.ts`:
   ```typescript
   locales: ['pt', 'en', 'es']
   ```
3. Update middleware matcher in `/middleware.ts`:
   ```typescript
   '/(pt|en|es)/:path*'
   ```
4. Add language option to `LanguageSwitcher` component
5. Rebuild and test

## URL Structure

All routes include the locale prefix:

- Portuguese (default): `/pt/dashboard`, `/pt/settings`, `/pt/login`
- English: `/en/dashboard`, `/en/settings`, `/en/login`
- Root redirect: `/` → `/pt` (redirects to default locale)

## Authentication Flow with i18n

The authentication flow preserves the locale across all redirects:

1. User visits `/pt/login` → Logs in → Redirected to `/pt/dashboard`
2. User visits `/en/settings` → Logs out → Redirected to `/en/login`
3. Unauthenticated user visits `/pt/dashboard` → Redirected to `/pt/login`

This is handled automatically by the integrated middleware.

## Best Practices

1. **Always use namespaces** - Organize translations by feature/section
2. **Never hardcode user-facing strings** - Always use translation keys
3. **Use server components when possible** - Better performance, smaller bundle
4. **Use typed navigation** - Import from `@/i18n/routing`, not `next/navigation`
5. **Test in both languages** - Verify all text displays correctly
6. **Keep translation files in sync** - Ensure all keys exist in all language files

## Testing i18n

### Manual Testing Checklist

- [ ] Visit `/pt/dashboard` - Verify Portuguese text
- [ ] Visit `/en/dashboard` - Verify English text
- [ ] Switch language via Settings page - Verify instant update
- [ ] Navigate between pages - Verify locale persists
- [ ] Refresh page - Verify locale persists (cookie)
- [ ] Login/logout flow - Verify locale maintained
- [ ] Direct URL access - Verify `/pt/*` and `/en/*` work
- [ ] Invalid locale - Verify `/fr/dashboard` redirects properly

### Build Verification

```bash
pnpm build   # Should build without errors
pnpm lint    # Should lint without errors
```

## Troubleshooting

### Issue: "Module not found" errors
- Ensure all imports use `@/` alias correctly
- Verify `tsconfig.json` has correct path mappings

### Issue: Translation keys showing instead of text
- Check translation file syntax (valid JSON)
- Verify namespace matches in `useTranslations('Namespace')`
- Ensure key exists in all language files

### Issue: Locale not persisting
- Check middleware configuration
- Verify cookie is being set (NEXT_LOCALE)
- Check browser dev tools → Application → Cookies

### Issue: Auth redirects losing locale
- Verify middleware order (intl → auth)
- Check route matchers include locale prefix pattern

## Performance Considerations

- Translation files are loaded dynamically per locale (only load what's needed)
- Server Components minimize client-side JavaScript
- Middleware runs efficiently on edge runtime
- Static generation works for all locale variants

## Convex Integration

The i18n implementation is fully compatible with Convex:
- Database queries work identically in all locales
- Real-time updates function correctly
- Authentication flow integrated with locale routing
- No changes needed to Convex schemas or functions

## Future Enhancements

Potential improvements to consider:
- Add Spanish (es) as third language
- Store user language preference in database (Convex)
- Add language detection from browser
- Implement per-organization default language
- Add RTL (Right-to-Left) language support if needed

## References

- [next-intl Documentation](https://next-intl.dev/)
- [Next.js i18n Guide](https://nextjs.org/docs/app/guides/internationalization)
- [CASYS4 i18n Guide](/ai_docs/ui-components/i18n.md)

---

**Implementation Date:** October 2024
**Last Updated:** October 2024
**Version:** 1.0
