"use client";

import { Copy } from "lucide-react";
import { useFormContext } from "react-hook-form";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { cboActivityText, nextCboActivitiesOnSelection } from "@/lib/cbo-activities";
import type { IndividualProcessFormData } from "@/lib/validations/individualProcesses";

type CboOption = {
  _id: string;
  code?: string;
  title: string;
  activity?: string;
};

interface CboActivitiesFieldsProps {
  cboCodes: CboOption[];
}

export function CboActivitiesFields({ cboCodes }: CboActivitiesFieldsProps) {
  const t = useTranslations("IndividualProcesses");
  const { toast } = useToast();
  const form = useFormContext<IndividualProcessFormData>();

  const cboOptions = cboCodes.map((cbo) => ({
    value: cbo._id,
    label: cbo.code ? `${cbo.code} - ${cbo.title}` : cbo.title,
  }));

  const copyFromSelectedCbo = (cboId: string, overwrite: boolean) => {
    const selected = cboCodes.find((cbo) => cbo._id === cboId);
    const source = cboActivityText(selected);
    if (!source) {
      if (overwrite) toast({ title: t("cboActivitiesEmptySource"), variant: "destructive" });
      return;
    }
    if (overwrite) {
      form.setValue("cboActivities", source, {
        shouldDirty: true,
        shouldValidate: true,
      });
      toast({ title: t("cboActivitiesCopied") });
      return;
    }
    const next = nextCboActivitiesOnSelection({
      currentActivities: form.getValues("cboActivities"),
      nextCboActivity: source,
    });
    if (next) {
      form.setValue("cboActivities", next, {
        shouldDirty: true,
        shouldValidate: true,
      });
    }
  };

  return (
    <div className="space-y-4">
      <FormField
        control={form.control}
        name="cboId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("cbo")}</FormLabel>
            <div className="flex items-start gap-2">
              <FormControl className="min-w-0 flex-1">
                <Combobox
                  options={cboOptions}
                  value={field.value || ""}
                  onValueChange={(value) => {
                    const next = value ?? "";
                    field.onChange(next);
                    if (next) copyFromSelectedCbo(next, false);
                  }}
                  placeholder={t("selectCbo")}
                />
              </FormControl>
              {field.value ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-10 w-10 shrink-0"
                      title={t("copyCboActivities")}
                      onClick={() => copyFromSelectedCbo(field.value || "", true)}
                      aria-label={t("copyCboActivities")}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t("copyCboActivities")}</TooltipContent>
                </Tooltip>
              ) : null}
            </div>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="cboActivities"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("cboActivities")}</FormLabel>
            <FormControl>
              <Textarea
                {...field}
                rows={8}
                className="min-h-[180px] resize-y"
                placeholder={t("cboActivitiesPlaceholder")}
              />
            </FormControl>
            <FormDescription>{t("cboActivitiesHint")}</FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
