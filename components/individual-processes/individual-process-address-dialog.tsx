"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CandidateAddressFields } from "@/components/individual-processes/candidate-address-fields";
import {
  EMPTY_CANDIDATE_ADDRESS_FORM,
  hasStructuredAddressContent,
  type CandidateAddressValue,
} from "@/lib/utils/candidate-address";
import { toast } from "sonner";

export type ProcessAddressRecord = {
  _id: Id<"individualProcessAddresses">;
  isCurrent: boolean;
  addressIsBrazil?: boolean;
  addressStreet?: string;
  addressNumber?: string;
  addressComplement?: string;
  addressNeighborhood?: string;
  addressCountryCode?: string;
  addressCountryName?: string;
  addressStateCode?: string;
  addressStateName?: string;
  addressCity?: string;
  addressPostalCode?: string;
};

function recordToValue(address: ProcessAddressRecord): CandidateAddressValue {
  return {
    addressIsBrazil: address.addressIsBrazil,
    addressStreet: address.addressStreet,
    addressNumber: address.addressNumber,
    addressComplement: address.addressComplement,
    addressNeighborhood: address.addressNeighborhood,
    addressCountryCode: address.addressCountryCode,
    addressCountryName: address.addressCountryName,
    addressStateCode: address.addressStateCode,
    addressStateName: address.addressStateName,
    addressCity: address.addressCity,
    addressPostalCode: address.addressPostalCode,
  };
}

const ADDRESS_ERROR_CODES = [
  "CURRENT_ADDRESS_REQUIRED",
  "MULTIPLE_CURRENT_ADDRESSES",
  "ADDRESS_FIELDS_REQUIRED",
] as const;

type AddressErrorCode = (typeof ADDRESS_ERROR_CODES)[number];

function isAddressErrorCode(value: string): value is AddressErrorCode {
  return (ADDRESS_ERROR_CODES as readonly string[]).includes(value);
}

function extractAddressErrorCode(error: unknown): AddressErrorCode | null {
  if (typeof error !== "object" || error === null) return null;

  const data = "data" in error ? error.data : undefined;
  if (typeof data === "string" && isAddressErrorCode(data)) {
    return data;
  }
  if (typeof data === "object" && data !== null && "code" in data) {
    const code = String((data as { code: unknown }).code);
    if (isAddressErrorCode(code)) return code;
  }

  if ("message" in error && typeof error.message === "string") {
    for (const code of ADDRESS_ERROR_CODES) {
      if (error.message.includes(code)) return code;
    }
  }

  return null;
}

export function getAddressErrorMessage(
  error: unknown,
  t: (key: string) => string,
): string {
  const code = extractAddressErrorCode(error);
  if (code === "CURRENT_ADDRESS_REQUIRED") {
    return t("errors.currentAddressRequired");
  }
  if (code === "MULTIPLE_CURRENT_ADDRESSES") {
    return t("errors.multipleCurrentAddresses");
  }
  if (code === "ADDRESS_FIELDS_REQUIRED") {
    return t("errors.addressFieldsRequired");
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return t("errors.saveFailed");
}

interface IndividualProcessAddressDialogProps {
  individualProcessId: Id<"individualProcesses">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  address?: ProcessAddressRecord | null;
}

export function IndividualProcessAddressDialog({
  individualProcessId,
  open,
  onOpenChange,
  address,
}: IndividualProcessAddressDialogProps) {
  const t = useTranslations("IndividualProcesses");
  const tCommon = useTranslations("Common");
  const createAddress = useMutation(api.individualProcessAddresses.create);
  const updateAddress = useMutation(api.individualProcessAddresses.update);
  const [value, setValue] = React.useState<CandidateAddressValue>(
    EMPTY_CANDIDATE_ADDRESS_FORM,
  );
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const isEditing = Boolean(address);

  React.useEffect(() => {
    if (!open) return;
    setValue(
      address ? recordToValue(address) : { ...EMPTY_CANDIDATE_ADDRESS_FORM },
    );
  }, [address, open]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!hasStructuredAddressContent(value)) {
      toast.error(t("errors.addressFieldsRequired"));
      return;
    }

    setIsSubmitting(true);
    try {
      if (address) {
        await updateAddress({
          id: address._id,
          addressIsBrazil: value.addressIsBrazil,
          addressStreet: value.addressStreet,
          addressNumber: value.addressNumber,
          addressComplement: value.addressComplement,
          addressNeighborhood: value.addressNeighborhood,
          addressCountryCode: value.addressCountryCode,
          addressCountryName: value.addressCountryName,
          addressStateCode: value.addressStateCode,
          addressStateName: value.addressStateName,
          addressCity: value.addressCity,
          addressPostalCode: value.addressPostalCode,
        });
        toast.success(t("addresses.updatedSuccess"));
      } else {
        await createAddress({
          individualProcessId,
          addressIsBrazil: value.addressIsBrazil,
          addressStreet: value.addressStreet,
          addressNumber: value.addressNumber,
          addressComplement: value.addressComplement,
          addressNeighborhood: value.addressNeighborhood,
          addressCountryCode: value.addressCountryCode,
          addressCountryName: value.addressCountryName,
          addressStateCode: value.addressStateCode,
          addressStateName: value.addressStateName,
          addressCity: value.addressCity,
          addressPostalCode: value.addressPostalCode,
        });
        toast.success(t("addresses.createdAndMarkedCurrent"));
      }
      onOpenChange(false);
    } catch (error) {
      toast.error(getAddressErrorMessage(error, t));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <form onSubmit={(event) => void handleSubmit(event)}>
          <DialogHeader>
            <DialogTitle>
              {isEditing ? t("addresses.editTitle") : t("addresses.addTitle")}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? t("addresses.editDescription")
                : t("addresses.addDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <CandidateAddressFields
              value={value}
              onChange={setValue}
              disabled={isSubmitting}
              showLegacyField={false}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? tCommon("loading") : tCommon("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
