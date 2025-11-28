"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { Search, Users, CheckSquare, Square, Loader2, AlertCircle } from "lucide-react";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Combobox } from "@/components/ui/combobox";

import { bulkCreateIndividualProcessesSchema } from "@/lib/validations/bulk-operations";

interface BulkCreateIndividualProcessDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collectiveProcessId: Id<"collectiveProcesses">;
  onSuccess?: () => void;
}

type Person = {
  _id: Id<"people">;
  _creationTime: number;
  fullName: string;
  email: string;
  cpf?: string;
  nationalityId: Id<"countries">;
  currentCityId?: Id<"cities">;
};

type ProcessStep = "select" | "configure" | "creating" | "complete";

interface CreationResult {
  successful: Id<"individualProcesses">[];
  failed: Array<{ personId: Id<"people">; reason: string }>;
  totalProcessed: number;
}

export function BulkCreateIndividualProcessDialog({
  open,
  onOpenChange,
  collectiveProcessId,
  onSuccess,
}: BulkCreateIndividualProcessDialogProps) {
  const t = useTranslations("BulkCreateProcess");
  const tCommon = useTranslations("Common");

  // Fetch data
  const people = useQuery(api.people.list, {}) ?? [];
  const legalFrameworks = useQuery(api.legalFrameworks.list, {}) ?? [];
  const cboCodes = useQuery(api.cboCodes.list, {}) ?? [];
  const countries = useQuery(api.countries.list, {}) ?? [];
  const cities = useQuery(api.cities.list, {}) ?? [];
  const caseStatuses = useQuery(api.caseStatuses.list, {}) ?? [];

  // State
  const [step, setStep] = useState<ProcessStep>("select");
  const [selectedPeople, setSelectedPeople] = useState<Set<Id<"people">>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [nationalityFilter, setNationalityFilter] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState<string>("all");

  // Form state
  const [legalFrameworkId, setLegalFrameworkId] = useState<Id<"legalFrameworks"> | undefined>();
  const [cboId, setCboId] = useState<Id<"cboCodes"> | undefined>();
  const [caseStatusId, setCaseStatusId] = useState<Id<"caseStatuses"> | undefined>();

  // Result state
  const [creationResult, setCreationResult] = useState<CreationResult | null>(null);

  const bulkCreateProcesses = useMutation(api.bulkOperations.bulkCreateIndividualProcesses);

  // Build country and city maps for display
  const countryMap = useMemo(() => {
    const map = new Map<Id<"countries">, string>();
    countries.forEach((c) => map.set(c._id, c.name));
    return map;
  }, [countries]);

  const cityMap = useMemo(() => {
    const map = new Map<Id<"cities">, string>();
    cities.forEach((c) => map.set(c._id, c.name));
    return map;
  }, [cities]);

  // Filter people based on search and filters
  const filteredPeople = useMemo(() => {
    return people.filter((person) => {
      // Search filter
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch =
        !searchTerm ||
        person.fullName.toLowerCase().includes(searchLower) ||
        person.email?.toLowerCase().includes(searchLower) ||
        person.cpf?.toLowerCase().includes(searchLower);

      // Nationality filter
      const matchesNationality =
        nationalityFilter === "all" || person.nationalityId === nationalityFilter;

      // City filter
      const matchesCity =
        cityFilter === "all" || person.currentCityId === cityFilter;

      return matchesSearch && matchesNationality && matchesCity;
    });
  }, [people, searchTerm, nationalityFilter, cityFilter]);

  // Get unique nationalities and cities for filters
  const uniqueNationalities = useMemo(() => {
    const nationalityIds = new Set(
      people.map((p) => p.nationalityId).filter((id): id is Id<"countries"> => id !== undefined)
    );
    return Array.from(nationalityIds)
      .map((id) => ({ id, name: countryMap.get(id) || "Unknown" }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [people, countryMap]);

  const uniqueCities = useMemo(() => {
    const cityIds = new Set(
      people.map((p) => p.currentCityId).filter((id): id is Id<"cities"> => id !== undefined)
    );
    return Array.from(cityIds)
      .map((id) => ({ id, name: cityMap.get(id) || "Unknown" }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [people, cityMap]);

  const handleTogglePerson = (personId: Id<"people">) => {
    const newSelection = new Set(selectedPeople);
    if (newSelection.has(personId)) {
      newSelection.delete(personId);
    } else {
      newSelection.add(personId);
    }
    setSelectedPeople(newSelection);
  };

  const handleSelectAll = () => {
    if (selectedPeople.size === filteredPeople.length) {
      setSelectedPeople(new Set());
    } else {
      setSelectedPeople(new Set(filteredPeople.map((p) => p._id)));
    }
  };

  const handleNext = () => {
    if (selectedPeople.size === 0) {
      toast.error(t("noPeopleSelected"));
      return;
    }
    setStep("configure");
  };

  const handleCreate = async () => {
    if (!legalFrameworkId) {
      toast.error(t("legalFrameworkRequired"));
      return;
    }

    // Validate with Zod
    const validation = bulkCreateIndividualProcessesSchema.safeParse({
      collectiveProcessId,
      personIds: Array.from(selectedPeople),
      legalFrameworkId,
      cboId,
      caseStatusId,
    });

    if (!validation.success) {
      toast.error(t("validationFailed"));
      console.error("Validation errors:", validation.error);
      return;
    }

    setStep("creating");

    try {
      const result = await bulkCreateProcesses(validation.data);

      setCreationResult(result);
      setStep("complete");

      if (result.successful.length > 0) {
        toast.success(
          t("createSuccess", {
            count: result.successful.length,
            total: result.totalProcessed,
          })
        );
      }

      if (result.failed.length > 0) {
        toast.warning(
          t("createPartialFailure", {
            failed: result.failed.length,
            total: result.totalProcessed,
          })
        );
      }

      if (result.successful.length > 0 && onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error creating processes:", error);
      toast.error(t("createError"));
      setStep("configure");
    }
  };

  const handleClose = () => {
    setStep("select");
    setSelectedPeople(new Set());
    setSearchTerm("");
    setNationalityFilter("all");
    setCityFilter("all");
    setLegalFrameworkId(undefined);
    setCboId(undefined);
    setCaseStatusId(undefined);
    setCreationResult(null);
    onOpenChange(false);
  };

  const renderSelectStep = () => (
    <div className="space-y-4">
      <Alert>
        <Users className="h-4 w-4" />
        <AlertDescription>{t("selectInstructions")}</AlertDescription>
      </Alert>

      {/* Search and filters */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("searchPlaceholder")}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="nationality-filter" className="text-xs">
              {t("filterByNationality")}
            </Label>
            <Select value={nationalityFilter} onValueChange={setNationalityFilter}>
              <SelectTrigger id="nationality-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allNationalities")}</SelectItem>
                {uniqueNationalities.map((nat) => (
                  <SelectItem key={nat.id} value={nat.id}>
                    {nat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="city-filter" className="text-xs">
              {t("filterByCity")}
            </Label>
            <Select value={cityFilter} onValueChange={setCityFilter}>
              <SelectTrigger id="city-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("allCities")}</SelectItem>
                {uniqueCities.map((city) => (
                  <SelectItem key={city.id} value={city.id}>
                    {city.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Selection summary and select all */}
      <div className="flex items-center justify-between rounded-lg border bg-muted/50 p-3">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSelectAll}
            className="h-8 gap-2"
          >
            {selectedPeople.size === filteredPeople.length ? (
              <CheckSquare className="h-4 w-4" />
            ) : (
              <Square className="h-4 w-4" />
            )}
            {t("selectAll")}
          </Button>
          <Badge variant="secondary">
            {selectedPeople.size} {t("selected")}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {filteredPeople.length} {t("peopleShown")}
        </p>
      </div>

      {/* People list */}
      <ScrollArea className="h-[400px] rounded-md border">
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
                className="flex items-start gap-3 rounded-lg border p-3 hover:bg-accent/50 transition-colors cursor-pointer"
                onClick={() => handleTogglePerson(person._id)}
              >
                <Checkbox
                  checked={selectedPeople.has(person._id)}
                  onCheckedChange={() => handleTogglePerson(person._id)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{person.fullName}</p>
                  <p className="text-sm text-muted-foreground truncate">{person.email}</p>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    {person.cpf && (
                      <Badge variant="outline" className="text-xs">
                        {person.cpf}
                      </Badge>
                    )}
                    {person.nationalityId && (
                      <Badge variant="outline" className="text-xs">
                        {countryMap.get(person.nationalityId) || "Unknown"}
                      </Badge>
                    )}
                    {person.currentCityId && (
                      <Badge variant="outline" className="text-xs">
                        {cityMap.get(person.currentCityId) || "Unknown"}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );

  const renderConfigureStep = () => {
    // Sort legal frameworks alphabetically
    const sortedLegalFrameworks = [...legalFrameworks].sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    // Sort CBO codes alphabetically by code
    const sortedCboCodes = [...cboCodes].sort((a, b) =>
      (a.code || "").localeCompare(b.code || "")
    );

    return (
      <div className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {t("configureInstructions", { count: selectedPeople.size })}
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="legal-framework">
              {t("legalFramework")} <span className="text-destructive">*</span>
            </Label>
            <Combobox
              options={sortedLegalFrameworks.map((framework) => ({
                value: framework._id,
                label: framework.name,
              }))}
              value={legalFrameworkId}
              onValueChange={(value) => setLegalFrameworkId(value as Id<"legalFrameworks">)}
              placeholder={t("selectLegalFramework")}
              searchPlaceholder="Search legal framework..."
              emptyText="No legal framework found"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cbo-code">{t("cboCode")}</Label>
            <Combobox
              options={[
                { value: "none", label: t("noCboCode") },
                ...sortedCboCodes.map((cbo) => ({
                  value: cbo._id,
                  label: `${cbo.code} - ${cbo.title}`,
                })),
              ]}
              value={cboId || "none"}
              onValueChange={(value) => setCboId(value === "none" ? undefined : value as Id<"cboCodes">)}
              placeholder={t("selectCboCode")}
              searchPlaceholder="Search CBO code..."
              emptyText="No CBO code found"
            />
          </div>

        <div className="space-y-2">
          <Label htmlFor="caseStatus">
            {t("initialStatus")} <span className="text-destructive">*</span>
          </Label>
          <Select value={caseStatusId} onValueChange={(value) => setCaseStatusId(value as Id<"caseStatuses">)}>
            <SelectTrigger id="caseStatus">
              <SelectValue placeholder={t("selectStatus")} />
            </SelectTrigger>
            <SelectContent>
              {caseStatuses.map((status) => (
                <SelectItem key={status._id} value={status._id}>
                  {status.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

        <div className="rounded-lg border bg-muted/50 p-4">
          <p className="text-sm font-medium mb-2">{t("summary")}</p>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>
              • {t("peopleCount")}: <strong>{selectedPeople.size}</strong>
            </li>
            <li>
              • {t("legalFramework")}:{" "}
              <strong>
                {legalFrameworkId
                  ? sortedLegalFrameworks.find((f) => f._id === legalFrameworkId)?.name
                  : t("notSelected")}
              </strong>
            </li>
            <li>
              • {t("cboCode")}:{" "}
              <strong>
                {cboId && cboId !== "none"
                  ? sortedCboCodes.find((c) => c._id === cboId)?.code
                  : t("none")}
              </strong>
            </li>
            <li>
              • {t("initialStatus")}: <strong>{status}</strong>
            </li>
          </ul>
        </div>
      </div>
    );
  };

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
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {step === "select" && renderSelectStep()}
          {step === "configure" && renderConfigureStep()}
          {step === "creating" && renderCreatingStep()}
          {step === "complete" && renderCompleteStep()}
        </div>

        <DialogFooter>
          {step === "select" && (
            <>
              <Button variant="outline" onClick={handleClose}>
                {tCommon("cancel")}
              </Button>
              <Button onClick={handleNext} disabled={selectedPeople.size === 0}>
                {tCommon("next")} ({selectedPeople.size})
              </Button>
            </>
          )}
          {step === "configure" && (
            <>
              <Button variant="outline" onClick={() => setStep("select")}>
                {tCommon("back")}
              </Button>
              <Button onClick={handleCreate} disabled={!legalFrameworkId}>
                {t("createProcesses")} ({selectedPeople.size})
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
