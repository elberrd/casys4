import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { normalizeBrazilStateCode } from "../lib/data/brazil-states";
import {
  emptyAddressForm,
  formatAddressCityState,
  formatCandidateAddress,
  formatCurrentProcessAddress,
  processAddressHasRequiredLocation,
  withNormalizedBrazilState,
} from "../lib/utils/candidate-address";
import { forceBrazilAddressFields } from "../lib/utils/address-fields";
import { canDeleteAddress } from "../lib/utils/individual-process-address";

const read = (relative: string) =>
  readFileSync(path.join(process.cwd(), relative), "utf8");

const tableSource = read(
  "components/individual-processes/individual-process-addresses-table.tsx",
);
const dialogSource = read(
  "components/individual-processes/individual-process-address-dialog.tsx",
);
const confirmationSource = read("components/ui/confirmation-dialog.tsx");
const fieldsSource = read(
  "components/individual-processes/candidate-address-fields.tsx",
);
const detailSource = read(
  "app/[locale]/(dashboard)/individual-processes/[id]/individual-process-detail-client.tsx",
);

test("a) deleting the current address is blocked in the UI when others remain", () => {
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
  assert.equal(canDeleteAddress({
    addresses: [{ id: "only", isCurrent: true }],
    addressId: "only",
  }).ok, true);

  assert.match(tableSource, /isAddressDeleteBlocked/);
  assert.match(tableSource, /canDeleteAddress/);
  assert.match(tableSource, /confirmDisabled=\{deleteBlocked\}/);
  assert.match(tableSource, /addresses\.deleteCurrentDescription/);
  assert.match(confirmationSource, /confirmDisabled/);
  assert.match(confirmationSource, /!confirmDisabled && \(/);
  assert.equal(tableSource.includes("removeAddress({ id: deletingAddress._id })"), true);
});

test("b) add-address form always opens empty and requires city + UF", () => {
  const firstOpen = emptyAddressForm("process");
  const secondOpen = emptyAddressForm("process");
  assert.equal(firstOpen.addressStateCode, "");
  assert.equal(firstOpen.addressCity, "");
  assert.equal(secondOpen.addressStateCode, "");
  assert.equal(secondOpen.addressCity, "");
  assert.deepEqual(
    { ...firstOpen, reportedAt: "2026-09-24" },
    { ...secondOpen, reportedAt: "2026-09-24" },
  );

  assert.equal(
    processAddressHasRequiredLocation({
      addressCity: "Rio de Janeiro",
      addressStateCode: "RJ",
    }),
    true,
  );
  assert.equal(
    processAddressHasRequiredLocation({
      addressStreet: "Rua Teste",
      addressNumber: "123",
      addressNeighborhood: "Centro",
    }),
    false,
  );
  assert.equal(
    processAddressHasRequiredLocation({
      addressCity: "Rio de Janeiro",
      addressStateCode: "Rio de Janeiro",
    }),
    true,
  );

  assert.match(dialogSource, /emptyAddressForm\(countryMode\)/);
  assert.match(dialogSource, /if \(!open\) \{/);
  assert.match(dialogSource, /key=\{address\?\._id \?\? "create"\}/);
  assert.match(dialogSource, /processAddressHasRequiredLocation\(value\)/);
  assert.match(dialogSource, /errors\.cityAndStateRequired/);
  assert.match(dialogSource, /autoComplete="off"/);
  assert.match(fieldsSource, /value=\{value\.addressStateCode \?\? ""\}/);
  assert.match(fieldsSource, /value=\{value\.addressCity \?\? ""\}/);
});

test("c) insert stores UF and the shared formatter hides BRASIL", () => {
  assert.equal(normalizeBrazilStateCode("rj"), "RJ");
  assert.equal(normalizeBrazilStateCode("Rio de Janeiro"), "RJ");
  assert.equal(normalizeBrazilStateCode(undefined, "São Paulo"), "SP");

  const written = forceBrazilAddressFields({
    addressStreet: "[probe-addr-rnm] Rua Teste Insert",
    addressNumber: "1",
    addressNeighborhood: "Centro",
    addressCity: "Rio de Janeiro",
    addressStateCode: "Rio de Janeiro",
    addressStateName: "Rio de Janeiro",
    addressPostalCode: "20040020",
    addressCountryName: "BRASIL",
  });
  assert.equal(written.addressStateCode, "RJ");
  assert.equal(written.addressStateName, "Rio de Janeiro");

  const normalized = withNormalizedBrazilState({
    addressIsBrazil: true,
    addressStateCode: "Rio de Janeiro",
    addressStateName: "Rio de Janeiro",
    addressCity: "Rio de Janeiro",
  });
  assert.equal(normalized.addressStateCode, "RJ");

  const seedLike = {
    addressIsBrazil: true,
    addressStreet: "[probe-addr] Rua RNM Current",
    addressNumber: "100",
    addressNeighborhood: "Centro",
    addressCity: "Rio de Janeiro",
    addressStateCode: "RJ",
    addressPostalCode: "20040-020",
    addressCountryCode: "BR",
    addressCountryName: "BRASIL",
  };
  assert.equal(
    formatCurrentProcessAddress(seedLike),
    "[probe-addr] Rua RNM Current, 100, Centro, Rio de Janeiro - RJ, 20040-020",
  );
  assert.equal(
    formatCandidateAddress({
      ...seedLike,
      addressStreet: "[probe-addr-rnm] Rua Teste Insert",
      addressNumber: "1",
      addressStateCode: "Rio de Janeiro",
      addressStateName: "Rio de Janeiro",
      addressPostalCode: undefined,
    }),
    "[probe-addr-rnm] Rua Teste Insert, 1, Centro, Rio de Janeiro - RJ",
  );
  assert.equal(
    formatAddressCityState({
      addressIsBrazil: true,
      addressCity: "Rio de Janeiro",
      addressStateCode: "Rio de Janeiro",
      addressStateName: "Rio de Janeiro",
    }),
    "Rio de Janeiro - RJ",
  );

  assert.match(detailSource, /formatCurrentProcessAddress\(processCurrentAddress\)/);
  assert.match(tableSource, /formatAddressCityState\(address\)/);
  assert.match(dialogSource, /withNormalizedBrazilState/);
  assert.match(fieldsSource, /normalizeBrazilStateCode/);
});
