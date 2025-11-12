"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useTranslations } from "next-intl"
import { useCountryTranslation } from "@/lib/i18n/countries";
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
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { consulateSchema, type ConsulateFormData } from "@/lib/validations/consulates";

interface ConsulateFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  consulateId?: Id<"consulates">;
  onSuccess?: () => void;
}

export function ConsulateFormDialog({
  open,
  onOpenChange,
  consulateId,
  onSuccess,
}: ConsulateFormDialogProps) {
  const t = useTranslations("Consulates");
  const tCommon = useTranslations("Common");
  const getCountryName = useCountryTranslation();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const consulate = useQuery(
    api.consulates.get,
    consulateId ? { id: consulateId } : "skip"
  );
  const cities = useQuery(api.cities.listWithRelations, {}) ?? [];

  const createConsulate = useMutation(api.consulates.create);
  const updateConsulate = useMutation(api.consulates.update);

  const form = useForm<ConsulateFormData>({
    resolver: zodResolver(consulateSchema),
    defaultValues: {
      name: consulate?.name ?? "",
      cityId: consulate?.cityId ?? "",
      address: consulate?.address ?? "",
      phoneNumber: consulate?.phoneNumber ?? "",
      email: consulate?.email ?? "",
      website: consulate?.website ?? "",
    },
  });

  // Update form when consulate data loads
  if (consulate && form.getValues().name === "" && consulateId) {
    form.reset({
      name: consulate.name,
      cityId: consulate.cityId,
      address: consulate.address,
      phoneNumber: consulate.phoneNumber,
      email: consulate.email,
      website: consulate.website ?? "",
    });
  }

  const onSubmit = async (data: ConsulateFormData) => {
    try {
      setIsSubmitting(true);

      if (consulateId) {
        await updateConsulate({
          id: consulateId,
          name: data.name,
          cityId: data.cityId as Id<"cities">,
          address: data.address,
          phoneNumber: data.phoneNumber,
          email: data.email,
          website: data.website || undefined,
        });
        toast.success(t("updatedSuccess"));
      } else {
        await createConsulate({
          name: data.name,
          cityId: data.cityId as Id<"cities">,
          address: data.address,
          phoneNumber: data.phoneNumber,
          email: data.email,
          website: data.website || undefined,
        });
        toast.success(t("createdSuccess"));
      }

      form.reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error saving consulate:", error);
      toast.error(consulateId ? t("errorUpdate") : t("errorCreate"));
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

  const cityOptions = cities.map((city) => {
    const countryName = city.country ? (getCountryName(city.country.code) || city.country.name) : ""
    return {
      value: city._id,
      label: `${city.name}, ${city.state?.name || ""}, ${countryName}`,
    }
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {consulateId ? t("editTitle") : t("createTitle")}
          </DialogTitle>
          <DialogDescription>
            {consulateId
              ? "Edit the consulate information below"
              : "Add a new consulate to the system"}
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

            <FormField
              control={form.control}
              name="cityId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("city")}</FormLabel>
                  <FormControl>
                    <Combobox
                      options={cityOptions}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder={t("selectCity")}
                      searchPlaceholder={tCommon("search")}
                      emptyText={t("noResults")}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("address")}</FormLabel>
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
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("phoneNumber")}</FormLabel>
                    <FormControl>
                      <PhoneInput {...field} defaultCountry="BR" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("email")}</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("website")}</FormLabel>
                  <FormControl>
                    <Input type="url" {...field} />
                  </FormControl>
                  <FormMessage />
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
