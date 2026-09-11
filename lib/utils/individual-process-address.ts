export type CurrentAddressInvariantCode =
  | "CURRENT_ADDRESS_REQUIRED"
  | "MULTIPLE_CURRENT_ADDRESSES";

export type CurrentAddressInvariant =
  | { ok: true }
  | { ok: false; code: CurrentAddressInvariantCode };

export function countCurrentAddresses(
  addresses: Array<{ isCurrent: boolean }>,
): number {
  return addresses.filter((address) => address.isCurrent).length;
}

/**
 * A process may have zero addresses. If it has any, exactly one must be current.
 * A single address is always treated as current.
 */
export function checkCurrentAddressInvariant(
  addresses: Array<{ isCurrent: boolean }>,
): CurrentAddressInvariant {
  if (addresses.length === 0) {
    return { ok: true };
  }

  if (addresses.length === 1) {
    return addresses[0]?.isCurrent
      ? { ok: true }
      : { ok: false, code: "CURRENT_ADDRESS_REQUIRED" };
  }

  const currentCount = countCurrentAddresses(addresses);
  if (currentCount === 0) {
    return { ok: false, code: "CURRENT_ADDRESS_REQUIRED" };
  }
  if (currentCount > 1) {
    return { ok: false, code: "MULTIPLE_CURRENT_ADDRESSES" };
  }
  return { ok: true };
}

export function markNewAddressAsCurrent<T extends { isCurrent: boolean }>(
  existing: T[],
): Array<T & { isCurrent: boolean }> {
  return existing.map((address) => ({ ...address, isCurrent: false }));
}

export function canDeleteAddress(args: {
  addresses: Array<{ id: string; isCurrent: boolean }>;
  addressId: string;
}): CurrentAddressInvariant {
  const remaining = args.addresses.filter(
    (address) => address.id !== args.addressId,
  );
  return checkCurrentAddressInvariant(remaining);
}
