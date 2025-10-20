import {
  convexAuthNextjsMiddleware,
  createRouteMatcher,
  nextjsMiddlewareRedirect,
} from "@convex-dev/auth/nextjs/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Create the i18n middleware
const intlMiddleware = createIntlMiddleware(routing);

// Update route matchers to include locale prefix
const isLoginPage = createRouteMatcher(["/:locale/login"]);
const isProtectedRoute = createRouteMatcher(["/:locale/dashboard(.*)"]);

export default convexAuthNextjsMiddleware(async (request, { convexAuth }) => {
  // First, run the i18n middleware to handle locale
  const intlResponse = intlMiddleware(request);

  // Extract locale from pathname
  const locale = request.nextUrl.pathname.split('/')[1];
  const validLocale = routing.locales.includes(locale as 'pt' | 'en') ? locale : routing.defaultLocale;

  // Handle authentication redirects with locale
  if (isLoginPage(request) && (await convexAuth.isAuthenticated())) {
    return nextjsMiddlewareRedirect(request, `/${validLocale}/dashboard`);
  }
  if (isProtectedRoute(request) && !(await convexAuth.isAuthenticated())) {
    return nextjsMiddlewareRedirect(request, `/${validLocale}/login`);
  }

  // Return the i18n response if exists, otherwise undefined (no redirect)
  return intlResponse;
});

export const config = {
  // Match all pathnames except for
  // - /_next (Next.js internals)
  // - /_vercel (Vercel internals)
  // - /convex (Convex backend routes)
  // - static files (.*\\..*)
  // Note: We INCLUDE /api routes so Convex Auth can handle authentication
  matcher: [
    '/((?!_next|_vercel|convex|.*\\..*).*)',
    '/',
    '/(pt|en)/:path*',
    '/(api|trpc)(.*)'
  ]
};
