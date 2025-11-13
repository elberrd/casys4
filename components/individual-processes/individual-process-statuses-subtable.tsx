"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Combobox } from "@/components/ui/combobox";
import { Pencil, Save, X, Plus, FileEdit } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR, enUS } from "date-fns/locale";
import { AddStatusDialog } from "./add-status-dialog";
import { FillFieldsModal } from "./fill-fields-modal";

interface IndividualProcessStatusesSubtableProps {
  individualProcessId: Id<"individualProcesses">;
  userRole: "admin" | "client";
}

export function IndividualProcessStatusesSubtable({
  individualProcessId,
  userRole,
}: IndividualProcessStatusesSubtableProps) {
  const t = useTranslations("IndividualProcesses");
  const tCommon = useTranslations("Common");
  const locale = useLocale();
  const [editingId, setEditingId] = useState<Id<"individualProcessStatuses"> | null>(null);
  const [editDate, setEditDate] = useState("");
  const [editCaseStatusId, setEditCaseStatusId] = useState<Id<"caseStatuses"> | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [fillFieldsModalState, setFillFieldsModalState] = useState<{
    open: boolean;
    statusId: Id<"individualProcessStatuses"> | null;
  }>({ open: false, statusId: null });

  // Query status history
  const statuses = useQuery(api.individualProcessStatuses.getStatusHistory, {
    individualProcessId,
  });

  // Query active case statuses
  const caseStatuses = useQuery(api.caseStatuses.listActive);

  // Mutation to update status
  const updateStatus = useMutation(api.individualProcessStatuses.updateStatus);

  const isAdmin = userRole === "admin";

  const handleEditClick = (
    statusId: Id<"individualProcessStatuses">,
    currentDate?: string,
    currentCaseStatusId?: Id<"caseStatuses">
  ) => {
    setEditingId(statusId);
    setEditDate(currentDate || "");
    setEditCaseStatusId(currentCaseStatusId || null);
  };

  const handleSave = async (statusId: Id<"individualProcessStatuses">) => {
    try {
      // Validate date format
      if (editDate && !/^\d{4}-\d{2}-\d{2}$/.test(editDate)) {
        toast.error(t("invalidDate"));
        return;
      }

      await updateStatus({
        statusId,
        caseStatusId: editCaseStatusId ?? undefined,
        date: editDate || undefined,
      });

      toast.success(t("statusUpdated"));
      setEditingId(null);
      setEditDate("");
      setEditCaseStatusId(null);
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error(tCommon("error"));
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditDate("");
    setEditCaseStatusId(null);
  };

  if (!statuses) {
    return (
      <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
        {tCommon("loading")}
      </div>
    );
  }

  // Sort statuses by changedAt descending (most recent first)
  const sortedStatuses = [...statuses].sort((a, b) => b.changedAt - a.changedAt);

  // Date formatting helper
  const formatDateDisplay = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString;

      if (locale === "pt") {
        return format(date, "dd/MM/yyyy", { locale: ptBR });
      } else {
        return format(date, "MM/dd/yyyy", { locale: enUS });
      }
    } catch (error) {
      return dateString;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{t("statusHistory")}</h3>
          <p className="text-sm text-muted-foreground">{t("statusHistoryDescription")}</p>
        </div>
        {isAdmin && (
          <Button onClick={() => setShowAddDialog(true)} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            {t("addStatus")}
          </Button>
        )}
      </div>

      {sortedStatuses.length === 0 ? (
        <div className="rounded-md border p-8 text-center text-sm text-muted-foreground">
          {t("noStatusHistory")}
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("statusDate")}</TableHead>
                <TableHead>{t("status")}</TableHead>
                {isAdmin && <TableHead className="w-[100px]">{tCommon("actions")}</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedStatuses.map((status) => {
                const isEditing = editingId === status._id;
                const displayDate = status.date || new Date(status.changedAt).toISOString().split('T')[0];
                const caseStatusName = locale === "pt" ? status.caseStatus?.name : (status.caseStatus?.nameEn || status.caseStatus?.name);

                return (
                  <TableRow key={status._id}>
                    <TableCell>
                      {isEditing ? (
                        <div className="flex items-center gap-2">
                          <DatePicker
                            value={editDate}
                            onChange={(value) => setEditDate(value || "")}
                            className="h-8 w-[150px]"
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => handleSave(status._id)}
                          >
                            <Save className="h-4 w-4" />
                            <span className="sr-only">{tCommon("save")}</span>
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={handleCancelEdit}
                          >
                            <X className="h-4 w-4" />
                            <span className="sr-only">{tCommon("cancel")}</span>
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="text-sm">
                            {formatDateDisplay(displayDate)}
                          </span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {isEditing ? (
                        <Combobox
                          value={editCaseStatusId || status.caseStatusId}
                          onValueChange={(value) => setEditCaseStatusId((value as Id<"caseStatuses"> | undefined) || null)}
                          placeholder={t("selectStatus")}
                          searchPlaceholder={tCommon("search")}
                          emptyText={t("noResults")}
                          triggerClassName="h-8"
                          showClearButton={false}
                          options={
                            caseStatuses?.map((cs) => ({
                              value: cs._id,
                              label: locale === "pt" ? cs.name : (cs.nameEn || cs.name),
                            })) || []
                          }
                        />
                      ) : (
                        status.caseStatus ? (
                          <StatusBadge
                            status={caseStatusName || status.statusName}
                            type="individual_process"
                            color={status.caseStatus.color}
                            category={status.caseStatus.category}
                          />
                        ) : (
                          <StatusBadge
                            status={status.statusName}
                            type="individual_process"
                          />
                        )
                      )}
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        {!isEditing && (
                          <div className="flex items-center gap-1">
                            {/* Fill Fields button - shows when status has fillable fields */}
                            {((status.caseStatus?.fillableFields && status.caseStatus.fillableFields.length > 0) ||
                              (status.fillableFields && status.fillableFields.length > 0)) && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={() => setFillFieldsModalState({ open: true, statusId: status._id })}
                                title={t("fillFields")}
                              >
                                <FileEdit className="h-4 w-4 text-blue-600" />
                                <span className="sr-only">{t("fillFields")}</span>
                              </Button>
                            )}
                            {/* Edit button */}
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              onClick={() => handleEditClick(status._id, status.date, status.caseStatusId)}
                            >
                              <Pencil className="h-4 w-4" />
                              <span className="sr-only">{t("editStatus")}</span>
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {isAdmin && showAddDialog && (
        <AddStatusDialog
          individualProcessId={individualProcessId}
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
        />
      )}

      {/* Fill Fields Modal */}
      {fillFieldsModalState.open && fillFieldsModalState.statusId && (
        <FillFieldsModal
          individualProcessId={individualProcessId}
          statusId={fillFieldsModalState.statusId}
          open={fillFieldsModalState.open}
          onOpenChange={(open) => setFillFieldsModalState({ open, statusId: null })}
        />
      )}
    </div>
  );
}
