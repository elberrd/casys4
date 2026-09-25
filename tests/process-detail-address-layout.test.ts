import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const detailSource = readFileSync(
  path.join(
    process.cwd(),
    "app/[locale]/(dashboard)/individual-processes/[id]/individual-process-detail-client.tsx",
  ),
  "utf8",
);
const tableSource = readFileSync(
  path.join(
    process.cwd(),
    "components/individual-processes/individual-process-addresses-table.tsx",
  ),
  "utf8",
);
const personModalSource = readFileSync(
  path.join(process.cwd(), "components/people/person-detail-view.tsx"),
  "utf8",
);

test("process and person info cards put the address on the same grid row as the label", () => {
  assert.match(detailSource, /function ProcessDetailAddressRow/);
  assert.match(
    detailSource,
    /<ProcessDetailAddressRow\s+label=\{t\("residenceAddressInBrazil"\)\}/,
  );
  assert.match(
    detailSource,
    /<ProcessDetailAddressRow\s+label=\{t\("personCurrentAddress"\)\}/,
  );
  assert.match(detailSource, /tAddress\("noAddress"\)/);
  assert.equal(
    detailSource.includes('col-span-full mt-2 flex items-center gap-2'),
    false,
    "address must not span full width below the label",
  );
  assert.equal(
    detailSource.includes('col-span-full text-sm whitespace-pre-line'),
    false,
    "address value must sit in the grid value column, not col-span-full",
  );
});

test("info cards do not show an Atual pill next to the address label", () => {
  assert.equal(detailSource.includes('t("addresses.current")'), false);
  assert.equal(
    /residenceAddressInBrazil[\s\S]{0,500}?Badge variant="success"/.test(
      detailSource,
    ),
    false,
  );
  assert.equal(
    /personCurrentAddress[\s\S]{0,500}?Badge variant="success"/.test(
      detailSource,
    ),
    false,
  );
});

test("address table rows still show the Atual badge", () => {
  assert.match(
    tableSource,
    /address\.isCurrent[\s\S]{0,200}?Badge variant="success">\{t\("addresses\.current"\)\}/,
  );
});

test("person detail modal keeps structured current-address rows without a card Atual pill", () => {
  assert.match(personModalSource, /CandidateAddressDetailRows/);
  assert.match(personModalSource, /tAddress\("noAddress"\)/);
  assert.equal(personModalSource.includes('t("addresses.current")'), false);
  assert.equal(personModalSource.includes('variant="success"'), false);
});
