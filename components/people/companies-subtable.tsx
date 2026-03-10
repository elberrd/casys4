"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Edit, Plus, Trash2 } from "lucide-react";
import { PersonCompanyFormDialog } from "@/components/people-companies/person-company-form-dialog";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { useDeleteConfirmation } from "@/hooks/use-delete-confirmation";
import { toast } from "sonner";

interface CompaniesSubtableProps {
  personId: Id<"people">;
  readonly?: boolean;
}

export function CompaniesSubtable({
  personId,
  readonly = false,
}: CompaniesSubtableProps) {
  const t = useTranslations("PeopleCompanies");
  const tCommon = useTranslations("Common");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRelationshipId, setEditingRelationshipId] = useState<
    Id<"peopleCompanies"> | undefined
  >();

  const companies = useQuery(api.peopleCompanies.listByPerson, { personId }) ?? [];
  const deleteRelationship = useMutation(api.peopleCompanies.remove);

  const deleteConfirmation = useDeleteConfirmation({
    onDelete: async (id: Id<"peopleCompanies">) => {
      try {
        await deleteRelationship({ id });
        toast.success(t("deletedSuccess"));
      } catch (error) {
        toast.error(t("errorDelete"));
      }
    },
    entityName: "company",
  });

  const handleEdit = (relationshipId: Id<"peopleCompanies">) => {
    setEditingRelationshipId(relationshipId);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingRelationshipId(undefined);
    setDialogOpen(true);
  };

  const handleSuccess = () => {
    setDialogOpen(false);
    setEditingRelationshipId(undefined);
  };

  const handleDelete = (id: Id<"peopleCompanies">, isCurrent?: boolean) => {
    if (isCurrent) {
      toast.error(t("cannotDeleteCurrent"));
      return;
    }
    deleteConfirmation.confirmDelete(id);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">{t("companies")}</CardTitle>
          {!readonly && (
            <Button type="button" size="sm" onClick={handleCreate} className="h-8 gap-1">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">{t("addCompany")}</span>
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {companies.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>{t("noCompanies")}</p>
              {!readonly && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCreate}
                  className="mt-4"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t("addFirstCompany")}
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("company")}</TableHead>
                    <TableHead className="hidden sm:table-cell">{t("email")}</TableHead>
                    <TableHead className="hidden md:table-cell">{t("role")}</TableHead>
                    <TableHead>{t("status")}</TableHead>
                    {!readonly && (
                      <TableHead className="w-24 text-right">
                        {tCommon("actions")}
                      </TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companies.map((rel) => (
                    <TableRow key={rel._id}>
                      <TableCell className="font-medium">
                        {rel.company?.name ?? "-"}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                        {rel.email ?? "-"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {rel.role || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={rel.isCurrent ? "success" : "secondary"}
                          className="text-xs"
                        >
                          {rel.isCurrent ? t("currentEmployment") : t("pastEmployment")}
                        </Badge>
                      </TableCell>
                      {!readonly && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleEdit(rel._id)}
                            >
                              <Edit className="h-4 w-4" />
                              <span className="sr-only">{tCommon("edit")}</span>
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleDelete(rel._id, rel.isCurrent)}
                            >
                              <Trash2 className="h-4 w-4" />
                              <span className="sr-only">
                                {tCommon("delete")}
                              </span>
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {typeof document !== "undefined" && createPortal(
        <>
          <PersonCompanyFormDialog
            open={dialogOpen}
            onOpenChange={setDialogOpen}
            relationshipId={editingRelationshipId}
            personId={personId}
            onSuccess={handleSuccess}
          />

          <DeleteConfirmationDialog
            open={deleteConfirmation.isOpen}
            onOpenChange={deleteConfirmation.handleCancel}
            onConfirm={deleteConfirmation.handleConfirm}
            isDeleting={deleteConfirmation.isDeleting}
            entityName="company"
          />
        </>,
        document.body
      )}
    </>
  );
}
