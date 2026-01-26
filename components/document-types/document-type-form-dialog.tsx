"use client";

import { useState, useEffect, useRef } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Plus } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { generateCategoryCodeFromName } from "@/lib/validations/documentCategories";
import {
  documentTypeSchema,
  commonFileTypes,
  DEFAULT_MAX_FILE_SIZE_MB,
  type DocumentTypeFormData,
} from "@/lib/validations/documentTypes";
import { UnsavedChangesDialog } from "@/components/ui/unsaved-changes-dialog";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import { LegalFrameworkAssociationSection } from "./legal-framework-association-section";
import { ConditionsSection, ConditionsSectionRef } from "./conditions-section";

interface DocumentTypeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentTypeId?: Id<"documentTypes">;
  onSuccess?: () => void;
}

/**
 * Generates a code/slug from a name string.
 * - Converts to uppercase
 * - Normalizes accented characters (é -> E, ç -> C, etc.)
 * - Replaces spaces with underscores
 * - Removes special characters (keeps only A-Z, 0-9, _)
 * - Removes consecutive underscores
 * - Trims underscores from start/end
 */
function generateCodeFromName(name: string): string {
  return name
    // Normalize unicode characters (NFD decomposes accented chars)
    .normalize("NFD")
    // Remove diacritical marks (accents)
    .replace(/[\u0300-\u036f]/g, "")
    // Convert to uppercase
    .toUpperCase()
    // Replace spaces and hyphens with underscores
    .replace(/[\s-]+/g, "_")
    // Remove any character that is not A-Z, 0-9, or underscore
    .replace(/[^A-Z0-9_]/g, "")
    // Replace multiple consecutive underscores with single underscore
    .replace(/_+/g, "_")
    // Remove leading/trailing underscores
    .replace(/^_+|_+$/g, "");
}

