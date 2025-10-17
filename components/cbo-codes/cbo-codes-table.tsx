"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DataGrid } from "@/components/ui/data-grid";
import { CboCodeFormDialog } from "./cbo-code-form-dialog";

type CboCode = {
  _id: Id<"cboCodes">;
  _creationTime: number;
  code: string;
  title: string;
  description: string;
};

export function CboCodesTable() {
  const t = useTranslations("CboCodes");
  const tCommon = useTranslations("Common");

  const cboCodes = useQuery(api.cboCodes.list) ?? [];
  const removeCboCode = useMutation(api.cboCodes.remove);

  const [editingCboCode, setEditingCboCode] = useState<Id<"cboCodes"> | undefined>();
  const [deletingCboCode, setDeletingCboCode] = useState<Id<"cboCodes"> | undefined>();
  const [isFormOpen, setIsFormOpen] = useState(false);

  const handleDelete = async () => {
    if (!deletingCboCode) return;

    try {
      await removeCboCode({ id: deletingCboCode });
      toast.success(t("deletedSuccess"));
      setDeletingCboCode(undefined);
    } catch (error) {
      console.error("Error deleting CBO code:", error);
      toast.error(t("errorDelete"));
    }
  };

  const columns: ColumnDef<CboCode>[] = [
    {
      accessorKey: "code",
      header: t("code"),
      cell: ({ row }) => (
        <span className="font-mono font-medium">{row.original.code}</span>
      ),
    },
    {
      accessorKey: "title",
      header: t("cboTitle"),
    },
    {
      accessorKey: "description",
      header: t("description"),
      cell: ({ row }) => {
        const description = row.original.description;
        const truncated =
          description.length > 80
            ? description.substring(0, 80) + "..."
            : description;

        if (description.length > 80) {
          return (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="cursor-help">{truncated}</span>
                </TooltipTrigger>
                <TooltipContent className="max-w-md">
                  <p>{description}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          );
        }

        return <span>{description}</span>;
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const cboCode = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">{tCommon("moreActions")}</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{tCommon("actions")}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  setEditingCboCode(cboCode._id);
                  setIsFormOpen(true);
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                {tCommon("edit")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setDeletingCboCode(cboCode._id)}
                className="text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {tCommon("delete")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <>
      <DataGrid
        columns={columns}
        data={cboCodes}
        searchColumn="title"
        searchPlaceholder={tCommon("search")}
        onCreateNew={() => {
          setEditingCboCode(undefined);
          setIsFormOpen(true);
        }}
        createButtonLabel={t("createTitle")}
      />

      <CboCodeFormDialog
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) {
            setEditingCboCode(undefined);
          }
        }}
        cboCodeId={editingCboCode}
      />

      <AlertDialog
        open={!!deletingCboCode}
        onOpenChange={(open) => !open && setDeletingCboCode(undefined)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tCommon("delete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteConfirm")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              {tCommon("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
