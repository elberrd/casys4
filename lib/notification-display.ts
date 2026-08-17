type NotificationDisplayInput = {
  type: string;
  title: string;
  message: string;
};

export type NotificationMessageDescriptor = {
  key: string;
  values?: Record<string, string | number>;
};

const STORED_TITLE_TYPES = new Set([
  "note_alarm",
  "task_due",
  "process_request_message",
]);

export function getNotificationTitleKey(type: string): string | null {
  return STORED_TITLE_TYPES.has(type) ? null : `types.${type}`;
}

export function getNotificationMessageDescriptor(
  notification: NotificationDisplayInput,
): NotificationMessageDescriptor | null {
  if (notification.type === "note_alarm") {
    return { key: "noteAlarmDueMessage" };
  }
  if (notification.type === "task_due") {
    return { key: "taskDueMessage" };
  }

  if (notification.type === "document_rejected") {
    const match = notification.message.match(
      /^Your document "(.+)" was rejected(?::\s*(.*))?$/,
    );
    if (match) {
      const reason = match[2]?.trim();
      return reason && reason !== "undefined"
        ? {
            key: "systemMessages.documentRejected",
            values: { document: match[1], reason },
          }
        : {
            key: "systemMessages.documentRejectedWithoutReason",
            values: { document: match[1] },
          };
    }
  }

  if (notification.type === "document_approved") {
    const match = notification.message.match(
      /^Your document "(.+)" has been approved$/,
    );
    if (match) {
      return {
        key: "systemMessages.documentApproved",
        values: { document: match[1] },
      };
    }
  }

  if (notification.type === "document_status_changed") {
    const match = notification.message.match(
      /^Your document "(.+)" status changed to (.+)$/,
    );
    if (match) {
      return {
        key: "systemMessages.documentStatusChanged",
        values: { document: match[1], status: match[2] },
      };
    }
  }

  if (notification.type === "task_completed") {
    const match = notification.message.match(
      /^Task "(.+)" has been marked as completed$/,
    );
    if (match) {
      return {
        key: "systemMessages.taskCompleted",
        values: { task: match[1] },
      };
    }
  }

  if (notification.type === "client_document_uploaded") {
    const match = notification.message.match(
      /^(.+) enviou "(.+)" no processo de (.+)$/,
    );
    if (match) {
      return {
        key: "systemMessages.clientDocumentUploaded",
        values: { client: match[1], document: match[2], person: match[3] },
      };
    }
  }

  return null;
}
