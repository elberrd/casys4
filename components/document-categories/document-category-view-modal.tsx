"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useTranslations } from "next-intl";
import { EntityViewModal, ViewSection } from "@/components/ui/entity-view-modal";
import { createField, createBadgeField } from "@/lib/entity-view-helpers";
import { FolderTree } from "lucide-react";

interface DocumentCategoryViewModalProps {
  categoryId: Id<"documentCategories">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
}

export function DocumentCategoryViewModal({
  categoryId,
  open,
  onOpenChange,
  onEdit,
}: DocumentCategoryViewModalProps) {
  const t = useTranslations("DocumentCategories");
  const tCommon = useTranslations("Common");

  const category = useQuery(api.documentCategories.get, { id: categoryId });

  if (!category) {
    return (
      <EntityViewModal
        open={open}
        onOpenChange={onOpenChange}
        title={t("categoryDetails")}
        sections={[]}
        size="lg"
        loading={true}
        loadingText={tCommon("loading")}
      />
    );
  }

  const sections: ViewSection[] = [
    {
      title: t("categoryInformation"),
      icon: <FolderTree className="h-5 w-5" />,
      fields: [
        createField(t("name"), category.name),
        createField(t("code"), category.code),
        createField(t("description"), category.description, undefined, {
          fullWidth: true,
        }),
        createBadgeField(
          t("status"),
          category.isActive ? tCommon("active") : tCommon("inactive"),
          category.isActive ? "default" : "secondary"
        ),
      ],
    },
  ];

  return (
    <EntityViewModal
      open={open}
      onOpenChange={onOpenChange}
      title={t("categoryDetails")}
      sections={sections}
      onEdit={onEdit}
      size="lg"
      entity={category}
    />
  );
}
