"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { useTranslations } from "next-intl";
import { AlertTriangle, Building2, LoaderCircle } from "lucide-react";

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
import { Combobox } from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";
import { UserApplicantSelector } from "./user-applicant-selector";

interface SourceProcess {
  processTypeId?: Id<"processTypes">;
  legalFrameworkId?: Id<"legalFrameworks">;
  person: {
    fullName: string;
    givenNames?: string;
    middleName?: string;
    surname?: string;
  } | null;
  processType?: {
    _id: Id<"processTypes">;
    name: string;
  } | null;
  legalFramework?: {
    _id: Id<"legalFrameworks">;
    name: string;
  } | null;
  companyApplicant?: {
    _id: Id<"companies">;
    name: string;
  } | null;
  userApplicant?: {
    _id: Id<"people">;
    fullName: string;
    company?: {
      _id: Id<"companies">;
      name: string;
    } | null;
  } | null;
}

export interface CreateFromExistingSelection {
  processTypeId: Id<"processTypes">;
  legalFrameworkId: Id<"legalFrameworks">;
  userApplicantId?: Id<"people">;
  userApplicantCompanyId?: Id<"companies">;
}

interface CreateFromExistingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (selection: CreateFromExistingSelection) => void;
  sourceProcess?: SourceProcess;
  isLoading?: boolean;
}

