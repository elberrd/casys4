"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  documentTemplateWithRequirementsSchema,
  type DocumentTemplateWithRequirementsFormData,
  FILE_FORMAT_OPTIONS,
} from "@/lib/validations/document-templates";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Combobox } from "@/components/ui/combobox";
import { MultiSelect } from "@/components/ui/multi-select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";

interface DocumentTemplateFormPageProps {
  mode: "create" | "edit";
  templateId?: Id<"documentTemplates">;
  onSuccess?: () => void;
}

export function DocumentTemplateFormPage({
  mode,
  templateId,
  onSuccess,
}: DocumentTemplateFormPageProps) {
  const t = useTranslations("DocumentTemplates");
  const tCommon = useTranslations("Common");
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Query data for form fields
  const processTypes = useQuery(api.processTypes.list, { isActive: true });
  const legalFrameworks = useQuery(api.legalFrameworks.list, {
    isActive: true,
  });
  const documentTypes = useQuery(api.documentTypes.list, { isActive: true });

  // Query existing template data if in edit mode
  const existingTemplate = useQuery(
    api.documentTemplates.get,
    templateId ? { id: templateId } : "skip"
  );

  // Mutations
  const createTemplate = useMutation(api.documentTemplates.create);
  const updateTemplate = useMutation(api.documentTemplates.update);

  // Form setup
  const form = useForm<DocumentTemplateWithRequirementsFormData>({
    resolver: zodResolver(documentTemplateWithRequirementsSchema),
    defaultValues:
      mode === "edit" && existingTemplate
        ? {
            template: {
              name: existingTemplate.name,
              description: existingTemplate.description,
              processTypeId: existingTemplate.processTypeId,
              legalFrameworkId: existingTemplate.legalFrameworkId || "",
              isActive: existingTemplate.isActive,
            },
            requirements: existingTemplate.requirements.map((req) => ({
              documentTypeId: req.documentTypeId,
              isRequired: req.isRequired,
              isCritical: req.isCritical,
              description: req.description,
              exampleUrl: req.exampleUrl || "",
              maxSizeMB: req.maxSizeMB,
              allowedFormats: req.allowedFormats,
              validityDays: req.validityDays,
              requiresTranslation: req.requiresTranslation,
              requiresNotarization: req.requiresNotarization,
              sortOrder: req.sortOrder,
            })),
          }
        : {
            template: {
              name: "",
              description: "",
              processTypeId: "" as Id<"processTypes">,
              legalFrameworkId: "",
              isActive: true,
            },
            requirements: [],
          },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "requirements",
  });

  // Loading state
  if (!processTypes || !legalFrameworks || !documentTypes) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // If in edit mode and template is loading
  if (mode === "edit" && !existingTemplate) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const onSubmit = async (data: DocumentTemplateWithRequirementsFormData) => {
    try {
      setIsSubmitting(true);

      if (mode === "create") {
        await createTemplate({
          name: data.template.name,
          description: data.template.description,
          processTypeId: data.template.processTypeId,
          legalFrameworkId: data.template.legalFrameworkId || undefined,
          isActive: data.template.isActive,
          requirements: data.requirements.map((req, index) => ({
            documentTypeId: req.documentTypeId as Id<"documentTypes">,
            isRequired: req.isRequired,
            isCritical: req.isCritical,
            description: req.description,
            exampleUrl: req.exampleUrl || undefined,
            maxSizeMB: req.maxSizeMB,
            allowedFormats: req.allowedFormats,
            validityDays: req.validityDays,
            requiresTranslation: req.requiresTranslation,
            requiresNotarization: req.requiresNotarization,
            sortOrder: index,
          })),
        });

        toast.success(t("createSuccess"));
      } else if (templateId) {
        await updateTemplate({
          id: templateId,
          name: data.template.name,
          description: data.template.description,
          isActive: data.template.isActive,
        });

        toast.success(t("updateSuccess"));
      }

      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/document-templates");
      }
    } catch (error) {
      console.error("Error saving document template:", error);
      toast.error(mode === "create" ? t("createError") : t("updateError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const addRequirement = () => {
    append({
      documentTypeId: "" as Id<"documentTypes">,
      isRequired: true,
      isCritical: false,
      description: "",
      exampleUrl: "",
      maxSizeMB: 10,
      allowedFormats: ["pdf"],
      validityDays: undefined,
      requiresTranslation: false,
      requiresNotarization: false,
      sortOrder: fields.length,
    });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Settings Card */}
        <Card>
          <CardHeader>
            <CardTitle>{t("basicSettings")}</CardTitle>
            <CardDescription>{t("templateDescriptionDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Template Name */}
            <FormField
              control={form.control}
              name="template.name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("templateName")}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t("templateNamePlaceholder")}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {t("templateNameDescription")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Template Description */}
            <FormField
              control={form.control}
              name="template.description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("templateDescription")}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t("templateDescriptionPlaceholder")}
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {t("templateDescriptionDescription")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Process Type */}
            <FormField
              control={form.control}
              name="template.processTypeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("processType")}</FormLabel>
                  <FormControl>
                    <Combobox
                      value={field.value}
                      onChange={field.onChange}
                      options={processTypes.map((type) => ({
                        value: type._id,
                        label: type.name,
                      }))}
                      placeholder={t("selectProcessType")}
                      searchPlaceholder={t("searchProcessTypes")}
                      emptyText={t("noProcessTypesFound")}
                      disabled={mode === "edit"}
                    />
                  </FormControl>
                  <FormDescription>{t("processTypeDescription")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Legal Framework */}
            <FormField
              control={form.control}
              name="template.legalFrameworkId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("legalFramework")} ({tCommon("optional")})
                  </FormLabel>
                  <FormControl>
                    <Combobox
                      value={field.value || ""}
                      onChange={field.onChange}
                      options={legalFrameworks.map((framework) => ({
                        value: framework._id,
                        label: framework.name,
                      }))}
                      placeholder={t("selectLegalFramework")}
                      searchPlaceholder={t("searchLegalFrameworks")}
                      emptyText={t("noLegalFrameworksFound")}
                      disabled={mode === "edit"}
                    />
                  </FormControl>
                  <FormDescription>
                    {t("legalFrameworkDescription")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Is Active */}
            <FormField
              control={form.control}
              name="template.isActive"
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
          </CardContent>
        </Card>

        {/* Requirements Card */}
        {mode === "create" && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{t("requirementsSettings")}</CardTitle>
                  <CardDescription>
                    {fields.length === 0
                      ? t("noRequirements")
                      : `${fields.length} ${t("requirements").toLowerCase()}`}
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addRequirement}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t("addRequirement")}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {fields.map((field, index) => (
                <div key={field.id}>
                  {index > 0 && <Separator className="my-6" />}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold">
                        {t("requirementNumber", { number: index + 1 })}
                      </h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => remove(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>

                    {/* Document Type */}
                    <FormField
                      control={form.control}
                      name={`requirements.${index}.documentTypeId`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("documentType")}</FormLabel>
                          <FormControl>
                            <Combobox
                              value={field.value}
                              onChange={field.onChange}
                              options={documentTypes.map((type) => ({
                                value: type._id,
                                label: type.name,
                              }))}
                              placeholder={t("selectDocumentType")}
                              searchPlaceholder={t("searchDocumentTypes")}
                              emptyText={t("noDocumentTypesFound")}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Requirement Description */}
                    <FormField
                      control={form.control}
                      name={`requirements.${index}.description`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("requirementDescription")}</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder={t("requirementDescriptionPlaceholder")}
                              className="resize-none"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Flags Row */}
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name={`requirements.${index}.isRequired`}
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                              <FormLabel className="text-sm">
                                {t("isRequired")}
                              </FormLabel>
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

                      <FormField
                        control={form.control}
                        name={`requirements.${index}.isCritical`}
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                              <FormLabel className="text-sm">
                                {t("isCritical")}
                              </FormLabel>
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

                    {/* Additional Flags Row */}
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name={`requirements.${index}.requiresTranslation`}
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                              <FormLabel className="text-sm">
                                {t("requiresTranslation")}
                              </FormLabel>
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

                      <FormField
                        control={form.control}
                        name={`requirements.${index}.requiresNotarization`}
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                            <div className="space-y-0.5">
                              <FormLabel className="text-sm">
                                {t("requiresNotarization")}
                              </FormLabel>
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

                    {/* Max Size and Validity Days Row */}
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name={`requirements.${index}.maxSizeMB`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("maxSizeMB")}</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0.1"
                                max="100"
                                step="0.1"
                                {...field}
                                onChange={(e) =>
                                  field.onChange(parseFloat(e.target.value))
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name={`requirements.${index}.validityDays`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>
                              {t("validityDays")} ({tCommon("optional")})
                            </FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="1"
                                max="3650"
                                {...field}
                                value={field.value || ""}
                                onChange={(e) =>
                                  field.onChange(
                                    e.target.value
                                      ? parseInt(e.target.value)
                                      : undefined
                                  )
                                }
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Allowed Formats */}
                    <FormField
                      control={form.control}
                      name={`requirements.${index}.allowedFormats`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("allowedFormats")}</FormLabel>
                          <FormControl>
                            <MultiSelect
                              options={FILE_FORMAT_OPTIONS.map((format) => ({
                                label: format.label,
                                value: format.value,
                              }))}
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              placeholder={t("allowedFormatsDescription")}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Example URL */}
                    <FormField
                      control={form.control}
                      name={`requirements.${index}.exampleUrl`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            {t("exampleUrl")} ({tCommon("optional")})
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="url"
                              placeholder={t("exampleUrlPlaceholder")}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Form Actions */}
        <div className="flex gap-4">
          <Button type="submit" disabled={isSubmitting} className="flex-1">
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === "create" ? t("saveTemplate") : t("updateTemplate")}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            {tCommon("cancel")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
