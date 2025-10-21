"use client";

import { useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  ColumnDef,
  RowSelectionState,
} from "@tanstack/react-table";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { FileIcon, Download, Edit, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DataGrid, DataGridContainer } from "@/components/ui/data-grid";
import { DataGridTable } from "@/components/ui/data-grid-table";
import { DataGridPagination } from "@/components/ui/data-grid-pagination";
import { DataGridColumnHeader } from "@/components/ui/data-grid-column-header";
import { DataGridFilter } from "@/components/ui/data-grid-filter";
import { DataGridColumnVisibility } from "@/components/ui/data-grid-column-visibility";
import { DataGridRowActions } from "@/components/ui/data-grid-row-actions";
import { DataGridBulkActions } from "@/components/ui/data-grid-bulk-actions";
import { DataGridHighlightedCell } from "@/components/ui/data-grid-highlighted-cell";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { createSelectColumn } from "@/lib/data-grid-utils";
import { globalFuzzyFilter } from "@/lib/fuzzy-search"
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog"
import { useDeleteConfirmation } from "@/hooks/use-delete-confirmation"
import { useBulkDeleteConfirmation } from "@/hooks/use-bulk-delete-confirmation";
import { formatBytes } from "@/hooks/use-file-upload";
import { DocumentFormDialog } from "./document-form-dialog";

type Document = {
  _id: Id<"documents">;
  _creationTime: number;
  name: string;
  documentType: {
    _id: Id<"documentTypes">;
    name: string;
    category: string;
  } | null;
  person: {
    _id: Id<"people">;
    fullName: string;
  } | null;
  company: {
    _id: Id<"companies">;
    name: string;
  } | null;
  storageId?: Id<"_storage">;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  notes?: string;
  issueDate?: string;
  expiryDate?: string;
  isActive: boolean;
};

