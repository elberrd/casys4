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
import { DataGrid } from "@/components/ui/data-grid";
import { ConsulateFormDialog } from "./consulate-form-dialog";

type Consulate = {
  _id: Id<"consulates">;
  _creationTime: number;
  name: string;
  cityId: Id<"cities">;
  address: string;
  phoneNumber: string;
  email: string;
  website?: string;
  city: { _id: Id<"cities">; name: string } | null;
  state: { _id: Id<"states">; name: string } | null;
  country: { _id: Id<"countries">; name: string } | null;
};

export function ConsulatesTable() {
  const t = useTranslations("Consulates");
  const tCommon = useTranslations("Common");

  const consulates = useQuery(api.consulates.list) ?? [];
  const removeConsulate = useMutation(api.consulates.remove);

  const [editingConsulate, setEditingConsulate] = useState<Id<"consulates"> | undefined>();
  const [deletingConsulate, setDeletingConsulate] = useState<Id<"consulates"> | undefined>();
  const [isFormOpen, setIsFormOpen] = useState(false);

  const handleDelete = async () => {
    if (!deletingConsulate) return;

    try {
      await removeConsulate({ id: deletingConsulate });
      toast.success(t("deletedSuccess"));
      setDeletingConsulate(undefined);
    } catch (error) {
      console.error("Error deleting consulate:", error);
      toast.error(t("errorDelete"));
    }
  };

  const columns: ColumnDef<Consulate>[] = [
    {
      accessorKey: "name",
      header: t("name"),
    },
    {
      id: "location",
      header: t("location"),
      cell: ({ row }) => {
        const city = row.original.city?.name || "";
        const state = row.original.state?.name || "";
        const country = row.original.country?.name || "";
        return `${city}, ${state}, ${country}`;
      },
    },
    {
      accessorKey: "address",
      header: t("address"),
    },
    {
      accessorKey: "phoneNumber",
      header: t("phoneNumber"),
    },
    {
      accessorKey: "email",
      header: t("email"),
    },
    {
      accessorKey: "website",
      header: t("website"),
      cell: ({ row }) => {
        const website = row.original.website;
        if (!website) return "-";
        return (
          <a
            href={website}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            {website}
          </a>
        );
      },
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const consulate = row.original;

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
                  setEditingConsulate(consulate._id);
                  setIsFormOpen(true);
                }}
              >
                <Pencil className="mr-2 h-4 w-4" />
                {tCommon("edit")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setDeletingConsulate(consulate._id)}
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
        data={consulates}
        searchColumn="name"
        searchPlaceholder={tCommon("search")}
        onCreateNew={() => {
          setEditingConsulate(undefined);
          setIsFormOpen(true);
        }}
        createButtonLabel={t("createTitle")}
      />

      <ConsulateFormDialog
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) {
            setEditingConsulate(undefined);
          }
        }}
        consulateId={editingConsulate}
      />

      <AlertDialog
        open={!!deletingConsulate}
        onOpenChange={(open) => !open && setDeletingConsulate(undefined)}
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