export function DocumentTypeFormDialog({
  open,
  onOpenChange,
  documentTypeId,
  onSuccess,
}: DocumentTypeFormDialogProps) {
  const t = useTranslations("DocumentTypes");
  const tCommon = useTranslations("Common");
  const tCategories = useTranslations("DocumentCategories");
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Track if user has manually edited the code field
  const [isCodeManuallyEdited, setIsCodeManuallyEdited] = useState(false);
  // Ref to the conditions section for applying changes on save
  const conditionsSectionRef = useRef<ConditionsSectionRef>(null);
  // State for inline category creation
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [categoryPopoverOpen, setCategoryPopoverOpen] = useState(false);
  const [pendingCategoryCode, setPendingCategoryCode] = useState<string | null>(null);

  const documentType = useQuery(
    api.documentTypes.getWithLegalFrameworks,
    documentTypeId ? { id: documentTypeId } : "skip"
  );

  // Query active document categories from database
  const documentCategories = useQuery(api.documentCategories.listActive, {}) ?? [];

  const createDocumentType = useMutation(api.documentTypes.create);
  const updateDocumentType = useMutation(api.documentTypes.update);
  const createCategory = useMutation(api.documentCategories.create);

  // Handle inline category creation
  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;

    try {
      setIsCreatingCategory(true);
      const code = generateCategoryCodeFromName(newCategoryName);
      await createCategory({
        name: newCategoryName,
        code,
        isActive: true,
      });
      toast.success(tCategories("createdSuccess"));
      // Store the code to be selected once the query refreshes
      setPendingCategoryCode(code);
      setNewCategoryName("");
      setCategoryPopoverOpen(false);
    } catch (error) {
      console.error("Error creating category:", error);
      const errorMessage = error instanceof Error ? error.message : "";
      if (errorMessage.includes("already exists")) {
        toast.error(tCategories("errorDuplicateCode"));
      } else {
        toast.error(tCategories("errorCreate"));
      }
    } finally {
      setIsCreatingCategory(false);
    }
  };

  const form = useForm<DocumentTypeFormData>({
    resolver: zodResolver(documentTypeSchema),
    defaultValues: {
      name: documentType?.name ?? "",
      code: documentType?.code ?? "",
      category: documentType?.category as any ?? "Other",
      description: documentType?.description ?? "",
      allowedFileTypes: documentType?.allowedFileTypes ?? [...commonFileTypes],
      maxFileSizeMB: documentType?.maxFileSizeMB ?? DEFAULT_MAX_FILE_SIZE_MB,
      isActive: documentType?.isActive ?? true,
      legalFrameworkAssociations: documentType?.legalFrameworkAssociations?.map((a) => ({
        legalFrameworkId: a.legalFrameworkId,
        isRequired: a.isRequired,
      })) ?? [],
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

  // Update form when documentType data loads
  useEffect(() => {
    if (documentType && documentTypeId) {
      form.reset({
        name: documentType.name,
        code: documentType.code,
        category: documentType.category as any,
        description: documentType.description,
        allowedFileTypes: documentType.allowedFileTypes ?? [...commonFileTypes],
        maxFileSizeMB: documentType.maxFileSizeMB ?? DEFAULT_MAX_FILE_SIZE_MB,
        isActive: documentType.isActive,
        legalFrameworkAssociations: documentType.legalFrameworkAssociations?.map((a) => ({
          legalFrameworkId: a.legalFrameworkId,
          isRequired: a.isRequired,
        })) ?? [],
      });
      // When editing, consider the code as manually set (don't auto-generate)
      setIsCodeManuallyEdited(true);
    }
  }, [documentType, documentTypeId, form]);

  // Reset manual edit flag when dialog opens for creating new document type
  useEffect(() => {
    if (open && !documentTypeId) {
      setIsCodeManuallyEdited(false);
    }
  }, [open, documentTypeId]);

  // Auto-select newly created category once it appears in the query results
  useEffect(() => {
    if (pendingCategoryCode && documentCategories.length > 0) {
      const categoryExists = documentCategories.some(
        (cat) => cat.code === pendingCategoryCode
      );
      if (categoryExists) {
        form.setValue("category", pendingCategoryCode, { shouldValidate: true });
        setPendingCategoryCode(null);
      }
    }
  }, [pendingCategoryCode, documentCategories, form]);

  const onSubmit = async (data: DocumentTypeFormData) => {
    try {
      setIsSubmitting(true);

      // Cast legal framework associations to proper types
      const associations = data.legalFrameworkAssociations?.map((a) => ({
        legalFrameworkId: a.legalFrameworkId as Id<"legalFrameworks">,
        isRequired: a.isRequired,
      }));

      if (documentTypeId) {
        await updateDocumentType({
          id: documentTypeId,
          name: data.name,
          code: data.code,
          category: data.category,
          description: data.description,
          allowedFileTypes: data.allowedFileTypes,
          maxFileSizeMB: data.maxFileSizeMB,
          isActive: data.isActive,
          legalFrameworkAssociations: associations,
        });

        // Apply pending condition changes
        if (conditionsSectionRef.current?.hasChanges()) {
          await conditionsSectionRef.current.applyChanges();
        }

        toast.success(t("updatedSuccess"));
      } else {
        await createDocumentType({
          name: data.name,
          code: data.code,
          category: data.category,
          description: data.description,
          allowedFileTypes: data.allowedFileTypes,
          maxFileSizeMB: data.maxFileSizeMB,
          isActive: data.isActive,
          legalFrameworkAssociations: associations,
        });
        toast.success(t("createdSuccess"));
      }

      form.reset();
      setIsCodeManuallyEdited(false);
      conditionsSectionRef.current?.resetChanges();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error saving document type:", error);
      const errorMessage = error instanceof Error ? error.message : "";
      if (errorMessage.includes("already exists")) {
        toast.error(t("errorDuplicateCode"));
      } else {
        toast.error(documentTypeId ? t("errorUpdate") : t("errorCreate"));
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
    <Dialog open={open} onOpenChange={handleUnsavedOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>
            {documentTypeId ? t("editTitle") : t("createTitle")}
          </DialogTitle>
          <DialogDescription>
            {documentTypeId
              ? "Edit the document type information below"
              : "Add a new document type to the system"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col min-h-0 flex-1">
            <div className="flex-1 min-h-0 overflow-y-auto pr-2 -mr-2 space-y-4">
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
                        if (!isCodeManuallyEdited && !documentTypeId) {
                          const generatedCode = generateCodeFromName(e.target.value);
                          form.setValue("code", generatedCode, { shouldValidate: true });
                        }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("code")}</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="PASSPORT"
                        className="font-mono uppercase"
                        onChange={(e) => {
                          // Mark as manually edited when user types in the code field
                          setIsCodeManuallyEdited(true);
                          const value = e.target.value.toUpperCase().replace(/\s+/g, "");
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
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("category")}</FormLabel>
                    <div className="flex gap-2">
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder={t("selectCategory")} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {documentCategories.map((category) => (
                            <SelectItem key={category._id} value={category.code}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Popover open={categoryPopoverOpen} onOpenChange={setCategoryPopoverOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            title={tCategories("createTitle")}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80" align="end">
                          <div className="space-y-3">
                            <h4 className="font-medium text-sm">{tCategories("createTitle")}</h4>
                            <Input
                              placeholder={tCategories("name")}
                              value={newCategoryName}
                              onChange={(e) => setNewCategoryName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  handleCreateCategory();
                                }
                              }}
                            />
                            <div className="flex justify-end gap-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setNewCategoryName("");
                                  setCategoryPopoverOpen(false);
                                }}
                              >
                                {tCommon("cancel")}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                onClick={handleCreateCategory}
                                disabled={isCreatingCategory || !newCategoryName.trim()}
                              >
                                {isCreatingCategory ? tCommon("loading") : tCommon("save")}
                              </Button>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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

            <Separator className="my-4" />

            {/* Legal Framework Associations Section */}
            <FormField
              control={form.control}
              name="legalFrameworkAssociations"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <LegalFrameworkAssociationSection
                      value={field.value || []}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Conditions Section - Only show in edit mode */}
            {documentTypeId && (
              <>
                <Separator className="my-4" />
                <ConditionsSection ref={conditionsSectionRef} documentTypeId={documentTypeId} />
              </>
            )}

            <Separator className="my-4" />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">{t("isActive")}</FormLabel>
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
            </div>

            <DialogFooter className="flex-shrink-0 pt-4">
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
