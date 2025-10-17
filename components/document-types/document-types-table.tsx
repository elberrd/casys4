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
import { Badge } from "@/components/ui/badge";
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
import { DataGrid } from "@/components/ui/data-grid";
import { DocumentTypeFormDialog } from "./document-type-form-dialog";

type DocumentType = {
  _id: Id<"documentTypes">;
  _creationTime: number;
  name: string;
  code: string;
  category: string;
  description: string;
  isActive: boolean;
};

const getCategoryColor = (category: string) => {
  const colors: Record<string, string> = {
    Identity: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    Work: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    Education: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
    Financial: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
    Legal: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    Other: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300",
  };
  return colors[category] || colors.Other;
};

export function DocumentTypesTable() {
  const t = useTranslations("DocumentTypes");
  const tCommon = useTranslations("Common");

  const documentTypes = useQuery(api.documentTypes.list) ?? [];
  const removeDocumentType = useMutation(api.documentTypes.remove);

  const [editingDocumentType, setEditingDocumentType] = useState<Id<"documentTypes"> | undefined>();
  const [deletingDocumentType, setDeletingDocumentType] = useState<Id<"documentTypes"> | undefined>();
  const [isFormOpen, setIsFormOpen] = useState(false);

  const handleDelete = async () => {
    if (!deletingDocumentType) return;

    try {
      await removeDocumentType({ id: deletingDocumentType });
      toast.success(t("deletedSuccess"));
      setDeletingDocumentType(undefined);
    } catch (error) {
      console.error("Error deleting document type:", error);
      toast.error(t("errorDelete"));
    }
  };

  const columns: ColumnDef<DocumentType>[] = [
    {
      accessorKey: "name",
      header: t("name"),
      cell: ({ row }) => (
        <span className="font-medium">{row.original.name}</span>
      ),
    },
    {
      accessorKey: "code",
      header: t("code"),
      cell: ({ row }) => (
        <span className="font-mono font-medium">{row.original.code}</span>
      ),
    },
    {
      accessorKey: "category",
      header: t("category"),
      cell: ({ row }) => {
        const category = row.original.category;
        return (
          <Badge className={getCategoryColor(category)} variant="outline">
            {t(`category${category}` as any)}
          </Badge>
        );
      },
    },
    {
      accessorKey: "description",
      header: t("description"),
      cell: ({ row }) => {
        const description = row.original.description;
        const truncated =
          description.length > 60
            ? description.substring(0, 60) + "..."
            : description;
        return <span className="text-sm text-muted-foreground">{truncated}</span>;
      },
    },
    {
      accessorKey: "isActive",
      header: t("isActive"),
      cell: ({ row }) => {
        const isActive = row.original.isActive;
        return (
          <Badge variant={isActive ? "default" : "secondary"}>
            {isActive ? tCommon("active") : tCommon("inactive")}
          </Badge>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const documentType = row.original;

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
                  setEditingDocumentType(documentType._id);
                  setIsFormOpen(true);
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                {tCommon("edit")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setDeletingDocumentType(documentType._id)}
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
        data={documentTypes}
        searchColumn="name"
        searchPlaceholder={tCommon("search")}
        onCreateNew={() => {
          setEditingDocumentType(undefined);
          setIsFormOpen(true);
        }}
        createButtonLabel={t("createTitle")}
      />

      <DocumentTypeFormDialog
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) {
            setEditingDocumentType(undefined);
          }
        }}
        documentTypeId={editingDocumentType}
      />

      <AlertDialog
        open={!!deletingDocumentType}
        onOpenChange={(open) => !open && setDeletingDocumentType(undefined)}
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
