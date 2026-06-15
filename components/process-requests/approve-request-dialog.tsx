"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
    candidate: string;
    processType: string;
  };
  /** Called with the newly created individual-process id on success. */
  onApproved?: (individualProcessId: Id<"individualProcesses">) => void;
}

export function ApproveRequestDialog({
  open,
  onOpenChange,
  requestId,
  requestInfo,
  onApproved,
}: ApproveRequestDialogProps) {
  const t = useTranslations("ProcessRequests");
  const router = useRouter();
  const [isApproving, setIsApproving] = useState(false);

  const approve = useMutation(api.processRequests.approve);

  const handleApprove = async () => {
    if (!requestId) return;

    try {
      setIsApproving(true);

      const individualProcessId = await approve({ id: requestId });

      toast.success(t("approved"), {
        action: {
          label: t("viewProcess"),
          onClick: () =>
            router.push(`/individual-processes/${individualProcessId}`),
        },
      });

      onOpenChange(false);
      onApproved?.(individualProcessId);
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
            <span className="block">{t("approveConfirm")}</span>
            {requestInfo && (
              <span className="mt-4 block space-y-2 text-sm bg-muted p-3 rounded-md">
                <span className="block">
                  <span className="font-medium">{t("company")}:</span>{" "}
                  {requestInfo.company}
                </span>
                <span className="block">
                  <span className="font-medium">{t("candidate")}:</span>{" "}
                  {requestInfo.candidate}
                </span>
                <span className="block">
                  <span className="font-medium">{t("processType")}:</span>{" "}
                  {requestInfo.processType}
                </span>
              </span>
            )}
            <span className="block text-muted-foreground">
              {t("approveDescription")}
            </span>
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
