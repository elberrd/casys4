"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { Search, Users, CheckSquare, Loader2, AlertCircle, UserPlus } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DatePicker } from "@/components/ui/date-picker";
import { Combobox } from "@/components/ui/combobox";

interface AddPeopleToCollectiveDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collectiveProcessId: Id<"collectiveProcesses">;
  onSuccess?: () => void;
}

type Person = {
  _id: Id<"people">;
  fullName: string;
  email?: string;
  cpf?: string;
};

type ProcessStep = "select" | "creating" | "complete";

interface CreationResult {
  successful: Id<"individualProcesses">[];
  failed: Array<{ personId: Id<"people">; reason: string }>;
  totalProcessed: number;
}

export function AddPeopleToCollectiveDialog({
  open,
  onOpenChange,
  collectiveProcessId,
  onSuccess,
}: AddPeopleToCollectiveDialogProps) {
  const t = useTranslations("AddPeopleToCollective");
  const tCommon = useTranslations("Common");

  // Fetch data
  const people = useQuery(api.people.list, {}) ?? [];
  const consulates = useQuery(api.consulates.list, {}) ?? [];
  const collectiveProcess = useQuery(api.collectiveProcesses.get, { id: collectiveProcessId });
  const caseStatuses = useQuery(api.caseStatuses.list, {}) ?? [];

  // State
  const [step, setStep] = useState<ProcessStep>("select");
  const [selectedPeople, setSelectedPeople] = useState<Set<Id<"people">>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [requestDate, setRequestDate] = useState(new Date().toISOString().split('T')[0]);
  const [consulateId, setConsulateId] = useState<Id<"consulates"> | undefined>(
    collectiveProcess?.consulateId ?? undefined
  );

  // Result state
  const [creationResult, setCreationResult] = useState<CreationResult | null>(null);

  const addPeopleToCollective = useMutation(api.collectiveProcesses.addPeopleToCollectiveProcess);

  // Get IDs of people already in this collective process
  const existingPersonIds = useMemo(() => {
    if (!collectiveProcess?.individualProcesses) return new Set<string>();
    return new Set(collectiveProcess.individualProcesses.map((ip) => ip.personId));
  }, [collectiveProcess]);

  // Filter people based on search and exclude already added
  const filteredPeople = useMemo(() => {
    return people.filter((person) => {
      // Exclude people already in the collective process
      if (existingPersonIds.has(person._id)) {
        return false;
      }

      // Search filter
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        person.fullName.toLowerCase().includes(searchLower) ||
        person.email?.toLowerCase().includes(searchLower) ||
        person.cpf?.toLowerCase().includes(searchLower);

      return matchesSearch;
    });
  }, [people, searchTerm, existingPersonIds]);

  // Consulate options for combobox
  const consulateOptions = useMemo(() => {
    return consulates.map((c) => ({
      value: c._id,
      label: c.city?.name ? `${c.city.name}${c.country?.name ? ` - ${c.country.name}` : ""}` : c.address || c._id,
    }));
  }, [consulates]);

  // Get initial case status (first by order number)
  const initialCaseStatus = useMemo(() => {
    const sorted = [...caseStatuses].sort((a, b) => (a.orderNumber || 0) - (b.orderNumber || 0));
    return sorted[0];
  }, [caseStatuses]);

  const handleTogglePerson = (personId: Id<"people">) => {
    const newSelection = new Set(selectedPeople);
    if (newSelection.has(personId)) {
      newSelection.delete(personId);
    } else {
      newSelection.add(personId);
    }
    setSelectedPeople(newSelection);
  };

  const handleCreate = async () => {
    if (selectedPeople.size === 0) {
      toast.error(t("noPeopleSelected"));
      return;
    }

    if (!requestDate) {
      toast.error(t("requestDateRequired"));
      return;
    }

    if (!consulateId) {
      toast.error(t("consulateRequired"));
      return;
    }

    if (!initialCaseStatus) {
      toast.error("No case status found");
      return;
    }

    setStep("creating");

    try {
      const result = await addPeopleToCollective({
        collectiveProcessId,
        personIds: Array.from(selectedPeople),
        requestDate,
        consulateId,
        caseStatusId: initialCaseStatus._id,
      });

      setCreationResult(result);
      setStep("complete");

      if (result.successful.length > 0) {
        toast.success(
          t("addSuccess", { count: result.successful.length })
        );
      }

      if (result.failed.length > 0) {
        toast.warning(
          t("addPartialSuccess", {
            successful: result.successful.length,
            total: result.totalProcessed,
          })
        );
      }

      if (result.successful.length > 0 && onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error adding people:", error);
      toast.error(t("addError"));
      setStep("select");
    }
  };

  const handleClose = () => {
    setStep("select");
    setSelectedPeople(new Set());
    setSearchTerm("");
    setRequestDate(new Date().toISOString().split('T')[0]);
    setConsulateId(collectiveProcess?.consulateId ?? undefined);
    setCreationResult(null);
    onOpenChange(false);
  };

  const renderSelectStep = () => (
    <div className="space-y-4">
      <Alert>
        <UserPlus className="h-4 w-4" />
        <AlertDescription>{t("description")}</AlertDescription>
      </Alert>

      {/* Date and Consulate fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="requestDate">
            {t("requestDate")} <span className="text-destructive">*</span>
          </Label>
          <DatePicker
            value={requestDate}
            onChange={(value) => setRequestDate(value || "")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="consulate">
            {t("consulate")} <span className="text-destructive">*</span>
          </Label>
          <Combobox
            options={consulateOptions}
            value={consulateId}
            onValueChange={(value) => setConsulateId(value as Id<"consulates">)}
            placeholder={t("selectConsulate")}
            searchPlaceholder={t("searchConsulate")}
            emptyText={t("noConsulateFound")}
          />
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t("searchPlaceholder")}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Selection summary */}
      <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-3">
        <Badge variant="secondary">
          {t("peopleSelected", { count: selectedPeople.size })}
        </Badge>
        <p className="text-sm text-muted-foreground">
          {filteredPeople.length} {t("peopleAvailable")}
        </p>
      </div>

      {/* People list */}
      <ScrollArea className="h-[300px] rounded-md border">
        <div className="p-4 space-y-2">
          {filteredPeople.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Users className="h-12 w-12 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">{t("noPeopleFound")}</p>
            </div>
          ) : (
            filteredPeople.map((person) => (
              <div
                key={person._id}
                className="flex items-center gap-3 rounded-lg border p-3 hover:bg-accent/50 transition-colors cursor-pointer"
                onClick={() => handleTogglePerson(person._id)}
              >
                <Checkbox
                  checked={selectedPeople.has(person._id)}
                  onCheckedChange={() => handleTogglePerson(person._id)}
                />
                <p className="font-medium truncate">{person.fullName}</p>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );

  const renderCreatingStep = () => (
    <div className="flex flex-col items-center justify-center py-12 space-y-4">
      <Loader2 className="h-12 w-12 animate-spin text-primary" />
      <div className="text-center space-y-2">
        <p className="text-lg font-medium">{t("creating")}</p>
        <p className="text-sm text-muted-foreground">{t("pleaseWait")}</p>
      </div>
    </div>
  );

  const renderCompleteStep = () => {
    if (!creationResult) return null;

    return (
      <div className="space-y-4">
        <div className="flex flex-col items-center justify-center py-6">
          <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center mb-4">
            <CheckSquare className="h-6 w-6 text-green-600 dark:text-green-400" />
          </div>
          <p className="text-lg font-medium">{t("createComplete")}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg border p-4 text-center">
            <p className="text-2xl font-bold text-green-600">
              {creationResult.successful.length}
            </p>
            <p className="text-sm text-muted-foreground">{t("successful")}</p>
          </div>
          <div className="rounded-lg border p-4 text-center">
            <p className="text-2xl font-bold text-red-600">
              {creationResult.failed.length}
            </p>
            <p className="text-sm text-muted-foreground">{t("failed")}</p>
          </div>
        </div>

        {creationResult.failed.length > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-medium mb-2">{t("failedCreations")}:</p>
              <ScrollArea className="h-32">
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {creationResult.failed.map((item, index) => {
                    const person = people.find((p) => p._id === item.personId);
                    return (
                      <li key={index}>
                        {person?.fullName || item.personId}: {item.reason}
                      </li>
                    );
                  })}
                </ul>
              </ScrollArea>
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("subtitle")}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {step === "select" && renderSelectStep()}
          {step === "creating" && renderCreatingStep()}
          {step === "complete" && renderCompleteStep()}
        </div>

        <DialogFooter>
          {step === "select" && (
            <>
              <Button variant="outline" onClick={handleClose}>
                {tCommon("cancel")}
              </Button>
              <Button
                onClick={handleCreate}
                disabled={selectedPeople.size === 0 || !requestDate || !consulateId}
              >
                {t("addPeople")} ({selectedPeople.size})
              </Button>
            </>
          )}
          {step === "complete" && (
            <Button onClick={handleClose}>{tCommon("close")}</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
