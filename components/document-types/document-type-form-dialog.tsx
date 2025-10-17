"use client";

import { useState } from "react";
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
import {
  documentTypeSchema,
  documentCategories,
  type DocumentTypeFormData,
} from "@/lib/validations/documentTypes";

interface DocumentTypeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentTypeId?: Id<"documentTypes">;
  onSuccess?: () => void;
}

export function DocumentTypeFormDialog({
  open,
  onOpenChange,
  documentTypeId,
  onSuccess,
}: DocumentTypeFormDialogProps) {
  const t = useTranslations("DocumentTypes");
  const tCommon = useTranslations("Common");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const documentType = useQuery(
    api.documentTypes.get,
    documentTypeId ? { id: documentTypeId } : "skip"
  );

  const createDocumentType = useMutation(api.documentTypes.create);
  const updateDocumentType = useMutation(api.documentTypes.update);

  const form = useForm<DocumentTypeFormData>({
    resolver: zodResolver(documentTypeSchema),
    defaultValues: {
      name: documentType?.name ?? "",
      code: documentType?.code ?? "",
      category: documentType?.category as any ?? "Other",
      description: documentType?.description ?? "",
      isActive: documentType?.isActive ?? true,
    },
  });

  // Update form when documentType data loads
  if (documentType && form.getValues().name === "" && documentTypeId) {
    form.reset({
      name: documentType.name,
      code: documentType.code,
      category: documentType.category as any,
      description: documentType.description,
      isActive: documentType.isActive,
    });
  }

  const onSubmit = async (data: DocumentTypeFormData) => {
    try {
      setIsSubmitting(true);

      if (documentTypeId) {
        await updateDocumentType({
          id: documentTypeId,
          name: data.name,
          code: data.code,
          category: data.category,
          description: data.description,
          isActive: data.isActive,
        });
        toast.success(t("updatedSuccess"));
      } else {
        await createDocumentType({
          name: data.name,
          code: data.code,
          category: data.category,
          description: data.description,
          isActive: data.isActive,
        });
        toast.success(t("createdSuccess"));
      }

      form.reset();
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

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      form.reset();
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("name")}</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t("selectCategory")} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {documentCategories.map((category) => (
                          <SelectItem key={category} value={category}>
                            {t(`category${category}` as any)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
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
  );
}
