"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { DashboardPageHeader } from "@/components/dashboard-page-header";
import { NotesTable } from "@/components/notes/notes-table";
import { NoteFormDialog } from "@/components/notes/note-form-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, StickyNote, Calendar, User } from "lucide-react";
import { toast } from "sonner";

export function NotesClient() {
  const t = useTranslations("Notes");
  const tBreadcrumbs = useTranslations("Breadcrumbs");
  const tCommon = useTranslations("Common");

  // Get current user profile
  const userProfile = useQuery(api.userProfiles.getCurrentUser, {});

  const [activeTab, setActiveTab] = useState("all-notes");
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [selectedNoteId, setSelectedNoteId] = useState<Id<"notes"> | null>(null);

  // Fetch all notes
  const allNotes = useQuery(api.notes.listAll, {});

  // Mutations
  const deleteNote = useMutation(api.notes.remove);

  const breadcrumbs = [
    { label: tBreadcrumbs("dashboard"), href: "/dashboard" },
    { label: tBreadcrumbs("notes") },
  ];

  // Filter notes for "My Notes" tab
  const myNotes = useMemo(() => {
    if (!allNotes || !userProfile?.userId) return [];
    return allNotes.filter((note) => note.createdBy === userProfile.userId);
  }, [allNotes, userProfile]);

  // Calculate stats
  const stats = useMemo(() => {
    if (!allNotes || !userProfile?.userId) {
      return {
        totalNotes: 0,
        myNotes: 0,
        recentNotes: 0,
        notesThisMonth: 0,
      };
    }

    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const thisMonthStart = new Date();
    thisMonthStart.setDate(1);
    thisMonthStart.setHours(0, 0, 0, 0);

    return {
      totalNotes: allNotes.length,
      myNotes: allNotes.filter((note) => note.createdBy === userProfile.userId).length,
      recentNotes: allNotes.filter((note) => note.createdAt >= sevenDaysAgo).length,
      notesThisMonth: allNotes.filter((note) => note.createdAt >= thisMonthStart.getTime()).length,
    };
  }, [allNotes, userProfile]);

  const handleViewNote = (id: Id<"notes">) => {
    setSelectedNoteId(id);
    setNoteDialogOpen(true);
  };

  const handleDeleteNote = async (id: Id<"notes">) => {
    const confirmed = window.confirm(t("deleteNoteConfirm"));
    if (!confirmed) return;

    try {
      await deleteNote({ id });
      toast.success(t("noteDeleted"));
    } catch (error: any) {
      console.error("Failed to delete note:", error);
      toast.error(t("noteError"));
    }
  };

  const handleCreateNote = () => {
    setSelectedNoteId(null);
    setNoteDialogOpen(true);
  };

  const handleDialogClose = () => {
    setNoteDialogOpen(false);
    setSelectedNoteId(null);
  };

  // Display notes based on active tab
  const displayNotes = activeTab === "all-notes" ? allNotes : myNotes;

  return (
    <>
      <DashboardPageHeader breadcrumbs={breadcrumbs}>
        <Button onClick={handleCreateNote} className="gap-2">
          <Plus className="h-4 w-4" />
          {t("createNote")}
        </Button>
      </DashboardPageHeader>

      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("totalNotes")}
              </CardTitle>
              <StickyNote className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalNotes}</div>
              <p className="text-xs text-muted-foreground">
                {t("allNotes")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("myNotes")}
              </CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.myNotes}</div>
              <p className="text-xs text-muted-foreground">
                {t("createdBy")} {userProfile?.fullName}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("recentNotes")}
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.recentNotes}</div>
              <p className="text-xs text-muted-foreground">
                {tCommon("last7Days")}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t("notesThisMonth")}
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.notesThisMonth}</div>
              <p className="text-xs text-muted-foreground">
                {tCommon("currentMonth")}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Notes Table with Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="all-notes" className="gap-2">
                {t("allNotes")}
                <Badge variant="secondary" className="ml-1">
                  {stats.totalNotes}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="my-notes" className="gap-2">
                {t("myNotes")}
                <Badge variant="secondary" className="ml-1">
                  {stats.myNotes}
                </Badge>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="all-notes" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle>{t("allNotes")}</CardTitle>
                <CardDescription>
                  {t("description")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <NotesTable
                  notes={displayNotes || []}
                  onView={handleViewNote}
                  onRowClick={handleViewNote}
                  onDelete={handleDeleteNote}
                  isLoading={allNotes === undefined}
                  currentUserId={userProfile?.userId}
                  isAdmin={userProfile?.role === "admin"}
                  showSearch={true}
                  showColumnVisibility={true}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="my-notes" className="mt-0">
            <Card>
              <CardHeader>
                <CardTitle>{t("myNotes")}</CardTitle>
                <CardDescription>
                  {t("description")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <NotesTable
                  notes={displayNotes || []}
                  onView={handleViewNote}
                  onRowClick={handleViewNote}
                  onDelete={handleDeleteNote}
                  isLoading={allNotes === undefined}
                  currentUserId={userProfile?.userId}
                  isAdmin={userProfile?.role === "admin"}
                  showSearch={true}
                  showColumnVisibility={true}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Note Dialog (Create/Edit) */}
      <NoteFormDialog
        open={noteDialogOpen}
        onOpenChange={handleDialogClose}
        noteId={selectedNoteId || undefined}
      />
    </>
  );
}
