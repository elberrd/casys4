"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  processRequestSchema,
  type ProcessRequestFormData,
} from "@/lib/validations/process-requests";
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
import { Loader2 } from "lucide-react";

interface ProcessRequestFormPageProps {
  mode: "create";
  onSuccess?: () => void;
}

export function ProcessRequestFormPage({
  mode,
  onSuccess,
}: ProcessRequestFormPageProps) {
  const t = useTranslations("processRequests");
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get current user profile to check role and get companyId
  const currentUser = useQuery(api.userProfiles.getCurrentUser);

  // Query data for form fields
  const people = useQuery(api.people.list, {});
  const processTypes = useQuery(api.processTypes.list, { isActive: true });
  const cities = useQuery(api.cities.list, {});
  const consulates = useQuery(api.consulates.list, {});

  // Mutations
  const createRequest = useMutation(api.processRequests.create);

  // Form setup
  const form = useForm<ProcessRequestFormData>({
    resolver: zodResolver(processRequestSchema),
    defaultValues: {
      contactPersonId: "" as Id<"people">,
      processTypeId: "" as Id<"processTypes">,
      workplaceCityId: "" as Id<"cities">,
      consulateId: "",
      isUrgent: false,
      requestDate: new Date().toISOString().split("T")[0],
      notes: "",
    },
  });

  // Check if user is a client
  if (currentUser && currentUser.role !== "client") {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] gap-4">
        <p className="text-muted-foreground">{t("clientOnly")}</p>
        <Button onClick={() => router.push("/dashboard")}>
          {t("backToDashboard")}
        </Button>
      </div>
    );
  }

  // Loading state
  if (
    !currentUser ||
    !people ||
    !processTypes ||
    !cities ||
    !consulates
  ) {
    return (
      <div className="flex items-center justify-center h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Check if client has a company
  if (!currentUser.companyId) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] gap-4">
        <p className="text-muted-foreground">{t("noCompanyAssigned")}</p>
        <Button onClick={() => router.push("/dashboard")}>
          {t("backToDashboard")}
        </Button>
      </div>
    );
  }

  const onSubmit = async (data: ProcessRequestFormData) => {
    try {
      setIsSubmitting(true);

      await createRequest({
        contactPersonId: data.contactPersonId,
        processTypeId: data.processTypeId,
        workplaceCityId: data.workplaceCityId,
        consulateId: data.consulateId || undefined,
        isUrgent: data.isUrgent,
        requestDate: data.requestDate,
        notes: data.notes || undefined,
      });

      toast.success(t("createSuccess"));

      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/dashboard/process-requests");
      }
    } catch (error) {
      console.error("Error creating process request:", error);
      toast.error(t("createError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
              <FormDescription>{t("contactPersonDescription")}</FormDescription>
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
              <FormDescription>{t("processTypeDescription")}</FormDescription>
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
              <FormDescription>{t("workplaceCityDescription")}</FormDescription>
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
              <FormLabel>{t("consulate")} ({t("optional")})</FormLabel>
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
                <Switch checked={field.value} onCheckedChange={field.onChange} />
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
              <FormLabel>{t("notes")} ({t("optional")})</FormLabel>
              <FormControl>
                <Textarea
                  placeholder={t("notesPlaceholder")}
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormDescription>{t("notesDescription")}</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Form Actions */}
        <div className="flex gap-4">
          <Button
            type="submit"
            disabled={isSubmitting}
            className="flex-1"
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === "create" && t("submitRequest")}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            {t("cancel")}
          </Button>
        </div>
      </form>
    </Form>
    </div>
  );
}
