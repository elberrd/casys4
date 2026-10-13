export type AppToastInput = {
  title?: string;
  description?: string;
  variant?: "default" | "destructive";
};

export type AppToastSink = {
  message: (
    title: string,
    opts?: { description?: string },
  ) => string | number;
  error: (
    title: string,
    opts?: { description?: string },
  ) => string | number;
};

export function showAppToast(
  sink: AppToastSink,
  input: AppToastInput,
): string | number {
  const title = input.title ?? "";
  const opts = input.description
    ? { description: input.description }
    : undefined;
  if (input.variant === "destructive") {
    return sink.error(title, opts);
  }
  return sink.message(title, opts);
}
