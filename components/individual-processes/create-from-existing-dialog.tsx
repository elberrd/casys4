"use client";

import { useTranslations } from "next-intl";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";

interface SourceProcess {
  person: {
    fullName: string;
  } | null;
  processType?: {
    name: string;
  } | null;
}

interface CreateFromExistingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
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

  const handleConfirm = () => {
    onConfirm();
  };

  const candidateName = sourceProcess?.person?.fullName || "";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("createFromExistingTitle")}</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>
                {t("createFromExistingDescription", { candidateName })}
              </p>
              {sourceProcess?.processType && (
                <p className="text-sm text-muted-foreground">
                  <strong>{t("processType")}:</strong> {sourceProcess.processType.name}
                </p>
              )}
              <div className="flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-950 p-3 border border-amber-200 dark:border-amber-800">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-amber-900 dark:text-amber-100">
                  {t("createFromExistingWarning")}
                </p>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            {tCommon("cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading}
          >
            {isLoading ? t("createFromExistingConfirming") : t("createFromExistingConfirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
