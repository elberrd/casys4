"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { DocumentCategoriesTable } from "@/components/document-categories/document-categories-table";
import { DocumentCategoryFormDialog } from "@/components/document-categories/document-category-form-dialog";
import { DocumentCategoryViewModal } from "@/components/document-categories/document-category-view-modal";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

export function DocumentCategoriesClient() {
  const t = useTranslations("DocumentCategories");
  const tBreadcrumbs = useTranslations("Breadcrumbs");

  const documentCategories = useQuery(api.documentCategories.list, {}) ?? [];
  const removeDocumentCategory = useMutation(api.documentCategories.remove);
  const toggleActive = useMutation(api.documentCategories.toggleActive);

  const [viewingCategory, setViewingCategory] = useState<
    Id<"documentCategories"> | undefined
  >();
  const [editingCategory, setEditingCategory] = useState<
    Id<"documentCategories"> | undefined
  >();
  const [isFormOpen, setIsFormOpen] = useState(false);

  const breadcrumbs = [
    { label: tBreadcrumbs("dashboard"), href: "/dashboard" },
    { label: tBreadcrumbs("supportData") },
    { label: tBreadcrumbs("documentCategories") },
  ];

  const handleView = (id: Id<"documentCategories">) => {
    setViewingCategory(id);
  };

  const handleEdit = (id: Id<"documentCategories">) => {
    setEditingCategory(id);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: Id<"documentCategories">) => {
    try {
      await removeDocumentCategory({ id });
      toast.success(t("deactivatedSuccess"));
    } catch (error) {
      console.error("Error deactivating document category:", error);
      toast.error(t("errorDeactivate"));
    }
  };

  const handleToggleActive = async (id: Id<"documentCategories">) => {
    try {
      await toggleActive({ id });
      toast.success(t("statusUpdatedSuccess"));
    } catch (error) {
      console.error("Error toggling document category status:", error);
      toast.error(t("errorStatusUpdate"));
    }
  };

  const handleCreateNew = () => {
    setEditingCategory(undefined);
    setIsFormOpen(true);
  };

  return (
    <>
      <DashboardPageHeader breadcrumbs={breadcrumbs} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div>
          <h1 className="text-2xl font-bold">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
        <DocumentCategoriesTable
          documentCategories={documentCategories}
          onView={handleView}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onToggleActive={handleToggleActive}
          onCreateNew={handleCreateNew}
        />
      </div>

      {viewingCategory && (
        <DocumentCategoryViewModal
          categoryId={viewingCategory}
          open={true}
          onOpenChange={(open) => !open && setViewingCategory(undefined)}
          onEdit={() => {
            setEditingCategory(viewingCategory);
            setViewingCategory(undefined);
            setIsFormOpen(true);
          }}
        />
      )}

      <DocumentCategoryFormDialog
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) {
            setEditingCategory(undefined);
          }
        }}
        categoryId={editingCategory}
      />
    </>
  );
}
