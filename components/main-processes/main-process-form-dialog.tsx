"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  mainProcessSchema,
  type MainProcessFormData,
} from "@/lib/validations/main-processes";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { toast } from "sonner";
import { Loader2, RefreshCw } from "lucide-react";

interface MainProcessFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  processId?: Id<"mainProcesses">;
  defaultValues?: Partial<MainProcessFormData>;
  onSuccess?: () => void;
}

export function MainProcessFormDialog({
  open,
  onOpenChange,
  mode,
  processId,
  defaultValues,
  onSuccess,
}: MainProcessFormDialogProps) {
  const t = useTranslations("MainProcesses");
  const tCommon = useTranslations("Common");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Query data for form fields
  const companies = useQuery(api.companies.list, {});
  const people = useQuery(api.people.list, {});
  const processTypes = useQuery(api.processTypes.list, { isActive: true });
  const cities = useQuery(api.cities.list, {});
  const consulates = useQuery(api.consulates.list, {});

  // Get existing process data if editing
  const existingProcess = useQuery(
    api.mainProcesses.get,
    processId ? { id: processId } : "skip"
  );

  // Mutations
  const createProcess = useMutation(api.mainProcesses.create);
  const updateProcess = useMutation(api.mainProcesses.update);

  // Form setup
  const form = useForm<MainProcessFormData>({
    resolver: zodResolver(mainProcessSchema),
    defaultValues: {
      referenceNumber: "",
      companyId: "" as Id<"companies">,
      contactPersonId: "" as Id<"people">,
      processTypeId: "" as Id<"processTypes">,
      workplaceCityId: "" as Id<"cities">,
      consulateId: "",
      isUrgent: false,
      requestDate: new Date().toISOString().split("T")[0],
      notes: "",
      ...defaultValues,
    },
  });

  // Update form when existing process data loads
  useEffect(() => {
    if (mode === "edit" && existingProcess) {
      form.reset({
        referenceNumber: existingProcess.referenceNumber,
        companyId: existingProcess.companyId,
        contactPersonId: existingProcess.contactPersonId,
        processTypeId: existingProcess.processTypeId,
        workplaceCityId: existingProcess.workplaceCityId,
        consulateId: existingProcess.consulateId || "",
        isUrgent: existingProcess.isUrgent,
        requestDate: existingProcess.requestDate,
        notes: existingProcess.notes || "",
      });
    }
  }, [mode, existingProcess, form]);

  // Generate reference number
  const generateReferenceNumber = () => {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const referenceNumber = `MP-${timestamp}-${random}`;
    form.setValue("referenceNumber", referenceNumber);
  };

  const onSubmit = async (data: MainProcessFormData) => {
    try {
      setIsSubmitting(true);

      if (mode === "create") {
        // Validate required fields
        if (!data.companyId || data.companyId === "") {
          throw new Error("Company is required");
        }
        if (!data.contactPersonId || data.contactPersonId === "") {
          throw new Error("Contact person is required");
        }
        if (!data.processTypeId || data.processTypeId === "") {
          throw new Error("Process type is required");
        }
        if (!data.workplaceCityId || data.workplaceCityId === "") {
          throw new Error("Workplace city is required");
        }

        await createProcess({
          referenceNumber: data.referenceNumber,
          companyId: data.companyId,
          contactPersonId: data.contactPersonId,
          processTypeId: data.processTypeId,
          workplaceCityId: data.workplaceCityId,
          consulateId: data.consulateId === "" ? undefined : data.consulateId,
          isUrgent: data.isUrgent,
          requestDate: data.requestDate,
          notes: data.notes || undefined,
        });
        toast.success(t("createSuccess"));
      } else if (mode === "edit" && processId) {
        await updateProcess({
          id: processId,
          referenceNumber: data.referenceNumber,
          companyId: data.companyId === "" ? undefined : data.companyId,
          contactPersonId: data.contactPersonId === "" ? undefined : data.contactPersonId,
          processTypeId: data.processTypeId === "" ? undefined : data.processTypeId,
          workplaceCityId: data.workplaceCityId === "" ? undefined : data.workplaceCityId,
          consulateId: data.consulateId === "" ? undefined : data.consulateId,
          isUrgent: data.isUrgent,
          requestDate: data.requestDate,
          notes: data.notes || undefined,
        });
        toast.success(t("updateSuccess"));
      }

      onOpenChange(false);
      form.reset();

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error saving main process:", error);
      toast.error(mode === "create" ? t("createError") : t("updateError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLoading =
    !companies || !people || !processTypes || !cities || !consulates;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? t("createMainProcess") : t("editMainProcess")}
          </DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? t("createMainProcessDescription")
              : t("editMainProcessDescription")}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Reference Number */}
              <FormField
                control={form.control}
                name="referenceNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("referenceNumber")}</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input {...field} placeholder="MP-12345678-ABCD" />
                      </FormControl>
                      {mode === "create" && (
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={generateReferenceNumber}
                          title={t("generateReferenceNumber")}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <FormDescription>
                      {t("referenceNumberDescription")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Company */}
              <FormField
                control={form.control}
                name="companyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("company")}</FormLabel>
                    <FormControl>
                      <Combobox
                        value={field.value}
                        onValueChange={field.onChange}
                        options={companies.map((company) => ({
                          value: company._id,
                          label: company.name,
                        }))}
                        placeholder={t("selectCompany")}
                        searchPlaceholder={t("searchCompanies")}
                        emptyText={t("noCompaniesFound")}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Contact Person */}
              <FormField
                control={form.control}
                name="contactPersonId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("contactPerson")}</FormLabel>
                    <FormControl>
                      <Combobox
                        value={field.value}
                        onValueChange={field.onChange}
                        options={people.map((person) => ({
                          value: person._id,
                          label: person.fullName,
                        }))}
                        placeholder={t("selectContactPerson")}
                        searchPlaceholder={t("searchPeople")}
                        emptyText={t("noPeopleFound")}
                      />
                    </FormControl>
                    <FormDescription>
                      {t("contactPersonDescription")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Process Type */}
              <FormField
                control={form.control}
                name="processTypeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("processType")}</FormLabel>
                    <FormControl>
                      <Combobox
                        value={field.value}
                        onValueChange={field.onChange}
                        options={processTypes.map((type) => ({
                          value: type._id,
                          label: type.name,
                        }))}
                        placeholder={t("selectProcessType")}
                        searchPlaceholder={t("searchProcessTypes")}
                        emptyText={t("noProcessTypesFound")}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Workplace City */}
              <FormField
                control={form.control}
                name="workplaceCityId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("workplaceCity")}</FormLabel>
                    <FormControl>
                      <Combobox
                        value={field.value}
                        onValueChange={field.onChange}
                        options={cities.map((city) => ({
                          value: city._id,
                          label: city.name,
                        }))}
                        placeholder={t("selectWorkplaceCity")}
                        searchPlaceholder={t("searchCities")}
                        emptyText={t("noCitiesFound")}
                      />
                    </FormControl>
                    <FormDescription>
                      {t("workplaceCityDescription")}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Consulate (optional) */}
              <FormField
                control={form.control}
                name="consulateId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("consulate")} ({tCommon("optional")})
                    </FormLabel>
                    <FormControl>
                      <Combobox
                        value={field.value || ""}
                        onValueChange={field.onChange}
                        options={consulates.map((consulate) => ({
                          value: consulate._id,
                          label: consulate.name,
                        }))}
                        placeholder={t("selectConsulate")}
                        searchPlaceholder={t("searchConsulates")}
                        emptyText={t("noConsulatesFound")}
                      />
                    </FormControl>
                    <FormDescription>{t("consulateDescription")}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Request Date */}
              <FormField
                control={form.control}
                name="requestDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("requestDate")}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormDescription>{t("requestDateDescription")}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Is Urgent */}
              <FormField
                control={form.control}
                name="isUrgent"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">{t("isUrgent")}</FormLabel>
                      <FormDescription>{t("isUrgentDescription")}</FormDescription>
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

              {/* Notes */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {t("notes")} ({tCommon("optional")})
                    </FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t("notesPlaceholder")}
                        className="resize-none"
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>{t("notesDescription")}</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Dialog Footer */}
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSubmitting}
                >
                  {tCommon("cancel")}
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {mode === "create" ? tCommon("create") : tCommon("save")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