export function CreateFromExistingDialog({
  open,
  onOpenChange,
  onConfirm,
  sourceProcess,
  isLoading = false,
}: CreateFromExistingDialogProps) {
  const t = useTranslations("IndividualProcesses");
  const tCommon = useTranslations("Common");

  const [selectedProcessTypeId, setSelectedProcessTypeId] = useState<
    Id<"processTypes"> | ""
  >("");
  const [selectedLegalFrameworkId, setSelectedLegalFrameworkId] = useState<
    Id<"legalFrameworks"> | ""
  >("");
  const [selectedUserApplicantId, setSelectedUserApplicantId] =
    useState<string>("");
  const [selectedUserApplicantCompanyId, setSelectedUserApplicantCompanyId] =
    useState<string>("");

  const processTypes = useQuery(
    api.processTypes.listActive,
    open ? {} : "skip",
  );
  const legalFrameworks = useQuery(
    api.processTypes.getLegalFrameworks,
    open && selectedProcessTypeId
      ? { processTypeId: selectedProcessTypeId }
      : "skip",
  );

  const sourceProcessTypeId =
    sourceProcess?.processTypeId ?? sourceProcess?.processType?._id;
  const sourceLegalFrameworkId =
    sourceProcess?.legalFrameworkId ?? sourceProcess?.legalFramework?._id;

  const processTypeOptions = useMemo(() => {
    const options = (processTypes ?? []).map((processType) => ({
      value: processType._id,
      label: processType.name,
    }));

    if (
      sourceProcess?.processType &&
      !options.some((option) => option.value === sourceProcess.processType!._id)
    ) {
      options.push({
        value: sourceProcess.processType._id,
        label: sourceProcess.processType.name,
      });
    }

    return options.sort((a, b) => a.label.localeCompare(b.label));
  }, [processTypes, sourceProcess]);

  const legalFrameworkOptions = useMemo(() => {
    const options = (legalFrameworks ?? []).flatMap((legalFramework) =>
      legalFramework
        ? [
            {
              value: legalFramework._id,
              label: legalFramework.name,
            },
          ]
        : [],
    );

    if (
      selectedProcessTypeId === sourceProcessTypeId &&
      sourceProcess?.legalFramework &&
      !options.some(
        (option) => option.value === sourceProcess.legalFramework!._id,
      )
    ) {
      options.push({
        value: sourceProcess.legalFramework._id,
        label: sourceProcess.legalFramework.name,
      });
    }

    return options.sort((a, b) => a.label.localeCompare(b.label));
  }, [
    legalFrameworks,
    selectedProcessTypeId,
    sourceProcess,
    sourceProcessTypeId,
  ]);

  // Restore every selection from the source each time this dialog is opened.
  useEffect(() => {
    if (!open || !sourceProcess) return;

    setSelectedProcessTypeId(sourceProcessTypeId ?? "");
    setSelectedLegalFrameworkId(sourceLegalFrameworkId ?? "");
    setSelectedUserApplicantId(sourceProcess.userApplicant?._id ?? "");
    setSelectedUserApplicantCompanyId(
      sourceProcess.userApplicant?.company?._id ?? "",
    );
  }, [open, sourceLegalFrameworkId, sourceProcess, sourceProcessTypeId]);

  const documentConfigurationChanged =
    Boolean(selectedProcessTypeId && selectedLegalFrameworkId) &&
    (selectedProcessTypeId !== sourceProcessTypeId ||
      selectedLegalFrameworkId !== sourceLegalFrameworkId);
  const canConfirm = Boolean(
    selectedProcessTypeId &&
      selectedLegalFrameworkId &&
      processTypes !== undefined &&
      legalFrameworks !== undefined,
  );

  const handleConfirm = () => {
    if (!selectedProcessTypeId || !selectedLegalFrameworkId) return;

    onConfirm({
      processTypeId: selectedProcessTypeId,
      legalFrameworkId: selectedLegalFrameworkId,
      userApplicantId: selectedUserApplicantId
        ? (selectedUserApplicantId as Id<"people">)
        : undefined,
      userApplicantCompanyId: selectedUserApplicantCompanyId
        ? (selectedUserApplicantCompanyId as Id<"companies">)
        : undefined,
    });
  };

  const candidateName = sourceProcess?.person?.fullName || "";

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isLoading) onOpenChange(nextOpen);
      }}
    >
      <DialogContent className="max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] overflow-hidden sm:max-w-xl">
        <DialogHeader className="mb-0">
          <DialogTitle>{t("createFromExistingTitle")}</DialogTitle>
          <DialogDescription className="break-words">
            {t("createFromExistingDescription", { candidateName })}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 space-y-5 overflow-y-auto pe-1">
          {sourceProcess?.companyApplicant && (
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <Building2 className="mt-0.5 size-4 shrink-0" />
              <span className="min-w-0 break-words">
                <strong className="font-medium text-foreground">
                  {t("companyApplicant")}:
                </strong>{" "}
                {sourceProcess.companyApplicant.name}
              </span>
            </div>
          )}

          <section className="space-y-3" aria-labelledby="new-process-details">
            <div className="space-y-1">
              <h3 id="new-process-details" className="text-sm font-medium">
                {t("createFromExistingProcessDetails")}
              </h3>
              <p className="text-sm text-muted-foreground">
                {t("createFromExistingProcessDetailsDescription")}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="min-w-0 space-y-2">
                <Label>{t("processType")}</Label>
                <Combobox
                  options={processTypeOptions}
                  value={selectedProcessTypeId || undefined}
                  ariaLabel={t("processType")}
                  onValueChange={(value) => {
                    if (!value) return;
                    setSelectedProcessTypeId(value);
                    if (value !== selectedProcessTypeId) {
                      setSelectedLegalFrameworkId("");
                    }
                  }}
                  placeholder={t("selectProcessType")}
                  searchPlaceholder={t("createFromExistingSearchProcessTypes")}
                  emptyText={t("createFromExistingNoProcessTypes")}
                  loading={processTypes === undefined}
                  disabled={isLoading}
                  showClearButton={false}
                  popoverModal
                  isolateListScroll
                />
              </div>

              <div className="min-w-0 space-y-2">
                <Label>{t("legalFramework")}</Label>
                <Combobox
                  options={legalFrameworkOptions}
                  value={selectedLegalFrameworkId || undefined}
                  ariaLabel={t("legalFramework")}
                  onValueChange={(value) => {
                    if (value) setSelectedLegalFrameworkId(value);
                  }}
                  placeholder={t("selectLegalFramework")}
                  searchPlaceholder={t(
                    "createFromExistingSearchLegalFrameworks",
                  )}
                  emptyText={t("createFromExistingNoLegalFrameworks")}
                  loading={Boolean(
                    selectedProcessTypeId && legalFrameworks === undefined,
                  )}
                  disabled={!selectedProcessTypeId || isLoading}
                  showClearButton={false}
                  popoverModal
                  isolateListScroll
                />
              </div>
            </div>
          </section>

          <div className="space-y-2">
            <Label>{t("createFromExistingSelectRequester")}</Label>
            <UserApplicantSelector
              value={selectedUserApplicantId}
              onChange={(value, companyId) => {
                setSelectedUserApplicantId(value);
                setSelectedUserApplicantCompanyId(companyId ?? "");
              }}
              disabled={isLoading}
            />
          </div>

          <div
            role="status"
            aria-live="polite"
            className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-950 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-100"
          >
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="space-y-1.5 text-sm">
              <p>{t("createFromExistingWarning")}</p>
              {documentConfigurationChanged && (
                <p className="font-medium">
                  {t("createFromExistingDocumentsMayDiffer")}
                </p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="border-t pt-4">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            {tCommon("cancel")}
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading || !canConfirm}>
            {isLoading && <LoaderCircle className="size-4 animate-spin" />}
            {isLoading
              ? t("createFromExistingConfirming")
              : t("createFromExistingConfirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
