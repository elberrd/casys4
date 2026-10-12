import assert from "node:assert/strict";
import test from "node:test";

import {
  captureProcessReturnSearch,
  clearOriginalReportReturn,
  readOriginalReportReturn,
  resolveReportTemplateEditorExit,
  saveOriginalReportReturn,
  shouldKeepOriginalReportReturn,
  takeOriginalReportReturnForProcess,
  type OriginalReportReturnSession,
} from "../lib/report-templates/original-report-return";

function memoryStorage() {
  const values = new Map<string, string>();
  return {
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    },
    removeItem(key: string) {
      values.delete(key);
    },
  };
}

const session: OriginalReportReturnSession = {
  processId: "process-1",
  templateId: "template-1",
  returnSearch: "?collectiveProcessId=collective-1",
  attachTarget: {
    documentTypeId: "doc-type-1",
    documentRequirementId: "req-1",
    documentName: "Antecedentes criminais",
  },
};

test("process return search keeps only process context params", () => {
  assert.equal(
    captureProcessReturnSearch(
      "?collectiveProcessId=collective-1&fromTask=task-1&resumeReport=no",
    ),
    "?collectiveProcessId=collective-1&fromTask=task-1",
  );
  assert.equal(captureProcessReturnSearch(""), "");
  assert.equal(captureProcessReturnSearch("?unused=1"), "");
});

test("return session round-trips and ignores invalid payloads", () => {
  const storage = memoryStorage();
  assert.equal(readOriginalReportReturn(storage), null);
  saveOriginalReportReturn(session, storage);
  assert.deepEqual(readOriginalReportReturn(storage), session);

  storage.setItem("casys4.originalReportReturn", "{not-json");
  assert.equal(readOriginalReportReturn(storage), null);

  storage.setItem("casys4.originalReportReturn", JSON.stringify({ processId: "x" }));
  assert.equal(readOriginalReportReturn(storage), null);
});

test("closing the original report returns to the individual process", () => {
  const storage = memoryStorage();
  saveOriginalReportReturn(session, storage);

  assert.deepEqual(resolveReportTemplateEditorExit("template-1", storage), {
    href: "/individual-processes/process-1?collectiveProcessId=collective-1",
    replace: true,
  });
  assert.deepEqual(readOriginalReportReturn(storage), session);
});

test("leaving an unrelated template editor drops the return session", () => {
  const storage = memoryStorage();
  saveOriginalReportReturn(session, storage);

  assert.deepEqual(resolveReportTemplateEditorExit("other-template", storage), {
    href: "/report-templates",
    replace: false,
  });
  assert.equal(readOriginalReportReturn(storage), null);
  assert.deepEqual(resolveReportTemplateEditorExit(undefined, storage), {
    href: "/report-templates",
    replace: false,
  });
});

test("the process page consumes the session and can replay one strict-mode read", () => {
  const storage = memoryStorage();
  saveOriginalReportReturn(session, storage);

  assert.deepEqual(
    takeOriginalReportReturnForProcess("process-1", storage),
    session,
  );
  assert.equal(readOriginalReportReturn(storage), null);
  assert.deepEqual(
    takeOriginalReportReturnForProcess("process-1", storage),
    session,
  );
  assert.equal(takeOriginalReportReturnForProcess("other-process", storage), null);

  clearOriginalReportReturn(storage);
});

test("the return session survives only the editor and its process", () => {
  assert.equal(
    shouldKeepOriginalReportReturn("/pt/report-templates/template-1/edit", session),
    true,
  );
  assert.equal(
    shouldKeepOriginalReportReturn("/individual-processes/process-1", session),
    true,
  );
  assert.equal(
    shouldKeepOriginalReportReturn("/en/report-templates", session),
    false,
  );
  assert.equal(
    shouldKeepOriginalReportReturn(
      "/individual-processes/process-1/edit",
      session,
    ),
    false,
  );
  assert.equal(shouldKeepOriginalReportReturn("/dashboard", null), false);
});
