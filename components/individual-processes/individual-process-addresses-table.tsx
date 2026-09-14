"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery } from "convex/react";
import { Pencil, Plus, Star, Trash2 } from "lucide-react";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getAddressErrorMessage,
  IndividualProcessAddressDialog,
  type ProcessAddressRecord,
} from "@/components/individual-processes/individual-process-address-dialog";
import { formatCandidateAddress } from "@/lib/utils/candidate-address";
import { toast } from "sonner";

interface IndividualProcessAddressesTableProps {
  individualProcessId: Id<"individualProcesses">;
  canEdit: boolean;
  showHeader?: boolean;
}

export function IndividualProcessAddressesTable({
  individualProcessId,
  canEdit,
  showHeader = true,
}: IndividualProcessAddressesTableProps) {
  const t = useTranslations("IndividualProcesses");
  const tCommon = useTranslations("Common");
  const addresses = useQuery(api.individualProcessAddresses.listByProcess, {
    individualProcessId,
  });
  const ensureLegacyMigrated = useMutation(
    api.individualProcessAddresses.ensureLegacyMigrated,
  );
  const setCurrent = useMutation(api.individualProcessAddresses.setCurrent);
  const removeAddress = useMutation(api.individualProcessAddresses.remove);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAddress, setEditingAddress] =
    useState<ProcessAddressRecord | null>(null);
  const [deletingAddress, setDeletingAddress] =
    useState<ProcessAddressRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    void ensureLegacyMigrated({ individualProcessId }).catch(() => {
      // Legacy rows stay on the process until the next successful write.
    });
  }, [ensureLegacyMigrated, individualProcessId]);

  const currentCount = addresses?.filter((address) => address.isCurrent).length ?? 0;
  const missingCurrent =
    addresses !== undefined && addresses.length > 1 && currentCount === 0;

  const openCreate = () => {
    setEditingAddress(null);
    setDialogOpen(true);
  };

  const openEdit = (address: ProcessAddressRecord) => {
    setEditingAddress(address);
    setDialogOpen(true);
  };

  const handleSetCurrent = async (address: ProcessAddressRecord) => {
    try {
      await setCurrent({ id: address._id });
      toast.success(t("addresses.markedCurrentSuccess"));
    } catch (error) {
      toast.error(getAddressErrorMessage(error, t));
    }
  };

  const handleDelete = async () => {
    if (!deletingAddress) return;
    setIsDeleting(true);
    try {
      await removeAddress({ id: deletingAddress._id });
      toast.success(t("addresses.deletedSuccess"));
      setDeletingAddress(null);
    } catch (error) {
      toast.error(getAddressErrorMessage(error, t));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-3">
      {showHeader && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold">{t("addresses.title")}</h3>
            <p className="text-muted-foreground text-sm">
              {t("addresses.description")}
            </p>
          </div>
          {canEdit && (
            <Button type="button" size="sm" onClick={openCreate}>
              <Plus className="mr-1 h-4 w-4" />
              {t("addresses.add")}
            </Button>
          )}
        </div>
      )}

      {missingCurrent && (
        <p className="text-destructive text-sm">
          {t("errors.currentAddressRequired")}
        </p>
      )}

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("addresses.currentColumn")}</TableHead>
              <TableHead>{t("addresses.streetColumn")}</TableHead>
              <TableHead>{t("addresses.numberColumn")}</TableHead>
              <TableHead>{t("addresses.complementColumn")}</TableHead>
              <TableHead>{t("addresses.neighborhoodColumn")}</TableHead>
              <TableHead>{t("addresses.cityColumn")}</TableHead>
              <TableHead>{t("addresses.postalCodeColumn")}</TableHead>
              {canEdit && (
                <TableHead className="text-right">{tCommon("actions")}</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {addresses === undefined ? (
              <TableRow>
                <TableCell colSpan={canEdit ? 8 : 7} className="text-muted-foreground">
                  {tCommon("loading")}
                </TableCell>
              </TableRow>
            ) : addresses.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canEdit ? 8 : 7} className="text-muted-foreground">
                  {t("addresses.empty")}
                </TableCell>
              </TableRow>
            ) : (
              addresses.map((address) => (
                <TableRow key={address._id}>
                  <TableCell>
                    {address.isCurrent ? (
                      <Badge variant="success">{t("addresses.current")}</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-[220px] whitespace-normal">
                    {address.addressStreet ||
                      formatCandidateAddress(address) ||
                      "—"}
                  </TableCell>
                  <TableCell>{address.addressNumber || "—"}</TableCell>
                  <TableCell className="max-w-[160px] whitespace-normal">
                    {address.addressComplement || "—"}
                  </TableCell>
                  <TableCell>{address.addressNeighborhood || "—"}</TableCell>
                  <TableCell>
                    {[address.addressCity, address.addressStateCode]
                      .filter(Boolean)
                      .join(" - ") || "—"}
                  </TableCell>
                  <TableCell>{address.addressPostalCode || "—"}</TableCell>
                  {canEdit && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {!address.isCurrent && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            title={t("addresses.markCurrent")}
                            onClick={() => void handleSetCurrent(address)}
                          >
                            <Star className="h-4 w-4" />
                            <span className="sr-only">
                              {t("addresses.markCurrent")}
                            </span>
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title={tCommon("edit")}
                          onClick={() => openEdit(address)}
                        >
                          <Pencil className="h-4 w-4" />
                          <span className="sr-only">{tCommon("edit")}</span>
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title={tCommon("delete")}
                          onClick={() => setDeletingAddress(address)}
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">{tCommon("delete")}</span>
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {canEdit && !showHeader && (
        <Button type="button" variant="outline" size="sm" onClick={openCreate}>
          <Plus className="mr-1 h-4 w-4" />
          {t("addresses.add")}
        </Button>
      )}

      <IndividualProcessAddressDialog
        individualProcessId={individualProcessId}
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditingAddress(null);
        }}
        address={editingAddress}
      />

      <ConfirmationDialog
        open={Boolean(deletingAddress)}
        onOpenChange={(open) => {
          if (!open) setDeletingAddress(null);
        }}
        title={t("addresses.deleteTitle")}
        description={
          deletingAddress?.isCurrent && (addresses?.length ?? 0) > 1
            ? t("addresses.deleteCurrentDescription")
            : t("addresses.deleteDescription")
        }
        confirmText={tCommon("delete")}
        cancelText={tCommon("cancel")}
        variant="destructive"
        isLoading={isDeleting}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}
