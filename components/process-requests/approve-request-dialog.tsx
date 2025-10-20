"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { useTranslations } from "next-intl";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
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
import { toast } from "sonner";
import { Loader2, CheckCircle } from "lucide-react";

interface ApproveRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  requestId: Id<"processRequests"> | null;
  requestInfo?: {
    company: string;
    processType: string;
    contactPerson: string;
  };
  onSuccess?: () => void;
}

export function ApproveRequestDialog({
  open,
  onOpenChange,
  requestId,
  requestInfo,
  onSuccess,
}: ApproveRequestDialogProps) {
  const t = useTranslations("ProcessRequests");
  const [isApproving, setIsApproving] = useState(false);

  const approve = useMutation(api.processRequests.approve);

  const handleApprove = async () => {
    if (!requestId) return;

    try {
      setIsApproving(true);

      const mainProcessId = await approve({ id: requestId });

      toast.success(t("approvedSuccess"));

      onOpenChange(false);

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error approving process request:", error);
      toast.error(t("errorApprove"));
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <AlertDialogTitle>{t("approveRequest")}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-left space-y-2">
            <p>{t("approveConfirmation")}</p>
            {requestInfo && (
              <div className="mt-4 space-y-2 text-sm bg-muted p-3 rounded-md">
                <div>
                  <span className="font-medium">{t("company")}:</span>{" "}
                  {requestInfo.company}
                </div>
                <div>
                  <span className="font-medium">{t("processType")}:</span>{" "}
                  {requestInfo.processType}
                </div>
                <div>
                  <span className="font-medium">{t("contactPerson")}:</span>{" "}
                  {requestInfo.contactPerson}
                </div>
              </div>
            )}
            <p className="text-muted-foreground">{t("approveDescription")}</p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isApproving}>
            {t("cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleApprove}
            disabled={isApproving}
            className="bg-green-600 hover:bg-green-700"
          >
            {isApproving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("approve")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
