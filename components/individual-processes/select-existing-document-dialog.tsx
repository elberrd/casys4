"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { useTranslations } from "next-intl";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  FileText,
  Search,
  CheckCircle2,
  Clock,
  XCircle,
  Building2,
  FileQuestion,
  Link2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SelectExistingDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  individualProcessId: Id<"individualProcesses">;
  individualProcessStatusId?: Id<"individualProcessStatuses">;
  onSuccess?: () => void;
}

export function SelectExistingDocumentDialog({
  open,
  onOpenChange,
  individualProcessId,
  individualProcessStatusId,
  onSuccess,
}: SelectExistingDocumentDialogProps) {
  const t = useTranslations("DocumentChecklist");
  const tProc = useTranslations("IndividualProcesses");
  const [search, setSearch] = useState("");
  const [selectedStatusId, setSelectedStatusId] = useState<string>(
    individualProcessStatusId ?? ""
  );
  const [isLinking, setIsLinking] = useState(false);

  const effectiveStatusId = individualProcessStatusId ?? (selectedStatusId || undefined);

  const availableDocs = useQuery(
    api.documentsDelivered.listAvailableForLinking,
    {
      individualProcessId,
      excludeStatusId: effectiveStatusId as Id<"individualProcessStatuses"> | undefined,
    }
  );

  // If no fixed statusId, load statuses for the selector
  const statuses = useQuery(
    api.individualProcessStatuses.getStatusHistory,
    !individualProcessStatusId ? { individualProcessId } : "skip"
  );

  // Filter to exigencia statuses only for the selector
  const exigenciaStatuses = useMemo(() => {
    if (!statuses) return [];
    return statuses.filter((s) => s.caseStatus?.code === "exigencia");
  }, [statuses]);

  const linkToStatus = useMutation(api.documentsDelivered.linkToStatus);

  const filteredDocs = useMemo(() => {
    if (!availableDocs) return undefined;
    if (!search.trim()) return availableDocs;
    const lower = search.toLowerCase();
    return availableDocs.filter((doc) => {
      const name = doc.documentType?.name || doc.documentName || doc.fileName || "";
      return name.toLowerCase().includes(lower);
    });
  }, [availableDocs, search]);

  const handleSelect = async (docId: Id<"documentsDelivered">) => {
    if (!effectiveStatusId) return;
    setIsLinking(true);
    try {
      await linkToStatus({
        documentId: docId,
        individualProcessStatusId: effectiveStatusId as Id<"individualProcessStatuses">,
      });
      toast.success(t("selectExistingSuccess"));
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      toast.error(t("selectExistingError"));
    } finally {
      setIsLinking(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "rejected":
        return <XCircle className="h-4 w-4 text-destructive" />;
      case "uploaded":
      case "under_review":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <FileText className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("selectExisting")}</DialogTitle>
          <DialogDescription>
            {t("selectExistingDescription")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Status selector when no fixed statusId */}
          {!individualProcessStatusId && (
            <Select
              value={selectedStatusId}
              onValueChange={setSelectedStatusId}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("selectTargetStatus")} />
              </SelectTrigger>
              <SelectContent>
                {exigenciaStatuses.map((s) => (
                  <SelectItem key={s._id} value={s._id}>
                    {s.caseStatus?.name || s.statusName}
                    {s.date && ` - ${s.date}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("searchDocuments")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Documents list */}
          {filteredDocs === undefined ? (
            <div className="space-y-2">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">{t("noAvailableDocuments")}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredDocs.map((doc) => (
                <button
                  key={doc._id}
                  disabled={isLinking || !effectiveStatusId}
                  onClick={() => handleSelect(doc._id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg border bg-card p-3 text-left transition-colors hover:bg-accent/50",
                    isLinking && "opacity-50 cursor-not-allowed",
                    !effectiveStatusId && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {getStatusIcon(doc.status)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-snug [overflow-wrap:anywhere]">
                      {doc.documentType?.name || doc.documentName || doc.fileName || t("looseDocument")}
                    </p>
                    {doc.fileName && (
                      <p className="mt-0.5 text-xs text-muted-foreground [overflow-wrap:anywhere]">
                        {doc.fileName}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {doc.documentType?.isCompanyDocument && (
                      <Badge variant="secondary" className="text-xs gap-1">
                        <Building2 className="h-3 w-3" />
                      </Badge>
                    )}
                    {!doc.documentTypeId && (
                      <Badge variant="outline" className="text-xs gap-1">
                        <FileQuestion className="h-3 w-3" />
                      </Badge>
                    )}
                    {doc.linkedStatus && (
                      <Badge
                        variant="outline"
                        className="text-xs gap-1"
                        style={doc.linkedStatus.caseStatusColor ? {
                          borderColor: doc.linkedStatus.caseStatusColor,
                          color: doc.linkedStatus.caseStatusColor,
                        } : undefined}
                      >
                        <Link2 className="h-3 w-3" />
                        {doc.linkedStatus.caseStatusName}
                      </Badge>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