export function DocumentsTable() {
  const t = useTranslations("Documents");
  const tCommon = useTranslations("Common");
  const router = useRouter();

  const documents = useQuery(api.documents.list, {}) ?? [];
  const removeDocument = useMutation(api.documents.remove);

  const [editingDocument, setEditingDocument] = useState<Id<"documents"> | undefined>();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})

  // Delete confirmation for single item
  const deleteConfirmation = useDeleteConfirmation({
    onDelete: async (id: Id<"documents">) => {
      await removeDocument({ id })
    },
    entityName: t("entityName"),
  })

  // Bulk delete confirmation for multiple items
  const bulkDeleteConfirmation = useBulkDeleteConfirmation({
    onDelete: async (item: Document) => {
      await removeDocument({ id: item._id })
    },
    onSuccess: () => {
      table.resetRowSelection()
    },
  });

  const columns = useMemo<ColumnDef<Document>[]>(
    () => [
      createSelectColumn<Document>(),
      {
        accessorKey: "name",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t("name")} />
        ),
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <FileIcon className="h-4 w-4 text-muted-foreground" />
            <DataGridHighlightedCell text={row.original.name} />
          </div>
        ),
      },
      {
        accessorKey: "documentType.name",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t("documentType")} />
        ),
        cell: ({ row }) => {
          const docType = row.original.documentType;
          return docType ? (
            <Badge variant="secondary" className="font-normal">
              {docType.name}
            </Badge>
          ) : (
            <span className="text-muted-foreground">-</span>
          );
        },
      },
      {
        accessorKey: "person.fullName",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t("person")} />
        ),
        cell: ({ row }) => {
          const person = row.original.person;
          return person ? (
            <DataGridHighlightedCell text={person.fullName} className="text-sm" />
          ) : (
            <span className="text-muted-foreground">-</span>
          );
        },
      },
      {
        accessorKey: "company.name",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t("company")} />
        ),
        cell: ({ row }) => {
          const company = row.original.company;
          return company ? (
            <DataGridHighlightedCell text={company.name} className="text-sm" />
          ) : (
            <span className="text-muted-foreground">-</span>
          );
        },
      },
      {
        accessorKey: "fileName",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t("file")} />
        ),
        cell: ({ row }) => {
          const doc = row.original;
          return doc.fileName ? (
            <div className="flex flex-col">
              <DataGridHighlightedCell
                text={doc.fileName}
                className="font-mono text-sm truncate max-w-[200px]"
              />
              {doc.fileSize && (
                <span className="text-xs text-muted-foreground">
                  {formatBytes(doc.fileSize)}
                </span>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground">-</span>
          );
        },
      },
      {
        accessorKey: "issueDate",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t("issueDate")} />
        ),
        cell: ({ row }) => {
          const date = row.original.issueDate;
          if (!date) return <span className="text-muted-foreground">-</span>;
          try {
            return <span className="text-sm">{format(new Date(date), "PP")}</span>;
          } catch {
            return <span className="text-sm">{date}</span>;
          }
        },
      },
      {
        accessorKey: "isActive",
        header: ({ column }) => (
          <DataGridColumnHeader column={column} title={t("isActive")} />
        ),
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
        header: () => <span className="sr-only">{tCommon("actions")}</span>,
        cell: ({ row }) => {
          const document = row.original;
          const actions = [
            ...(document.fileUrl ? [{
              label: t("download") || "Download",
              icon: <Download className="h-4 w-4" />,
              onClick: () => {
                if (document.fileUrl) {
                  window.open(document.fileUrl, "_blank");
                }
              },
              variant: "default" as const,
              separator: true,
            }] : []),
            {
              label: tCommon("edit"),
              icon: <Edit className="h-4 w-4" />,
              onClick: () => {
                setEditingDocument(document._id);
                setIsFormOpen(true);
              },
              variant: "default" as const,
            },
            {
              label: tCommon("delete"),
              icon: <Trash2 className="h-4 w-4" />,
              onClick: () => deleteConfirmation.confirmDelete(document._id),
              variant: "destructive" as const,
              separator: true,
            },
          ];

          return <DataGridRowActions actions={actions} />;
        },
        size: 50,
        enableSorting: false,
        enableHiding: false,
      },
    ],
    [t, tCommon]
  );

  const table = useReactTable({
    data: documents,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: globalFuzzyFilter,
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    state: {
      rowSelection,
    },
  });

  return (
    <>
      <DataGrid
        table={table}
        recordCount={documents.length}
        emptyMessage={t("noResults")}
        tableLayout={{
          columnsVisibility: true,
        }}
      >
        <div className="w-full space-y-2.5">
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2">
            <DataGridFilter table={table} className="w-full sm:max-w-sm" />
            <div className="flex gap-2">
              <DataGridColumnVisibility
                table={table}
                trigger={<Button variant="outline" size="sm" className="w-full sm:w-auto">Columns</Button>}
              />
              <Button
                onClick={() => router.push('/documents/new')}
                className="w-full sm:w-auto"
              >
                {t("createTitle")}
              </Button>
            </div>
          </div>
          <DataGridBulkActions
            table={table}
            actions={[
              {
                label: tCommon("deleteSelected"),
                icon: <Trash2 className="h-4 w-4" />,
                onClick: (selectedRows) => {
                  bulkDeleteConfirmation.confirmBulkDelete(selectedRows)
                },
                variant: "destructive",
              },
            ]}
          />
          <DataGridContainer>
            <ScrollArea>
              <DataGridTable />
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </DataGridContainer>
          <DataGridPagination />
        </div>
      </DataGrid>

      <DocumentFormDialog
        open={isFormOpen}
        onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) {
            setEditingDocument(undefined);
          }
        }}
        documentId={editingDocument}
      />

      <DeleteConfirmationDialog
        open={deleteConfirmation.isOpen}
        onOpenChange={deleteConfirmation.handleCancel}
        onConfirm={deleteConfirmation.handleConfirm}
        entityName={t("entityName")}
        isDeleting={deleteConfirmation.isDeleting}
      />

      <DeleteConfirmationDialog
        open={bulkDeleteConfirmation.isOpen}
        onOpenChange={bulkDeleteConfirmation.handleCancel}
        onConfirm={bulkDeleteConfirmation.handleConfirm}
        variant="bulk"
        count={bulkDeleteConfirmation.itemsToDelete.length}
        isDeleting={bulkDeleteConfirmation.isDeleting}
      />
    </>
  );
}
