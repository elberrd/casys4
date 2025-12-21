"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ProcessNotesSection } from "@/components/notes/process-notes-section";
import { Id } from "@/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useTranslations } from "next-intl";

interface IndividualProcessNotesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  individualProcessId?: Id<"individualProcesses">;
  currentUserId?: Id<"users">;
  isAdmin?: boolean;
}

export function IndividualProcessNotesModal({
  open,
  onOpenChange,
  individualProcessId,
  currentUserId,
  isAdmin = false,
}: IndividualProcessNotesModalProps) {
  const t = useTranslations("IndividualProcesses");

  // Get the individual process to show candidate name in the modal title
  const individualProcess = useQuery(
    api.individualProcesses.get,
    individualProcessId ? { id: individualProcessId } : "skip"
  );

  const candidateName = individualProcess?.person?.fullName || "...";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t("notesModalTitle", { candidateName })}
          </DialogTitle>
        </DialogHeader>
        <div className="mt-4">
          {individualProcessId && (
            <ProcessNotesSection
              individualProcessId={individualProcessId}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
