import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

import { showAppToast } from "../lib/show-app-toast";

function source(relativePath: string) {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

test("useToast routes through sonner so layout Toaster can render it", () => {
  const hook = source("hooks/use-toast.ts");
  const layout = source("app/[locale]/layout.tsx");
  assert.match(hook, /from "sonner"/);
  assert.match(hook, /showAppToast/);
  assert.match(layout, /from "sonner"/);
  assert.match(layout, /<Toaster /);
});

test("showAppToast maps destructive to error and default to message", () => {
  const calls: Array<{ kind: string; title: string; description?: string }> =
    [];
  const sink = {
    message: (title: string, opts?: { description?: string }) => {
      calls.push({ kind: "message", title, description: opts?.description });
      return "id-1";
    },
    error: (title: string, opts?: { description?: string }) => {
      calls.push({ kind: "error", title, description: opts?.description });
      return "id-2";
    },
  };

  assert.equal(showAppToast(sink, { title: "Saved" }), "id-1");
  assert.equal(
    showAppToast(sink, {
      title: "Failed",
      description: "server said no",
      variant: "destructive",
    }),
    "id-2",
  );
  assert.deepEqual(calls, [
    { kind: "message", title: "Saved", description: undefined },
    {
      kind: "error",
      title: "Failed",
      description: "server said no",
    },
  ]);
});
