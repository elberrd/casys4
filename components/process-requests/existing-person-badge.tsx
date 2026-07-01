"use client";

import { useTranslations } from "next-intl";
import { UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

/**
 * Cross-step signal for a request candidate that links to a person who already
 * exists (a new person renders nothing, keeping the UI quiet). Used in the
 * candidate tabs (icon-only) and the final review.
 */
export function ExistingPersonBadge({
  existingPerson,
  iconOnly = false,
  className,
}: {
  existingPerson?: boolean;
  iconOnly?: boolean;
  className?: string;
}) {
  const t = useTranslations("ProcessRequests");
  if (!existingPerson) return null;

  const label = t("existingPersonBadge");

  if (iconOnly) {
    return (
      <span
        title={label}
        aria-label={label}
        className={cn(
          "inline-flex shrink-0 items-center text-blue-600 dark:text-blue-400",
          className,
        )}
      >
        <UserCheck className="h-3.5 w-3.5" />
      </span>
    );
  }

  return (
    <Badge
      variant="secondary"
      className={cn(
        "gap-1 font-normal text-blue-700 dark:text-blue-300",
        className,
      )}
    >
      <UserCheck className="h-3 w-3" />
      {label}
    </Badge>
  );
}
