"use client";

import { toast as sonnerToast } from "sonner";

import { showAppToast, type AppToastInput } from "@/lib/show-app-toast";

export type ToastProps = AppToastInput;

export interface Toast extends ToastProps {
  id: string;
}

function toast(props: ToastProps) {
  const id = showAppToast(
    {
      message: (title, opts) => sonnerToast(title, opts),
      error: (title, opts) => sonnerToast.error(title, opts),
    },
    props,
  );

  return {
    id: String(id),
    dismiss: () => sonnerToast.dismiss(id),
  };
}

function useToast() {
  return {
    toasts: [] as Toast[],
    toast,
    dismiss: sonnerToast.dismiss,
  };
}

export { useToast, toast };
