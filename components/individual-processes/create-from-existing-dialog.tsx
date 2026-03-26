"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Building2 } from "lucide-react";
import { UserApplicantSelector } from "./user-applicant-selector";
import { Id } from "@/convex/_generated/dataModel";

interface SourceProcess {
  person: {
    fullName: string;
    givenNames?: string;
    middleName?: string;
    surname?: string;
  } | null;
  processType?: {
    name: string;
  } | null;
  companyApplicant?: {
    _id: string;
    name: string;
  } | null;
  userApplicant?: {
    _id: string;
    fullName: string;
    company?: {
      _id: string;
      name: string;
    } | null;
  } | null;
}

interface CreateFromExistingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (userApplicantId?: Id<"people">, userApplicantCompanyId?: Id<"companies">) => void;
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

  const [selectedUserApplicantId, setSelectedUserApplicantId] = useState<string>("");
  const [selectedUserApplicantCompanyId, setSelectedUserApplicantCompanyId] = useState<string>("");

  // Pre-populate with source process's current requester when dialog opens
  useEffect(() => {
    if (open && sourceProcess) {
      setSelectedUserApplicantId(sourceProcess.userApplicant?._id ?? "");
      setSelectedUserApplicantCompanyId(
        sourceProcess.userApplicant?.company?._id ?? ""
      );
    }
  }, [open, sourceProcess]);

  const handleConfirm = () => {
    onConfirm(
      selectedUserApplicantId ? (selectedUserApplicantId as Id<"people">) : undefined,
      selectedUserApplicantCompanyId ? (selectedUserApplicantCompanyId as Id<"companies">) : undefined,
    );
  };

  const candidateName = sourceProcess?.person?.fullName || "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("createFromExistingTitle")}</DialogTitle>
          <DialogDescription>
            {t("createFromExistingDescription", { candidateName })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {sourceProcess?.processType && (
            <p className="text-sm text-muted-foreground">
              <strong>{t("processType")}:</strong> {sourceProcess.processType.name}
            </p>
          )}

          {sourceProcess?.companyApplicant && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Building2 className="h-4 w-4 flex-shrink-0" />
              <span>
                <strong>{t("companyApplicant")}:</strong> {sourceProcess.companyApplicant.name}
              </span>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t("createFromExistingSelectRequester")}
            </label>
            <UserApplicantSelector
              value={selectedUserApplicantId}
              onChange={(value, companyId) => {
                setSelectedUserApplicantId(value);
                setSelectedUserApplicantCompanyId(companyId ?? "");
              }}
              disabled={isLoading}
            />
          </div>

          <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950 p-3 border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-amber-900 dark:text-amber-100">
              {t("createFromExistingWarning")}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            {tCommon("cancel")}
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading}>
            {isLoading ? t("createFromExistingConfirming") : t("createFromExistingConfirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
