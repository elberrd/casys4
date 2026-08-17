export type NotificationTargetInput = {
  type?: string;
  entityType?: string;
  entityId?: string;
  navigationEntityType?: string;
  navigationEntityId?: string;
  navigationSection?: string;
};

export type NotificationDestinationKind =
  | "documentation"
  | "note"
  | "task"
  | "process"
  | "processRequest"
  | "document"
  | "person"
  | "company";

const DOCUMENT_NOTIFICATION_TYPES = new Set([
  "client_document_uploaded",
  "document_approved",
  "document_rejected",
  "document_status_changed",
  "version_created",
]);

function getNavigationEntity(input: NotificationTargetInput) {
  return {
    entityType: input.navigationEntityType ?? input.entityType,
    entityId: input.navigationEntityId ?? input.entityId,
  };
}

function targetsDocumentation(input: NotificationTargetInput) {
  const { entityType } = getNavigationEntity(input);
  return (
    entityType === "individualProcess" &&
    (input.navigationSection === "documentation" ||
      (input.type ? DOCUMENT_NOTIFICATION_TYPES.has(input.type) : false))
  );
}

export function getNotificationTarget(
  input: NotificationTargetInput,
): string | null {
  const { entityType, entityId } = getNavigationEntity(input);
  if (!entityType || !entityId) return null;
  const id = encodeURIComponent(entityId);

  switch (entityType) {
    case "note":
      return `/notes?highlight=${id}`;
    case "task":
      return `/tasks?highlight=${id}`;
    case "collectiveProcess":
      return `/collective-processes/${id}`;
    case "individualProcess":
      return `/individual-processes/${id}${targetsDocumentation(input) ? "#documentation" : ""}`;
    case "processRequest":
      return `/process-requests/${id}`;
    case "document":
      return `/documents?highlight=${id}`;
    case "person":
      return `/people?highlight=${id}`;
    case "company":
      return `/companies/${id}`;
    default:
      return null;
  }
}

export function getNotificationDestinationKind(
  input: NotificationTargetInput,
): NotificationDestinationKind | null {
  const { entityType, entityId } = getNavigationEntity(input);
  if (!entityType || !entityId) return null;
  if (targetsDocumentation(input)) return "documentation";

  switch (entityType) {
    case "note":
      return "note";
    case "task":
      return "task";
    case "collectiveProcess":
    case "individualProcess":
      return "process";
    case "processRequest":
      return "processRequest";
    case "document":
      return "document";
    case "person":
      return "person";
    case "company":
      return "company";
    default:
      return null;
  }
}

export function getSaoPauloDate(timestamp = Date.now()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(timestamp);
}
