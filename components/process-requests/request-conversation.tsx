"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useLocale, useTranslations } from "next-intl";
import { formatDistanceToNow } from "date-fns";
import { enUS, ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Lock, Loader2, Send, Trash2 } from "lucide-react";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export interface RequestConversationProps {
  processRequestId: Id<"processRequests">;
  currentUserRole: "admin" | "client";
  currentUserId?: Id<"users">;
}

type ConversationMessage = {
  _id: Id<"processRequestMessages">;
  processRequestId: Id<"processRequests">;
  authorUserId: Id<"users">;
  authorRole: "admin" | "client";
  kind: "message" | "observation";
  isInternal: boolean;
  body: string;
  isActive: boolean;
  createdAt: number;
  editedAt?: number;
  authorName: string;
  authorEmail: string;
};

function getInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function RequestConversation({
  processRequestId,
  currentUserRole,
  currentUserId,
}: RequestConversationProps) {
  const t = useTranslations("ProcessRequests");
  const locale = useLocale();
  const dateLocale = locale === "pt" ? ptBR : enUS;

  const isAdmin = currentUserRole === "admin";

  const messages = useQuery(api.processRequestMessages.list, {
    processRequestId,
  }) as ConversationMessage[] | undefined;

  const postMessage = useMutation(api.processRequestMessages.post);
  const removeMessage = useMutation(api.processRequestMessages.remove);

  const [body, setBody] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [deletingId, setDeletingId] =
    useState<Id<"processRequestMessages"> | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom whenever the message list changes.
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages?.length]);

  const handleSend = async () => {
    const trimmed = body.trim();
    if (!trimmed) return;

    setIsSending(true);
    try {
      await postMessage({
        processRequestId,
        body: trimmed,
        kind: isAdmin && isInternal ? "observation" : "message",
      });
      setBody("");
      setIsInternal(false);
    } catch (error) {
      console.error("Failed to post message:", error);
      toast.error(t("messageSendError"));
    } finally {
      setIsSending(false);
    }
  };

  const handleDelete = async (id: Id<"processRequestMessages">) => {
    setDeletingId(id);
    try {
      await removeMessage({ id });
      toast.success(t("messageDeleted"));
    } catch (error) {
      console.error("Failed to delete message:", error);
      toast.error(t("messageDeleteError"));
    } finally {
      setDeletingId(null);
    }
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      void handleSend();
    }
  };

  return (
    <div className="flex flex-col rounded-lg border bg-card">
      {/* Message list */}
      <div
        ref={scrollRef}
        className="flex max-h-[420px] min-h-[200px] flex-col gap-4 overflow-y-auto p-4"
      >
        {messages === undefined ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Skeleton className="size-8 shrink-0 rounded-full" />
              <Skeleton className="h-16 w-3/4 rounded-lg" />
            </div>
            <div className="flex flex-row-reverse items-start gap-3">
              <Skeleton className="size-8 shrink-0 rounded-full" />
              <Skeleton className="h-12 w-2/3 rounded-lg" />
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-1 items-center justify-center py-8 text-center text-sm text-muted-foreground">
            {t("noMessages")}
          </div>
        ) : (
          messages.map((message) => {
            const isOwn =
              currentUserId !== undefined &&
              message.authorUserId === currentUserId;
            const isObservation =
              message.kind === "observation" || message.isInternal;
            const canDelete = isOwn || isAdmin;
            const timeAgo = formatDistanceToNow(new Date(message.createdAt), {
              addSuffix: true,
              locale: dateLocale,
            });

            return (
              <div
                key={message._id}
                className={cn(
                  "flex w-full items-start gap-3",
                  isOwn && !isObservation && "flex-row-reverse"
                )}
              >
                <Avatar className="mt-0.5 shrink-0">
                  <AvatarFallback
                    className={cn(
                      "text-xs font-medium",
                      isObservation
                        ? "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200"
                        : message.authorRole === "admin"
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                    )}
                  >
                    {getInitials(message.authorName)}
                  </AvatarFallback>
                </Avatar>

                <div
                  className={cn(
                    "flex max-w-[78%] flex-col gap-1",
                    isOwn && !isObservation && "items-end"
                  )}
                >
                  <div
                    className={cn(
                      "flex items-center gap-2",
                      isOwn && !isObservation && "flex-row-reverse"
                    )}
                  >
                    <span className="text-xs font-medium text-foreground">
                      {message.authorName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {t("postedAt", { time: timeAgo })}
                    </span>
                  </div>

                  <div
                    className={cn(
                      "group relative rounded-lg px-3 py-2 text-sm",
                      isObservation
                        ? "border border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100"
                        : isOwn
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                    )}
                  >
                    {isObservation && (
                      <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                        <Lock className="h-3 w-3" />
                        {t("internalObservation")}
                      </div>
                    )}
                    <p className="whitespace-pre-wrap break-words">
                      {message.body}
                    </p>

                    {canDelete && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => void handleDelete(message._id)}
                        disabled={deletingId === message._id}
                        title={t("deleteMessage")}
                        aria-label={t("deleteMessage")}
                        className={cn(
                          "absolute -top-2 size-6 rounded-full border bg-background text-muted-foreground opacity-0 shadow-sm transition-opacity hover:text-destructive group-hover:opacity-100",
                          isOwn && !isObservation ? "-left-2" : "-right-2"
                        )}
                      >
                        {deletingId === message._id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="space-y-3 border-t p-4">
        <Textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t("messagePlaceholder")}
          rows={3}
          maxLength={5000}
          disabled={isSending}
          className={cn(
            isAdmin &&
              isInternal &&
              "border-amber-300 focus-visible:ring-amber-400 dark:border-amber-800"
          )}
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          {isAdmin ? (
            <div className="flex items-center gap-2">
              <Switch
                id="internal-observation-toggle"
                checked={isInternal}
                onCheckedChange={setIsInternal}
                disabled={isSending}
              />
              <div className="flex flex-col">
                <Label
                  htmlFor="internal-observation-toggle"
                  className="flex cursor-pointer items-center gap-1.5 text-sm font-medium"
                >
                  <Lock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  {t("internalObservation")}
                </Label>
                <span className="text-xs text-muted-foreground">
                  {t("internalObservationHint")}
                </span>
              </div>
            </div>
          ) : (
            <span />
          )}

          <Button
            type="button"
            onClick={() => void handleSend()}
            disabled={isSending || body.trim().length === 0}
          >
            {isSending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            {t("sendMessage")}
          </Button>
        </div>
      </div>
    </div>
  );
}
