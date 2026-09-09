import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCboCodeDocument,
  mergeCboCodeDocument,
} from "../convex/lib/cboCodeDocument";

test("omits empty optional CBO fields so Convex never receives undefined", () => {
  assert.deepEqual(
    buildCboCodeDocument({
      code: "3912-05",
      title: "Inspetor de qualidade",
      activity: undefined,
      description: "",
    }),
    {
      code: "3912-05",
      title: "Inspetor de qualidade",
    },
  );
});

test("keeps activity text when updating a CBO that never had the field", () => {
  assert.deepEqual(
    mergeCboCodeDocument(
      {
        code: "3912-05",
        title: "Inspetor de qualidade",
        description: "",
      },
      {
        code: "3912-05",
        title: "Inspetor de qualidade",
        activity: "1 - Teste\n2 - Teste\n3 - Teste\n4 - Teste",
        description: "",
      },
    ),
    {
      code: "3912-05",
      title: "Inspetor de qualidade",
      activity: "1 - Teste\n2 - Teste\n3 - Teste\n4 - Teste",
    },
  );
});

test("clears activity when the form sends an empty string", () => {
  assert.deepEqual(
    mergeCboCodeDocument(
      {
        code: "3912-05",
        title: "Inspetor de qualidade",
        activity: "texto antigo",
      },
      {
        code: "3912-05",
        title: "Inspetor de qualidade",
        activity: "   ",
        description: "",
      },
    ),
    {
      code: "3912-05",
      title: "Inspetor de qualidade",
    },
  );
});

test("keeps existing activity when the update omits the field", () => {
  assert.deepEqual(
    mergeCboCodeDocument(
      {
        code: "3912-05",
        title: "Inspetor de qualidade",
        activity: "texto atual",
      },
      {
        title: "Inspetor de qualidade",
      },
    ),
    {
      code: "3912-05",
      title: "Inspetor de qualidade",
      activity: "texto atual",
    },
  );
});

