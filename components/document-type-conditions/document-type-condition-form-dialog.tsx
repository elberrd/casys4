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
import { Loader2 } from "lucide-react";
import {
  documentTypeConditionSchema,
  generateConditionCodeFromName,
  defaultConditionValues,
  type DocumentTypeConditionFormData,
} from "@/lib/validations/documentTypeConditions";
import { UnsavedChangesDialog } from "@/components/ui/unsaved-changes-dialog";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";

// Data returned when a new condition is created
export interface CreatedConditionData {
  _id: Id<"documentTypeConditions">;
  name: string;
  code?: string;
  description?: string;
  isRequired: boolean;
  relativeExpirationDays?: number;
  isActive: boolean;
  sortOrder?: number;
}

interface DocumentTypeConditionFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conditionId?: Id<"documentTypeConditions">;
  documentTypeId?: Id<"documentTypes">; // If provided, returns created condition data instead of auto-linking
  prefilledName?: string; // Pre-fill the name field
  onSuccess?: (createdCondition?: CreatedConditionData) => void;
}

export function DocumentTypeConditionFormDialog({
  open,
  onOpenChange,
  conditionId,
  documentTypeId,
  prefilledName,
  onSuccess,
}: DocumentTypeConditionFormDialogProps) {
  const t = useTranslations("DocumentTypeConditions");
  const tCommon = useTranslations("Common");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const condition = useQuery(
    api.documentTypeConditions.get,
    conditionId ? { id: conditionId } : "skip"
  );

  const createCondition = useMutation(api.documentTypeConditions.create);
  const updateCondition = useMutation(api.documentTypeConditions.update);

  const form = useForm<DocumentTypeConditionFormData>({
    resolver: zodResolver(documentTypeConditionSchema),
    defaultValues: {
      ...defaultConditionValues,
      name: prefilledName || "",
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
      onOpenChange(false);
    },
    isSubmitting: isSubmitting,
  });

  // Update form when condition data loads (for editing)
  useEffect(() => {
    if (condition && conditionId) {
      form.reset({
        name: condition.name,
        code: condition.code ?? generateConditionCodeFromName(condition.name),
        description: condition.description ?? "",
        isRequired: condition.isRequired,
        relativeExpirationDays: condition.relativeExpirationDays ?? null,
        isActive: condition.isActive,
        sortOrder: condition.sortOrder ?? null,
      });
    } else if (!conditionId) {
      form.reset({
        ...defaultConditionValues,
        name: prefilledName || "",
        code: prefilledName ? generateConditionCodeFromName(prefilledName) : "",
      });
    }
  }, [condition, conditionId, prefilledName, form]);

  // Update name field when prefilledName changes (for create new flow)
  useEffect(() => {
    if (!conditionId && prefilledName) {
      form.setValue("name", prefilledName);
      form.setValue("code", generateConditionCodeFromName(prefilledName));
    }
  }, [prefilledName, conditionId, form]);

  // Auto-generate code from name when name changes
  const watchName = form.watch("name");
  useEffect(() => {
    if (watchName && !conditionId) {
      const generatedCode = generateConditionCodeFromName(watchName);
      form.setValue("code", generatedCode, { shouldDirty: true });
    }
  }, [watchName, form, conditionId]);

  const onSubmit = async (data: DocumentTypeConditionFormData) => {
    setIsSubmitting(true);

    try {
      if (conditionId) {
        // Update existing condition
        await updateCondition({
          id: conditionId,
          name: data.name,
          code: data.code || undefined,
          description: data.description || undefined,
          isRequired: data.isRequired,
          relativeExpirationDays: data.relativeExpirationDays ?? undefined,
          isActive: data.isActive,
          sortOrder: data.sortOrder ?? undefined,
        });
        toast.success(t("updatedSuccess"));
        form.reset();
        onOpenChange(false);
        onSuccess?.();
      } else {
        // Create new condition
        const newConditionId = await createCondition({
          name: data.name,
          code: data.code || undefined,
          description: data.description || undefined,
          isRequired: data.isRequired,
          relativeExpirationDays: data.relativeExpirationDays ?? undefined,
          isActive: data.isActive,
          sortOrder: data.sortOrder ?? undefined,
        });

        toast.success(t("createdSuccess"));
        form.reset();
        onOpenChange(false);

        // If documentTypeId is provided, return the created condition data
        // so the parent can add it to pending links
        if (documentTypeId) {
          onSuccess?.({
            _id: newConditionId,
            name: data.name,
            code: data.code || undefined,
            description: data.description || undefined,
            isRequired: data.isRequired,
            relativeExpirationDays: data.relativeExpirationDays ?? undefined,
            isActive: data.isActive,
            sortOrder: data.sortOrder ?? undefined,
          });
        } else {
          onSuccess?.();
        }
      }
    } catch (error) {
      console.error("Error saving condition:", error);
      const errorMessage = error instanceof Error ? error.message : "";
      if (errorMessage.includes("already exists")) {
        toast.error(t("errorDuplicateCode"));
      } else {
        toast.error(conditionId ? t("errorUpdate") : t("errorCreate"));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const isEditMode = !!conditionId;

  return (
    <>
      <Dialog open={open} onOpenChange={handleUnsavedOpenChange}>
        <DialogContent
          className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto"
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>
              {isEditMode ? t("edit") : t("add")}
            </DialogTitle>
            <DialogDescription>
              {isEditMode
                ? t("editDescription")
                : documentTypeId
                  ? t("addAndLinkDescription")
                  : t("addDescription")}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("name")}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t("namePlaceholder")}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Description */}
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("description")}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t("descriptionPlaceholder")}
                        {...field}
                        value={field.value ?? ""}
                        rows={3}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Is Required */}
              <FormField
                control={form.control}
                name="isRequired"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>{t("isRequired")}</FormLabel>
                      <FormDescription>
                        {t("isRequiredDescription")}
                      </FormDescription>
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

              {/* Relative Expiration Days */}
              <FormField
                control={form.control}
                name="relativeExpirationDays"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("relativeExpirationDays")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder={t("relativeExpirationDaysPlaceholder")}
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(value ? parseInt(value, 10) : null);
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      {t("relativeExpirationDaysDescription")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Sort Order */}
              <FormField
                control={form.control}
                name="sortOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("sortOrder")}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder={t("sortOrderPlaceholder")}
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => {
                          const value = e.target.value;
                          field.onChange(value ? parseInt(value, 10) : null);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Is Active */}
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>{t("isActive")}</FormLabel>
                      <FormDescription>
                        {t("isActiveDescription")}
                      </FormDescription>
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

              <DialogFooter className="pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleUnsavedOpenChange(false)}
                >
                  {tCommon("cancel")}
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {isEditMode ? tCommon("save") : tCommon("create")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <UnsavedChangesDialog
        open={showUnsavedDialog}
        onOpenChange={setShowUnsavedDialog}
        onConfirm={handleConfirmClose}
        onCancel={handleCancelClose}
      />
    </>
  );
}
