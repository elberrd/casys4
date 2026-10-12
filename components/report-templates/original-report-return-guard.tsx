"use client";

import { useEffect } from "react";
import { usePathname } from "@/i18n/routing";
import {
  clearOriginalReportReturn,
  readOriginalReportReturn,
  shouldKeepOriginalReportReturn,
} from "@/lib/report-templates/original-report-return";

export function OriginalReportReturnGuard() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) return;
    const storage = window.sessionStorage;
    const session = readOriginalReportReturn(storage);
    if (!session) return;
    if (shouldKeepOriginalReportReturn(pathname, session)) return;
    clearOriginalReportReturn(storage);
  }, [pathname]);

  return null;
}
