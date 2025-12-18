"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, ChevronsUpDown } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface ChangeAuthorizationDialogProps {
  individualProcessId: Id<"individualProcesses">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChangeAuthorizationDialog({
  individualProcessId,
  open,
  onOpenChange,
}: ChangeAuthorizationDialogProps) {
  const t = useTranslations("CollectiveProcesses");
  const tCommon = useTranslations("Common");

  const [processTypeId, setProcessTypeId] = useState<Id<"processTypes"> | "">("");
  const [legalFrameworkId, setLegalFrameworkId] = useState<Id<"legalFrameworks"> | "">("");
  const [deadlineUnit, setDeadlineUnit] = useState<"years" | "months" | "days" | "">("");
  const [deadlineQuantity, setDeadlineQuantity] = useState<number | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [processTypeComboboxOpen, setProcessTypeComboboxOpen] = useState(false);
  const [legalFrameworkComboboxOpen, setLegalFrameworkComboboxOpen] = useState(false);

  // Query the individual process to get current values
  const individualProcess = useQuery(api.individualProcesses.get, { id: individualProcessId });

  // Query active process types
  const processTypes = useQuery(api.processTypes.listActive);

  // Query legal frameworks filtered by selected process type
  const filteredLegalFrameworks = useQuery(
    api.legalFrameworks.listByProcessType,
    processTypeId && processTypeId !== ""
      ? { processTypeId: processTypeId as Id<"processTypes"> }
      : "skip"
  );

  // Mutation to update authorization
  const updateAuthorization = useMutation(api.individualProcesses.updateAuthorizationForCollectiveGroup);

  // Load current values when dialog opens
  useEffect(() => {
    if (open && individualProcess) {
      console.log("🔍 Loading initial values:", {
        processTypeId: individualProcess.processTypeId,
        legalFrameworkId: individualProcess.legalFrameworkId,
        deadlineUnit: individualProcess.deadlineUnit,
        deadlineQuantity: individualProcess.deadlineQuantity,
      });

      // Set current values from the individual process
      setProcessTypeId(individualProcess.processTypeId || "");
      setLegalFrameworkId(individualProcess.legalFrameworkId || "");

      // Only set deadline unit if it's one of the allowed values
      const allowedUnits = ["years", "months", "days"];
      if (individualProcess.deadlineUnit && allowedUnits.includes(individualProcess.deadlineUnit)) {
        setDeadlineUnit(individualProcess.deadlineUnit as "years" | "months" | "days");
      } else {
        setDeadlineUnit("");
      }

      setDeadlineQuantity(individualProcess.deadlineQuantity);
    }
  }, [open, individualProcess]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setProcessTypeId("");
      setLegalFrameworkId("");
      setDeadlineUnit("");
      setDeadlineQuantity(undefined);
      setIsSubmitting(false);
    }
  }, [open]);

  const handleSubmit = async () => {
    // Validate at least one field is selected
    if (!processTypeId && !legalFrameworkId && !deadlineUnit) {
      toast.error(t("selectAtLeastOneField"));
      return;
    }

    // Validate deadline fields if unit is selected
    if (deadlineUnit && (!deadlineQuantity || deadlineQuantity <= 0)) {
      toast.error(t("invalidDeadlineQuantity"));
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await updateAuthorization({
        id: individualProcessId,
        processTypeId: processTypeId || undefined,
        legalFrameworkId: legalFrameworkId || undefined,
        deadlineUnit: deadlineUnit || undefined,
        deadlineQuantity: deadlineQuantity,
      });

      toast.success(t("authorizationUpdateSuccess", { count: result.affectedProcesses }));
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to update authorization:", error);
      toast.error(t("authorizationUpdateError"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("changeAuthorizationDialogTitle")}</DialogTitle>
          <DialogDescription>
            {t("changeAuthorizationDialogDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Authorization Type (processTypeId) */}
          <div className="space-y-2">
            <Label htmlFor="processType">{t("authorizationType")}</Label>
            <Popover open={processTypeComboboxOpen} onOpenChange={setProcessTypeComboboxOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={processTypeComboboxOpen}
                  className="w-full justify-between"
                >
                  {processTypeId
                    ? processTypes?.find((pt) => pt._id === processTypeId)?.name
                    : t("selectAuthorizationType")}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput placeholder={t("searchAuthorizationType")} />
                  <CommandList>
                    <CommandEmpty>{tCommon("noResults")}</CommandEmpty>
                    <CommandGroup>
                      {processTypes?.map((processType) => (
                        <CommandItem
                          key={processType._id}
                          value={processType.name}
                          onSelect={() => {
                            // Clear legal framework if changing to a different process type
                            if (processTypeId !== processType._id) {
                              setLegalFrameworkId("");
                            }
                            setProcessTypeId(processType._id);
                            setProcessTypeComboboxOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              processTypeId === processType._id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {processType.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Legal Support (legalFrameworkId) */}
          <div className="space-y-2">
            <Label htmlFor="legalFramework">{t("legalSupport")}</Label>
            <Popover
              open={legalFrameworkComboboxOpen}
              onOpenChange={setLegalFrameworkComboboxOpen}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={legalFrameworkComboboxOpen}
                  className="w-full justify-between"
                  disabled={!processTypeId}
                >
                  {legalFrameworkId
                    ? filteredLegalFrameworks?.find((lf) => lf._id === legalFrameworkId)?.name
                    : t("selectLegalSupport")}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command>
                  <CommandInput placeholder={t("searchLegalSupport")} />
                  <CommandList>
                    <CommandEmpty>{tCommon("noResults")}</CommandEmpty>
                    <CommandGroup>
                      {filteredLegalFrameworks?.map((legalFramework) => (
                        <CommandItem
                          key={legalFramework._id}
                          value={legalFramework.name}
                          onSelect={() => {
                            setLegalFrameworkId(legalFramework._id);
                            setLegalFrameworkComboboxOpen(false);
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              legalFrameworkId === legalFramework._id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          {legalFramework.name}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Deadline Fields */}
          <div className="space-y-2">
            <Label>{t("deadline")}</Label>
            <div className="grid grid-cols-2 gap-4">
              {/* Deadline Unit */}
              <div className="space-y-2">
                <Label htmlFor="deadlineUnit">{t("deadlineUnit")}</Label>
                <Select
                  value={deadlineUnit}
                  onValueChange={(value) => setDeadlineUnit(value as "years" | "months" | "days" | "")}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("selectDeadlineUnit")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="years">{t("deadlineUnits.years")}</SelectItem>
                    <SelectItem value="months">{t("deadlineUnits.months")}</SelectItem>
                    <SelectItem value="days">{t("deadlineUnits.days")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Deadline Quantity */}
              {deadlineUnit && (
                <div className="space-y-2">
                  <Label htmlFor="deadlineQuantity">{t("deadlineQuantity")}</Label>
                  <Input
                    id="deadlineQuantity"
                    type="number"
                    placeholder={t("enterDeadlineQuantity")}
                    value={deadlineQuantity ?? ""}
                    onChange={(e) => setDeadlineQuantity(e.target.value === "" ? undefined : e.target.valueAsNumber)}
                    min={1}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            {tCommon("cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? tCommon("saving") : tCommon("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
