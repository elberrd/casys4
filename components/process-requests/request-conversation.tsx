"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useLocale, useTranslations } from "next-intl";
import { format, formatDistanceToNow, isToday, isYesterday } from "date-fns";
import { enUS, ptBR } from "date-fns/locale";
import { toast } from "sonner";
import {
  Lock,
  Loader2,
  MessageSquare,
  Send,
  Trash2,
} from "lucide-react";

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
  individualProcessId: Id<"individualProcesses">;
  currentUserRole: "admin" | "client";
  currentUserId?: Id<"users">;
  /** Tailwind height for the scrollable message area. */
  heightClassName?: string;
}

type ConversationMessage = {
  _id: Id<"processRequestMessages">;
  individualProcessId?: Id<"individualProcesses">;
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
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function RequestConversation({
  individualProcessId,
  currentUserRole,
  currentUserId,
  heightClassName = "h-[460px]",
}: RequestConversationProps) {
  const t = useTranslations("ProcessRequests");
  const locale = useLocale();
  const dateLocale = locale === "pt" ? ptBR : enUS;

  const isAdmin = currentUserRole === "admin";

  const messages = useQuery(api.processRequestMessages.list, {
    individualProcessId,
  }) as ConversationMessage[] | undefined;

  const postMessage = useMutation(api.processRequestMessages.post);
  const removeMessage = useMutation(api.processRequestMessages.remove);

  const [body, setBody] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [deletingId, setDeletingId] =
    useState<Id<"processRequestMessages"> | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.length]);

  const dayLabel = (timestamp: number): string => {
    const date = new Date(timestamp);
    if (isToday(date)) return t("today");
    if (isYesterday(date)) return t("yesterday");
    return format(date, "PPP", { locale: dateLocale });
  };

  // Tag the first message of each calendar day so we can render a date divider.
  const withDayBreaks = useMemo(() => {
    if (!messages) return [];
    let prevDay = "";
    return messages.map((message) => {
      const day = new Date(message.createdAt).toDateString();
      const showDay = day !== prevDay;
      prevDay = day;
      return { message, showDay };
    });
  }, [messages]);

  const handleSend = async () => {
    const trimmed = body.trim();
    if (!trimmed) return;
    setIsSending(true);
    try {
      await postMessage({
        individualProcessId,
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
    <div className="flex h-full flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 border-b bg-muted/30 px-4 py-3">
        <div className="flex size-9 items-center justify-center rounded-full bg-primary/10 text-primary">
          <MessageSquare className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-tight">
            {t("conversation")}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {t("conversationSubtitle")}
          </p>
        </div>
      </div>

      {/* Message list */}
      <div
        className={cn(
          "flex flex-col gap-4 overflow-y-auto bg-muted/10 p-4",
          heightClassName,
        )}
      >
        {messages === undefined ? (
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Skeleton className="size-8 shrink-0 rounded-full" />
              <Skeleton className="h-16 w-3/4 rounded-2xl" />
            </div>
            <div className="flex flex-row-reverse items-start gap-3">
              <Skeleton className="size-8 shrink-0 rounded-full" />
              <Skeleton className="h-12 w-2/3 rounded-2xl" />
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 py-10 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium text-foreground">
                {t("noMessages")}
              </p>
              <p className="text-xs text-muted-foreground">
                {t("noMessagesHint")}
              </p>
            </div>
          </div>
        ) : (
          withDayBreaks.map(({ message, showDay }) => {
            const isOwn =
              currentUserId !== undefined &&
              message.authorUserId === currentUserId;
            const isObservation =
              message.kind === "observation" || message.isInternal;
            const alignRight = isOwn && !isObservation;
            const canDelete = isOwn || isAdmin;
            const timeAgo = formatDistanceToNow(new Date(message.createdAt), {
              addSuffix: true,
              locale: dateLocale,
            });
            const fullTime = format(new Date(message.createdAt), "PPpp", {
              locale: dateLocale,
            });

            return (
              <div key={message._id} className="space-y-4">
                {showDay && (
                  <div className="flex items-center justify-center">
                    <span className="rounded-full bg-background px-3 py-1 text-[11px] font-medium text-muted-foreground shadow-sm ring-1 ring-border">
                      {dayLabel(message.createdAt)}
                    </span>
                  </div>
                )}

                <div
                  className={cn(
                    "flex w-full items-end gap-2.5",
                    alignRight && "flex-row-reverse",
                  )}
                >
                  <Avatar className="size-8 shrink-0">
                    <AvatarFallback
                      className={cn(
                        "text-[11px] font-semibold",
                        isObservation
                          ? "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200"
                          : message.authorRole === "admin"
                            ? "bg-primary/15 text-primary"
                            : "bg-secondary text-secondary-foreground",
                      )}
                    >
                      {getInitials(message.authorName)}
                    </AvatarFallback>
                  </Avatar>

                  <div
                    className={cn(
                      "flex max-w-[80%] flex-col gap-1",
                      alignRight && "items-end",
                    )}
                  >
                    <div
                      className={cn(
                        "flex items-baseline gap-2 px-1",
                        alignRight && "flex-row-reverse",
                      )}
                    >
                      <span className="text-xs font-semibold text-foreground">
                        {isOwn ? t("you") : message.authorName}
                      </span>
                      <span
                        className="text-[11px] text-muted-foreground"
                        title={fullTime}
                      >
                        {timeAgo}
                      </span>
                    </div>

                    <div
                      className={cn(
                        "group relative rounded-2xl px-3.5 py-2.5 text-sm shadow-sm",
                        isObservation
                          ? "border border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100"
                          : alignRight
                            ? "rounded-br-md bg-primary text-primary-foreground"
                            : "rounded-bl-md bg-background text-foreground ring-1 ring-border",
                      )}
                    >
                      {isObservation && (
                        <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                          <Lock className="h-3 w-3" />
                          {t("internalObservation")}
                        </div>
                      )}
                      <p className="whitespace-pre-wrap break-words leading-relaxed">
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
                            alignRight ? "-left-2" : "-right-2",
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
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <div className="space-y-2.5 border-t bg-card p-3">
        <div
          className={cn(
            "rounded-xl border bg-background transition-colors focus-within:ring-2 focus-within:ring-ring/40",
            isAdmin &&
              isInternal &&
              "border-amber-300 focus-within:ring-amber-400/40 dark:border-amber-800",
          )}
        >
          <Textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isAdmin && isInternal
                ? t("internalObservationPlaceholder")
                : t("messagePlaceholder")
            }
            rows={3}
            maxLength={5000}
            disabled={isSending}
            className="resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
          />
          <div className="flex flex-wrap items-center justify-between gap-2 border-t px-2.5 py-2">
            {isAdmin ? (
              <div className="flex items-center gap-2">
                <Switch
                  id="internal-observation-toggle"
                  checked={isInternal}
                  onCheckedChange={setIsInternal}
                  disabled={isSending}
                />
                <Label
                  htmlFor="internal-observation-toggle"
                  className="flex cursor-pointer items-center gap-1.5 text-xs font-medium"
                >
                  <Lock className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                  {t("internalObservation")}
                </Label>
              </div>
            ) : (
              <span className="hidden text-[11px] text-muted-foreground sm:inline">
                {t("sendHint")}
              </span>
            )}

            <Button
              type="button"
              size="sm"
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
        {isAdmin && isInternal && (
          <p className="px-1 text-[11px] text-amber-700 dark:text-amber-400">
            {t("internalObservationHint")}
          </p>
        )}
      </div>
    </div>
  );
}
