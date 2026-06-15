"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { useQuery } from "convex/react";
import { useTranslations } from "next-intl";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { cn, normalizeString } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface LegalFrameworkSelectProps {
  processTypeId?: Id<"processTypes">;
  value?: Id<"legalFrameworks">;
  onChange: (id: Id<"legalFrameworks"> | undefined) => void;
  disabled?: boolean;
}

/**
 * Reusable legal-framework (amparo legal) selector.
 *
 * Shows both the framework NAME (font-medium) and its DESCRIPTION
 * (text-xs text-muted-foreground, clamped to two lines) for each option.
 *
 * When a `processTypeId` is provided, only the legal frameworks associated
 * with that process type are loaded; otherwise all active frameworks are
 * loaded. Options are searchable by name.
 */
export function LegalFrameworkSelect({
  processTypeId,
  value,
  onChange,
  disabled = false,
}: LegalFrameworkSelectProps) {
  const t = useTranslations("ProcessRequests");
  const [open, setOpen] = React.useState(false);

  // Load frameworks scoped to the process type when one is selected,
  // otherwise fall back to all active frameworks.
  const frameworksByType = useQuery(
    api.processTypes.getLegalFrameworks,
    processTypeId ? { processTypeId } : "skip",
  );
  const allActiveFrameworks = useQuery(
    api.legalFrameworks.listActive,
    processTypeId ? "skip" : {},
  );

  const rawFrameworks = processTypeId ? frameworksByType : allActiveFrameworks;
  const isLoading = rawFrameworks === undefined;

  // The backend queries can yield nullable array entries in their inferred
  // type; narrow to a clean, non-null list for safe rendering.
  const frameworks = React.useMemo(
    () => rawFrameworks?.filter((framework) => framework !== null) ?? [],
    [rawFrameworks],
  );

  const selectedFramework = React.useMemo(
    () => frameworks.find((framework) => framework._id === value),
    [frameworks, value],
  );

  const handleSelect = (frameworkId: string) => {
    const nextValue =
      frameworkId === value
        ? undefined
        : (frameworkId as Id<"legalFrameworks">);
    onChange(nextValue);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled || isLoading}
          className={cn(
            "w-full justify-between",
            !selectedFramework && "text-muted-foreground",
          )}
        >
          <span className="truncate">
            {selectedFramework
              ? selectedFramework.name
              : t("selectLegalFramework")}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="p-0"
        style={{ width: "var(--radix-popover-trigger-width)" }}
      >
        <Command
          filter={(itemValue, search) => {
            const framework = frameworks.find(
              (option) => option._id === itemValue,
            );
            if (!framework) return 0;

            const searchNormalized = normalizeString(search);
            const nameNormalized = normalizeString(framework.name);

            return nameNormalized.includes(searchNormalized) ? 1 : 0;
          }}
        >
          <CommandInput placeholder={t("searchLegalFrameworks")} />
          <CommandList>
            <CommandEmpty>{t("noLegalFrameworksFound")}</CommandEmpty>
            {frameworks.length > 0 && (
              <CommandGroup>
                {frameworks.map((framework) => (
                  <CommandItem
                    key={framework._id}
                    value={framework._id}
                    onSelect={handleSelect}
                    className="items-start"
                  >
                    <Check
                      className={cn(
                        "mr-2 mt-0.5 h-4 w-4 shrink-0",
                        value === framework._id ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <div className="flex min-w-0 flex-col">
                      <span className="font-medium">{framework.name}</span>
                      {framework.description && (
                        <span className="line-clamp-2 text-xs text-muted-foreground">
                          {framework.description}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
