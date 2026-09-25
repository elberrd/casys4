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
  emptyAddressForm,
  hasStructuredAddressContent,
  processAddressHasRequiredLocation,
  withNormalizedBrazilState,
  type AddressCountryMode,
  type CandidateAddressValue,
} from "@/lib/utils/candidate-address";
import { isBrazilAddress } from "@/lib/utils/address-fields";
import { todayIsoDate } from "@/lib/utils/address-fields";
import { toast } from "sonner";

export type AddressOwner =
  | { type: "process"; individualProcessId: Id<"individualProcesses"> }
  | { type: "person"; personId: Id<"people"> };

export type ProcessAddressRecord = {
  _id: Id<"individualProcessAddresses">;
  isCurrent: boolean;
  reportedAt?: string;
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
  const value: CandidateAddressValue = {
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
    reportedAt: address.reportedAt || todayIsoDate(),
  };
  return isBrazilAddress(value) ? withNormalizedBrazilState(value) : value;
}

const ADDRESS_ERROR_CODES = [
  "CURRENT_ADDRESS_REQUIRED",
  "MULTIPLE_CURRENT_ADDRESSES",
  "ADDRESS_FIELDS_REQUIRED",
  "PERSON_ADDRESS_MUST_BE_ABROAD",
  "PROCESS_ADDRESS_MUST_BE_BRAZIL",
  "INVALID_REPORTED_AT",
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
  if (code === "PERSON_ADDRESS_MUST_BE_ABROAD") {
    return t("errors.personAddressMustBeAbroad");
  }
  if (code === "PROCESS_ADDRESS_MUST_BE_BRAZIL") {
    return t("errors.processAddressMustBeBrazil");
  }
  if (code === "INVALID_REPORTED_AT") {
    return t("errors.invalidReportedAt");
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return t("errors.saveFailed");
}

interface IndividualProcessAddressDialogProps {
  owner: AddressOwner;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  address?: ProcessAddressRecord | null;
}

export function IndividualProcessAddressDialog({
  owner,
  open,
  onOpenChange,
  address,
}: IndividualProcessAddressDialogProps) {
  const t = useTranslations("IndividualProcesses");
  const tCommon = useTranslations("Common");
  const createProcessAddress = useMutation(api.individualProcessAddresses.create);
  const createPersonAddress = useMutation(
    api.individualProcessAddresses.createForPerson,
  );
  const updateAddress = useMutation(api.individualProcessAddresses.update);
  const countryMode: AddressCountryMode = owner.type;
  const [value, setValue] = React.useState<CandidateAddressValue>(
    emptyAddressForm(countryMode),
  );
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const isEditing = Boolean(address);

  React.useEffect(() => {
    if (!open) {
      setValue(emptyAddressForm(countryMode));
      return;
    }
    // Create always starts empty (Brazil + today's reportedAt). Never copy
    // the current address — that raced with Combobox leftover state.
    setValue(address ? recordToValue(address) : emptyAddressForm(countryMode));
  }, [address, countryMode, open]);

  const payloadFromValue = (next: CandidateAddressValue) => {
    const normalized =
      owner.type === "process" ? withNormalizedBrazilState(next) : next;
    return {
      reportedAt: normalized.reportedAt || todayIsoDate(),
      addressIsBrazil: normalized.addressIsBrazil,
      addressStreet: normalized.addressStreet,
      addressNumber: normalized.addressNumber,
      addressComplement: normalized.addressComplement,
      addressNeighborhood: normalized.addressNeighborhood,
      addressCountryCode: normalized.addressCountryCode,
      addressCountryName: normalized.addressCountryName,
      addressStateCode: normalized.addressStateCode,
      addressStateName: normalized.addressStateName,
      addressCity: normalized.addressCity,
      addressPostalCode: normalized.addressPostalCode,
    };
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!hasStructuredAddressContent(value)) {
      toast.error(t("errors.addressFieldsRequired"));
      return;
    }
    if (
      owner.type === "process" &&
      !processAddressHasRequiredLocation(value)
    ) {
      toast.error(t("errors.cityAndStateRequired"));
      return;
    }
    if (!value.reportedAt) {
      toast.error(t("errors.reportedAtRequired"));
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = payloadFromValue(value);
      if (address) {
        await updateAddress({
          id: address._id,
          ...payload,
        });
        toast.success(t("addresses.updatedSuccess"));
      } else if (owner.type === "person") {
        await createPersonAddress({
          personId: owner.personId,
          ...payload,
        });
        toast.success(t("addresses.createdAndMarkedCurrent"));
      } else {
        await createProcessAddress({
          individualProcessId: owner.individualProcessId,
          ...payload,
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
        <form autoComplete="off" onSubmit={(event) => void handleSubmit(event)}>
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
            {open ? (
              <CandidateAddressFields
                key={address?._id ?? "create"}
                value={value}
                onChange={setValue}
                disabled={isSubmitting}
                showLegacyField={false}
                countryMode={countryMode}
              />
            ) : null}
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
