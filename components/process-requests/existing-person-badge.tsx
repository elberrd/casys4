"use client";

import { useTranslations } from "next-intl";
import { Lock, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Cross-step signal for a request candidate that links to a person who already
 * exists. Three states drive one vocabulary used in the review step, candidate
 * tabs, Dados Pessoais, and the final review:
 *   - new person            -> renders nothing (quiet UI)
 *   - owned existing person  -> "Atualizando" (updating this person's record)
 *   - cross-tenant existing  -> "Protegida" (identity withheld; gap-fill only)
 */
export function ExistingPersonBadge({
  existingPerson,
  owned,
  iconOnly = false,
  className,
}: {
  existingPerson?: boolean;
  owned?: boolean;
  iconOnly?: boolean;
  className?: string;
}) {
  const t = useTranslations("ProcessRequests");
  if (!existingPerson) return null;

  const isProtected = !owned;
  const label = isProtected
    ? t("existingPersonProtectedBadge")
    : t("existingPersonUpdatingBadge");
  const Icon = isProtected ? Lock : RefreshCw;

  if (iconOnly) {
    return (
      <span
        title={label}
        aria-label={label}
        className={cn(
          "inline-flex shrink-0 items-center",
          isProtected
            ? "text-amber-600 dark:text-amber-400"
            : "text-blue-600 dark:text-blue-400",
          className,
        )}
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
    );
  }

  return (
    <Badge
      variant={isProtected ? "outline" : "secondary"}
      className={cn(
        "gap-1 font-normal",
        isProtected
          ? "border-amber-300 text-amber-700 dark:border-amber-800 dark:text-amber-400"
          : "text-blue-700 dark:text-blue-300",
        className,
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}
