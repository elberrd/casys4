"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  documentCategorySchema,
  generateCategoryCodeFromName,
  type DocumentCategoryFormData,
} from "@/lib/validations/documentCategories";
import { UnsavedChangesDialog } from "@/components/ui/unsaved-changes-dialog";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";

interface DocumentCategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId?: Id<"documentCategories">;
  onSuccess?: () => void;
}

export function DocumentCategoryFormDialog({
  open,
  onOpenChange,
  categoryId,
  onSuccess,
}: DocumentCategoryFormDialogProps) {
  const t = useTranslations("DocumentCategories");
  const tCommon = useTranslations("Common");
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Track if user has manually edited the code field
  const [isCodeManuallyEdited, setIsCodeManuallyEdited] = useState(false);

  const category = useQuery(
    api.documentCategories.get,
    categoryId ? { id: categoryId } : "skip"
  );

  const createCategory = useMutation(api.documentCategories.create);
  const updateCategory = useMutation(api.documentCategories.update);

  const form = useForm<DocumentCategoryFormData>({
    resolver: zodResolver(documentCategorySchema),
    defaultValues: {
      name: category?.name ?? "",
      code: category?.code ?? "",
      description: category?.description ?? "",
      isActive: category?.isActive ?? true,
    },
  });

  // Unsaved changes protection
  const {
    showUnsavedDialog,
    setShowUnsavedDialog,
    handleOpenChange: handleUnsavedOpenChange,
    handleConfirmClose,
    handleCancelClose,
  } = useUnsavedChanges({
    formState: form.formState,
    onConfirmedClose: () => {
      form.reset();
      setIsCodeManuallyEdited(false);
      onOpenChange(false);
    },
    isSubmitting: isSubmitting,
  });

  // Update form when category data loads
  useEffect(() => {
    if (category && categoryId) {
      form.reset({
        name: category.name,
        code: category.code,
        description: category.description ?? "",
        isActive: category.isActive,
      });
      // When editing, consider the code as manually set (don't auto-generate)
      setIsCodeManuallyEdited(true);
    }
  }, [category, categoryId, form]);

  // Reset manual edit flag when dialog opens for creating new category
  useEffect(() => {
    if (open && !categoryId) {
      setIsCodeManuallyEdited(false);
    }
  }, [open, categoryId]);

  const onSubmit = async (data: DocumentCategoryFormData) => {
    try {
      setIsSubmitting(true);

      if (categoryId) {
        await updateCategory({
          id: categoryId,
          name: data.name,
          code: data.code,
          description: data.description,
          isActive: data.isActive,
        });
        toast.success(t("updatedSuccess"));
      } else {
        await createCategory({
          name: data.name,
          code: data.code,
          description: data.description,
          isActive: data.isActive,
        });
        toast.success(t("createdSuccess"));
      }

      form.reset();
      setIsCodeManuallyEdited(false);
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error saving document category:", error);
      const errorMessage = error instanceof Error ? error.message : "";
      if (errorMessage.includes("already exists")) {
        toast.error(t("errorDuplicateCode"));
      } else {
        toast.error(categoryId ? t("errorUpdate") : t("errorCreate"));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleUnsavedOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {categoryId ? t("editTitle") : t("createTitle")}
            </DialogTitle>
            <DialogDescription>
              {categoryId
                ? t("editDescription")
                : t("createDescription")}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("name")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        onChange={(e) => {
                          field.onChange(e);
                          // Auto-generate code from name if not manually edited
                          if (!isCodeManuallyEdited && !categoryId) {
                            const generatedCode = generateCategoryCodeFromName(
                              e.target.value
                            );
                            form.setValue("code", generatedCode, {
                              shouldValidate: true,
                            });
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("code")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="IDENTITY"
                        className="font-mono uppercase"
                        onChange={(e) => {
                          // Mark as manually edited when user types in the code field
                          setIsCodeManuallyEdited(true);
                          const value = e.target.value
                            .toUpperCase()
                            .replace(/\s+/g, "_");
                          field.onChange(value);
                        }}
                      />
                    </FormControl>
                    <FormDescription>{t("codeFormat")}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("description")}</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">{t("isActive")}</FormLabel>
                      <FormDescription>{t("isActiveDescription")}</FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleUnsavedOpenChange(false)}
                  disabled={isSubmitting}
                >
                  {tCommon("cancel")}
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? tCommon("loading") : tCommon("save")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Unsaved Changes Confirmation Dialog */}
      <UnsavedChangesDialog
        open={showUnsavedDialog}
        onOpenChange={setShowUnsavedDialog}
        onConfirm={handleConfirmClose}
        onCancel={handleCancelClose}
      />
    </>
  );
}
