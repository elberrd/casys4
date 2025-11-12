"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useTranslations } from "next-intl"
import { useCountryTranslation } from "@/lib/i18n/countries";
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
import { PassportFormDialog } from "@/components/passports/passport-form-dialog";
import { DeleteConfirmationDialog } from "@/components/ui/delete-confirmation-dialog";
import { useDeleteConfirmation } from "@/hooks/use-delete-confirmation";
import { toast } from "sonner";

interface PassportsSubtableProps {
  personId: Id<"people">;
  readonly?: boolean;
}

function getStatusVariant(status: "Valid" | "Expiring Soon" | "Expired") {
  switch (status) {
    case "Valid":
      return "success";
    case "Expiring Soon":
      return "warning";
    case "Expired":
      return "destructive";
  }
}

export function PassportsSubtable({
  personId,
  readonly = false,
}: PassportsSubtableProps) {
  const t = useTranslations("Passports");
  const tCommon = useTranslations("Common");
  const getCountryName = useCountryTranslation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPassportId, setEditingPassportId] = useState<
    Id<"passports"> | undefined
  >();

  const passports = useQuery(api.passports.listByPerson, { personId }) ?? [];
  const deletePassport = useMutation(api.passports.remove);

  const deleteConfirmation = useDeleteConfirmation({
    onDelete: async (id: Id<"passports">) => {
      try {
        await deletePassport({ id });
        toast.success(t("deletedSuccess"));
      } catch (error) {
        toast.error(t("errorDelete"));
      }
    },
    entityName: "passport",
  });

  const handleEdit = (passportId: Id<"passports">) => {
    setEditingPassportId(passportId);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingPassportId(undefined);
    setDialogOpen(true);
  };

  const handleSuccess = () => {
    setDialogOpen(false);
    setEditingPassportId(undefined);
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg">{t("passports")}</CardTitle>
          {!readonly && (
            <Button size="sm" onClick={handleCreate} className="h-8 gap-1">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">{t("addPassport")}</span>
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {passports.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>{t("noPassports")}</p>
              {!readonly && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCreate}
                  className="mt-4"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t("addFirstPassport")}
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="hidden sm:table-cell">
                      {t("passportNumber")}
                    </TableHead>
                    <TableHead>{t("issuingCountry")}</TableHead>
                    <TableHead className="hidden md:table-cell">
                      {t("issueDate")}
                    </TableHead>
                    <TableHead className="hidden md:table-cell">
                      {t("expiryDate")}
                    </TableHead>
                    <TableHead>{t("status")}</TableHead>
                    <TableHead className="w-20">{t("active")}</TableHead>
                    {!readonly && (
                      <TableHead className="w-24 text-right">
                        {tCommon("actions")}
                      </TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {passports.map((passport) => (
                    <TableRow key={passport._id}>
                      <TableCell className="hidden sm:table-cell font-mono text-sm">
                        {passport.passportNumber}
                      </TableCell>
                      <TableCell>
                        {passport.issuingCountry ? (getCountryName(passport.issuingCountry.code) || passport.issuingCountry.name) : "-"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {passport.issueDate
                          ? new Date(passport.issueDate).toLocaleDateString()
                          : "-"}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                        {passport.expiryDate
                          ? new Date(passport.expiryDate).toLocaleDateString()
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {passport.status && (
                          <Badge
                            variant={getStatusVariant(passport.status)}
                            className="text-xs"
                          >
                            {t(`status${passport.status.replace(" ", "")}`)}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {passport.isActive && (
                          <Badge variant="default" className="text-xs">
                            {t("active")}
                          </Badge>
                        )}
                      </TableCell>
                      {!readonly && (
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleEdit(passport._id)}
                            >
                              <Edit className="h-4 w-4" />
                              <span className="sr-only">{tCommon("edit")}</span>
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() =>
                                deleteConfirmation.confirmDelete(passport._id)
                              }
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

      <PassportFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        passportId={editingPassportId}
        personId={personId}
        onSuccess={handleSuccess}
      />

      <DeleteConfirmationDialog
        open={deleteConfirmation.isOpen}
        onOpenChange={deleteConfirmation.handleCancel}
        onConfirm={deleteConfirmation.handleConfirm}
        isDeleting={deleteConfirmation.isDeleting}
        entityName="passport"
      />
    </>
  );
}
