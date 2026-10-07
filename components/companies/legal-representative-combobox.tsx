"use client";

import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";

interface LegalRepresentativeComboboxProps {
  value?: Id<"people"> | "";
  onValueChange: (value: Id<"people"> | undefined) => void;
  disabled?: boolean;
  /**
   * Keep the list inside a Dialog scroll-lock (company form modal).
   */
  popoverModal?: boolean;
  isolateListScroll?: boolean;
}

/**
 * Searchable legal-representative picker. Filters by the person's name
 * (server-side via `people.search` plus cmdk label matching) and keeps the
 * currently selected person visible even when they fall outside the search page.
 */
export function LegalRepresentativeCombobox({
  value,
  onValueChange,
  disabled = false,
  popoverModal = false,
  isolateListScroll = false,
}: LegalRepresentativeComboboxProps) {
  const t = useTranslations("Companies");
  const tCommon = useTranslations("Common");
  const [search, setSearch] = useState("");

  const selectedId = value && value !== "" ? value : undefined;
  const people = useQuery(api.people.search, { query: search });
  const selected = useQuery(
    api.people.get,
    selectedId ? { id: selectedId } : "skip",
  );

  const options = useMemo<ComboboxOption<Id<"people">>[]>(() => {
    const seen = new Set<string>();
    const next: ComboboxOption<Id<"people">>[] = [];

    const push = (id: Id<"people">, label: string) => {
      if (seen.has(id)) return;
      seen.add(id);
      next.push({ value: id, label });
    };

    if (selected) {
      push(selected._id, selected.fullName);
    }

    for (const person of people ?? []) {
      push(person._id, person.fullName);
    }

    return next;
  }, [people, selected]);

  return (
    <Combobox
      options={options}
      value={selectedId}
      onValueChange={onValueChange}
      onSearchChange={setSearch}
      ariaLabel={t("contactPerson")}
      placeholder={t("selectContactPerson")}
      searchPlaceholder={t("searchLegalRepresentative")}
      emptyText={t("noLegalRepresentativeFound")}
      disabled={disabled}
      loading={people === undefined}
      loadingText={tCommon("loading")}
      showClearButton
      clearButtonAriaLabel={tCommon("clear")}
      popoverModal={popoverModal}
      isolateListScroll={isolateListScroll}
    />
  );
}
