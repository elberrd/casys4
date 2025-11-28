"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Id } from "@/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatDate } from "@/lib/format-field-value";
import {
  CheckCircle,
  XCircle,
  Clock,
  Calendar,
  Building2,
  User,
  MapPin,
  FileText,
  AlertCircle,
  ExternalLink,
} from "lucide-react";

interface ProcessRequest {
  _id: Id<"processRequests">;
  companyId: Id<"companies">;
  contactPersonId: Id<"people">;
  processTypeId: Id<"processTypes">;
  workplaceCityId: Id<"cities">;
  consulateId?: Id<"consulates">;
  isUrgent: boolean;
  requestDate: string;
  notes?: string;
  status: string;
  reviewedBy?: Id<"users">;
  reviewedAt?: number;
  rejectionReason?: string;
  approvedCollectiveProcessId?: Id<"collectiveProcesses">;
  createdBy: Id<"users">;
  createdAt: number;
  updatedAt: number;
  company: {
    name: string;
  } | null;
  contactPerson: {
    fullName: string;
  } | null;
  processType: {
    name: string;
  } | null;
  workplaceCity: {
    name: string;
  } | null;
  consulate: {
    city?: {
      name: string;
    } | null;
  } | null;
  reviewerProfile: {
    fullName: string;
  } | null;
  approvedCollectiveProcess: {
    referenceNumber: string;
  } | null;
}

interface RequestDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  request: ProcessRequest | null;
}

export function RequestDetailsDialog({
  open,
  onOpenChange,
  request,
}: RequestDetailsDialogProps) {
  const t = useTranslations("ProcessRequests");
  const router = useRouter();

  if (!request) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="secondary" className="gap-1">
            <Clock className="h-3 w-3" />
            {t("statusPending")}
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="default" className="gap-1 bg-green-600">
            <CheckCircle className="h-3 w-3" />
            {t("statusApproved")}
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive" className="gap-1">
            <XCircle className="h-3 w-3" />
            {t("statusRejected")}
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DialogTitle>{t("requestDetails")}</DialogTitle>
              {getStatusBadge(request.status)}
              {request.isUrgent && (
                <Badge variant="destructive" className="text-xs">
                  {t("urgent")}
                </Badge>
              )}
            </div>
          </div>
          <DialogDescription>
            {t("reference")}: #{request._id.slice(-8).toUpperCase()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">{t("basicInformation")}</h3>
            <div className="grid gap-3">
              <div className="flex items-start gap-3">
                <Building2 className="h-4 w-4 mt-1 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{t("company")}</p>
                  <p className="text-sm text-muted-foreground">
                    {request.company?.name || "-"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <FileText className="h-4 w-4 mt-1 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{t("processType")}</p>
                  <p className="text-sm text-muted-foreground">
                    {request.processType?.name || "-"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <User className="h-4 w-4 mt-1 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{t("contactPerson")}</p>
                  <p className="text-sm text-muted-foreground">
                    {request.contactPerson?.fullName || "-"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 mt-1 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{t("workplaceCity")}</p>
                  <p className="text-sm text-muted-foreground">
                    {request.workplaceCity?.name || "-"}
                  </p>
                </div>
              </div>
              {request.consulate && (
                <div className="flex items-start gap-3">
                  <Building2 className="h-4 w-4 mt-1 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">{t("consulate")}</p>
                    <p className="text-sm text-muted-foreground">
                      {request.consulate.city?.name || "-"}
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-3">
                <Calendar className="h-4 w-4 mt-1 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{t("requestDate")}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(request.requestDate)}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          {request.notes && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="font-semibold text-sm">{t("notes")}</h3>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {request.notes}
                </p>
              </div>
            </>
          )}

          {/* Review Information */}
          {(request.reviewedBy || request.rejectionReason) && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="font-semibold text-sm">{t("reviewInformation")}</h3>
                {request.reviewerProfile && (
                  <div className="flex items-start gap-3">
                    <User className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{t("reviewedBy")}</p>
                      <p className="text-sm text-muted-foreground">
                        {request.reviewerProfile.fullName}
                      </p>
                    </div>
                  </div>
                )}
                {request.reviewedAt && (
                  <div className="flex items-start gap-3">
                    <Calendar className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{t("reviewedAt")}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(request.reviewedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
                {request.rejectionReason && (
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-4 w-4 mt-1 text-destructive" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">{t("rejectionReason")}</p>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {request.rejectionReason}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Approved Main Process Link */}
          {request.status === "approved" && request.approvedCollectiveProcess && (
            <>
              <Separator />
              <div className="space-y-3">
                <h3 className="font-semibold text-sm">{t("approvedCollectiveProcess")}</h3>
                <div className="flex items-center justify-between bg-muted p-3 rounded-md">
                  <div>
                    <p className="text-sm font-medium">
                      {request.approvedCollectiveProcess.referenceNumber}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t("collectiveProcessCreated")}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      router.push(
                        `/collective-processes?id=${request.approvedCollectiveProcessId}`
                      );
                      onOpenChange(false);
                    }}
                  >
                    {t("viewProcess")}
                    <ExternalLink className="ml-2 h-3 w-3" />
                  </Button>
                </div>
              </div>
            </>
          )}

          {/* Timestamps */}
          <Separator />
          <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
            <div>
              <p className="font-medium">{t("createdAt")}</p>
              <p>{new Date(request.createdAt).toLocaleString()}</p>
            </div>
            <div>
              <p className="font-medium">{t("updatedAt")}</p>
              <p>{new Date(request.updatedAt).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
