"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { useTranslations } from "next-intl";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, XCircle } from "lucide-react";

interface RejectRequestDialogProps {
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

export function RejectRequestDialog({
  open,
  onOpenChange,
  requestId,
  requestInfo,
  onSuccess,
}: RejectRequestDialogProps) {
  const t = useTranslations("ProcessRequests");
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  const reject = useMutation(api.processRequests.reject);

  const handleReject = async () => {
    if (!requestId) return;

    if (!rejectionReason.trim()) {
      toast.error(t("rejectionReasonRequired"));
      return;
    }

    try {
      setIsRejecting(true);

      await reject({
        id: requestId,
        rejectionReason: rejectionReason.trim(),
      });

      toast.success(t("rejectedSuccess"));

      onOpenChange(false);
      setRejectionReason("");

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error rejecting process request:", error);
      toast.error(t("errorReject"));
    } finally {
      setIsRejecting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && !isRejecting) {
      setRejectionReason("");
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-destructive" />
            <DialogTitle>{t("rejectRequest")}</DialogTitle>
          </div>
          <DialogDescription className="text-left space-y-2">
            <p>{t("rejectConfirmation")}</p>
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
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="rejectionReason" className="text-base">
              {t("rejectionReason")}
              <span className="text-destructive ml-1">*</span>
            </Label>
            <Textarea
              id="rejectionReason"
              placeholder={t("rejectionReasonPlaceholder")}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
              disabled={isRejecting}
              className="resize-none"
            />
            <p className="text-sm text-muted-foreground">
              {t("rejectionReasonDescription")}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isRejecting}
          >
            {t("cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={handleReject}
            disabled={isRejecting || !rejectionReason.trim()}
          >
            {isRejecting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("reject")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
