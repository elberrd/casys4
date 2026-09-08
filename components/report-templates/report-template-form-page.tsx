"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  reportTemplateFormSchema,
  type ReportTemplateFormData,
} from "@/lib/validations/report-templates";
import {
  REPORT_VARIABLE_GROUP_IDS,
  REPORT_VARIABLES,
} from "@/lib/report-templates/variables";
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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ReportRichTextEditor } from "@/components/report-templates/report-rich-text-editor";
import type { ReportEditorVariableGroup } from "@/components/report-templates/report-rich-text-editor";

interface ReportTemplateFormPageProps {
  mode: "create" | "edit";
  templateId?: Id<"reportTemplates">;
}

export function ReportTemplateFormPage({
  mode,
  templateId,
}: ReportTemplateFormPageProps) {
  const t = useTranslations("ReportTemplates");
  const tCommon = useTranslations("Common");
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const documentTypes = useQuery(api.documentTypes.listActive, {});
  const existingTemplate = useQuery(
    api.reportTemplates.get,
    templateId ? { id: templateId } : "skip",
  );

  const createTemplate = useMutation(api.reportTemplates.create);
  const updateTemplate = useMutation(api.reportTemplates.update);

  const form = useForm<ReportTemplateFormData>({
    resolver: zodResolver(reportTemplateFormSchema),
    defaultValues: {
      name: "",
      description: "",
      contentHtml: "<p></p>",
      isActive: true,
      documentTypeIds: [],
    },
  });

  useEffect(() => {
    if (mode === "edit" && existingTemplate) {
      form.reset({
        name: existingTemplate.name,
        description: existingTemplate.description ?? "",
        contentHtml: existingTemplate.contentHtml,
        isActive: existingTemplate.isActive,
        documentTypeIds: existingTemplate.documentTypes.map(
          (documentType) => documentType._id,
        ),
      });
    }
  }, [mode, existingTemplate, form]);

  const variableGroups = useMemo<ReportEditorVariableGroup[]>(
    () =>
      REPORT_VARIABLE_GROUP_IDS.map((groupId) => ({
        id: groupId,
        label: t(`groups.${groupId}`),
        variables: REPORT_VARIABLES.filter((variable) => variable.group === groupId).map(
          (variable) => ({
            key: variable.key,
            label: t(`variables.${variable.key}`),
          }),
        ),
      })),
    [t],
  );

  const getVariableLabel = (key: string) => {
    const match = REPORT_VARIABLES.find((variable) => variable.key === key);
    return match ? t(`variables.${match.key}`) : key;
  };

  const documentTypeOptions = useMemo(
    () =>
      (documentTypes ?? [])
        .filter((documentType) => documentType.isActive !== false)
        .map((documentType) => ({
          value: documentType._id,
          label: documentType.name,
        })),
    [documentTypes],
  );

  const onSubmit = async (data: ReportTemplateFormData) => {
    try {
      setIsSubmitting(true);
      const payload = {
        name: data.name,
        description: data.description || undefined,
        contentHtml: data.contentHtml,
        isActive: data.isActive,
        documentTypeIds: data.documentTypeIds as Id<"documentTypes">[],
      };

      if (mode === "create") {
        await createTemplate(payload);
        toast.success(t("createdSuccess"));
      } else if (templateId) {
        await updateTemplate({ id: templateId, ...payload });
        toast.success(t("updatedSuccess"));
      }
      router.push("/report-templates");
    } catch (error) {
      toast.error(
        mode === "create" ? t("errorCreate") : t("errorUpdate"),
        {
          description: error instanceof Error ? error.message : undefined,
        },
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (documentTypes === undefined || (mode === "edit" && existingTemplate === undefined)) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (mode === "edit" && existingTemplate === null) {
    return (
      <div className="py-12 text-center">
        <h2 className="text-2xl font-semibold">{t("notFound")}</h2>
        <Button className="mt-4" onClick={() => router.push("/report-templates")}>
          {t("backToList")}
        </Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold">
              {mode === "create" ? t("createTitle") : t("editTitle")}
            </h1>
            <p className="text-sm text-muted-foreground">{t("formDescription")}</p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/report-templates")}
            >
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {tCommon("save")}
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t("detailsTitle")}</CardTitle>
            <CardDescription>{t("detailsDescription")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("name")}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder={t("namePlaceholder")} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{tCommon("description")}</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder={t("descriptionPlaceholder")}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="documentTypeIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("linkedDocumentTypes")}</FormLabel>
                  <FormControl>
                    <Combobox
                      multiple
                      options={documentTypeOptions}
                      value={field.value as Id<"documentTypes">[]}
                      onValueChange={field.onChange}
                      placeholder={t("selectDocumentTypes")}
                      searchPlaceholder={tCommon("search")}
                      emptyText={t("noDocumentTypes")}
                    />
                  </FormControl>
                  <FormDescription>{t("linkedDocumentTypesHelp")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <FormLabel>{t("isActive")}</FormLabel>
                    <FormDescription>{t("isActiveHelp")}</FormDescription>
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

        <Card>
          <CardHeader>
            <CardTitle>{t("contentTitle")}</CardTitle>
            <CardDescription>{t("contentDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="contentHtml"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <ReportRichTextEditor
                      value={field.value}
                      onChange={field.onChange}
                      enableVariables
                      variableGroups={variableGroups}
                      getVariableLabel={getVariableLabel}
                      placeholder={t("editorPlaceholder")}
                      variablesLabel={t("insertVariable")}
                      variablesSearchPlaceholder={t("searchVariables")}
                      noVariablesFoundLabel={t("noVariablesFound")}
                      className="h-[min(78vh,920px)]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
      </form>
    </Form>
  );
}
