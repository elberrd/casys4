import assert from "node:assert/strict";
import test from "node:test";

import {
  canDeleteAddress,
  checkCurrentAddressInvariant,
  countCurrentAddresses,
  markNewAddressAsCurrent,
} from "../lib/utils/individual-process-address";

test("allows a process with no addresses", () => {
  assert.deepEqual(checkCurrentAddressInvariant([]), { ok: true });
});

test("requires the only address to be current", () => {
  assert.deepEqual(checkCurrentAddressInvariant([{ isCurrent: true }]), {
    ok: true,
  });
  assert.deepEqual(checkCurrentAddressInvariant([{ isCurrent: false }]), {
    ok: false,
    code: "CURRENT_ADDRESS_REQUIRED",
  });
});

test("rejects several addresses with none marked current", () => {
  assert.deepEqual(
    checkCurrentAddressInvariant([
      { isCurrent: false },
      { isCurrent: false },
      { isCurrent: false },
    ]),
    { ok: false, code: "CURRENT_ADDRESS_REQUIRED" },
  );
});

test("rejects more than one current address", () => {
  assert.deepEqual(
    checkCurrentAddressInvariant([
      { isCurrent: true },
      { isCurrent: true },
      { isCurrent: false },
    ]),
    { ok: false, code: "MULTIPLE_CURRENT_ADDRESSES" },
  );
});

test("accepts several addresses when exactly one is current", () => {
  assert.deepEqual(
    checkCurrentAddressInvariant([
      { isCurrent: false },
      { isCurrent: true },
      { isCurrent: false },
    ]),
    { ok: true },
  );
  assert.equal(
    countCurrentAddresses([
      { isCurrent: false },
      { isCurrent: true },
      { isCurrent: false },
    ]),
    1,
  );
});

test("adding a new address unsets every previous current flag", () => {
  const existing = [
    { id: "a", isCurrent: true },
    { id: "b", isCurrent: false },
  ];
  const next = markNewAddressAsCurrent(existing);
  assert.deepEqual(
    next.map((address) => address.isCurrent),
    [false, false],
  );
});

test("allows deleting a non-current address", () => {
  assert.deepEqual(
    canDeleteAddress({
      addresses: [
        { id: "current", isCurrent: true },
        { id: "old", isCurrent: false },
      ],
      addressId: "old",
    }),
    { ok: true },
  );
});

test("allows deleting the last remaining address even if it is current", () => {
  assert.deepEqual(
    canDeleteAddress({
      addresses: [{ id: "only", isCurrent: true }],
      addressId: "only",
    }),
    { ok: true },
  );
});

test("blocks deleting the current address when others remain", () => {
  assert.deepEqual(
    canDeleteAddress({
      addresses: [
        { id: "current", isCurrent: true },
        { id: "old", isCurrent: false },
      ],
      addressId: "current",
    }),
    { ok: false, code: "CURRENT_ADDRESS_REQUIRED" },
  );
});
