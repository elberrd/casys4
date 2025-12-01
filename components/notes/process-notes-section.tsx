"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, StickyNote } from "lucide-react";
import { NotesTable } from "./notes-table";
import { NoteFormDialog } from "./note-form-dialog";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface ProcessNotesSectionProps {
  individualProcessId?: Id<"individualProcesses">;
  collectiveProcessId?: Id<"collectiveProcesses">;
  currentUserId?: Id<"users">;
  isAdmin?: boolean;
}

export function ProcessNotesSection({
  individualProcessId,
  collectiveProcessId,
  currentUserId,
  isAdmin = false,
}: ProcessNotesSectionProps) {
  const t = useTranslations("Notes");
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<Id<"notes"> | undefined>();

  // Query notes based on process type
  const notes = useQuery(
    api.notes.list,
    individualProcessId
      ? { individualProcessId }
      : collectiveProcessId
        ? { collectiveProcessId }
        : "skip"
  );

  const deleteNote = useMutation(api.notes.remove);

  const handleAddNote = () => {
    setEditingNoteId(undefined);
    setIsDialogOpen(true);
  };

  const handleEditNote = (noteId: Id<"notes">) => {
    setEditingNoteId(noteId);
    setIsDialogOpen(true);
  };

  const handleDeleteNote = async (noteId: Id<"notes">) => {
    try {
      await deleteNote({ id: noteId });
      toast({
        title: t("noteDeleted"),
      });
    } catch (error) {
      toast({
        title: t("noteError"),
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingNoteId(undefined);
  };

  const isLoading = notes === undefined;

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <StickyNote className="h-5 w-5" />
            {t("title")}
          </CardTitle>
          <Button onClick={handleAddNote} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            {t("addNote")}
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <NotesTable
              notes={notes || []}
              onEdit={handleEditNote}
              onDelete={handleDeleteNote}
              onRowClick={handleEditNote}
              isLoading={isLoading}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
            />
          )}
        </CardContent>
      </Card>

      <NoteFormDialog
        open={isDialogOpen}
        onOpenChange={handleDialogClose}
        noteId={editingNoteId}
        individualProcessId={individualProcessId}
        collectiveProcessId={collectiveProcessId}
        onSuccess={() => {
          // Notes will refresh automatically via Convex reactivity
        }}
      />
    </>
  );
}
