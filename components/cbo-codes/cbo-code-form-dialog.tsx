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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cboCodeSchema, type CboCodeFormData } from "@/lib/validations/cboCodes";

interface CboCodeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cboCodeId?: Id<"cboCodes">;
  onSuccess?: () => void;
}

export function CboCodeFormDialog({
  open,
  onOpenChange,
  cboCodeId,
  onSuccess,
}: CboCodeFormDialogProps) {
  const t = useTranslations("CboCodes");
  const tCommon = useTranslations("Common");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const cboCode = useQuery(
    api.cboCodes.get,
    cboCodeId ? { id: cboCodeId } : "skip"
  );

  const createCboCode = useMutation(api.cboCodes.create);
  const updateCboCode = useMutation(api.cboCodes.update);

  const form = useForm<CboCodeFormData>({
    resolver: zodResolver(cboCodeSchema),
    defaultValues: {
      code: cboCode?.code ?? "",
      title: cboCode?.title ?? "",
      description: cboCode?.description ?? "",
    },
  });

  // Update form when cboCode data loads
  if (cboCode && form.getValues().code === "" && cboCodeId) {
    form.reset({
      code: cboCode.code,
      title: cboCode.title,
      description: cboCode.description,
    });
  }

  const onSubmit = async (data: CboCodeFormData) => {
    try {
      setIsSubmitting(true);

      if (cboCodeId) {
        await updateCboCode({
          id: cboCodeId,
          code: data.code,
          title: data.title,
          description: data.description,
        });
        toast.success(t("updatedSuccess"));
      } else {
        await createCboCode({
          code: data.code,
          title: data.title,
          description: data.description,
        });
        toast.success(t("createdSuccess"));
      }

      form.reset();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error saving CBO code:", error);
      const errorMessage = error instanceof Error ? error.message : "";
      if (errorMessage.includes("already exists")) {
        toast.error(t("errorDuplicateCode"));
      } else {
        toast.error(cboCodeId ? t("errorUpdate") : t("errorCreate"));
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
            {cboCodeId ? t("editTitle") : t("createTitle")}
          </DialogTitle>
          <DialogDescription>
            {cboCodeId
              ? "Edit the CBO code information below"
              : "Add a new CBO code to the system"}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("code")}</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="2521-05"
                      className="font-mono"
                      maxLength={7}
                    />
                  </FormControl>
                  <FormDescription>{t("codeFormat")}</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("cboTitle")}</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
                  <FormLabel>{t("description")}</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={4} />
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
