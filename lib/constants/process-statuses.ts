/**
 * Status constants for collective and individual processes
 * Provides type-safe status values, transition rules, and UI color mappings
 */

// Collective Process Statuses
export const COLLECTIVE_PROCESS_STATUSES = {
  DRAFT: "main_draft",
  IN_PROGRESS: "main_in_progress",
  COMPLETED: "main_completed",
  CANCELLED: "main_cancelled",
} as const;

export type CollectiveProcessStatus =
  (typeof COLLECTIVE_PROCESS_STATUSES)[keyof typeof COLLECTIVE_PROCESS_STATUSES];

// Individual Process Statuses
export const INDIVIDUAL_PROCESS_STATUSES = {
  PENDING_DOCUMENTS: "pending_documents",
  DOCUMENTS_SUBMITTED: "documents_submitted",
  DOCUMENTS_APPROVED: "documents_approved",
  PREPARING_SUBMISSION: "preparing_submission",
  SUBMITTED_TO_GOVERNMENT: "submitted_to_government",
  UNDER_GOVERNMENT_REVIEW: "under_government_review",
  GOVERNMENT_APPROVED: "government_approved",
  GOVERNMENT_REJECTED: "government_rejected",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;

export type IndividualProcessStatus =
  (typeof INDIVIDUAL_PROCESS_STATUSES)[keyof typeof INDIVIDUAL_PROCESS_STATUSES];

/**
 * Status Transition Rules for Individual Processes
 * Maps each status to an array of valid next statuses
 */
export const INDIVIDUAL_STATUS_TRANSITIONS: Record<
  string,
  string[]
> = {
  // From pending documents
  [INDIVIDUAL_PROCESS_STATUSES.PENDING_DOCUMENTS]: [
    INDIVIDUAL_PROCESS_STATUSES.DOCUMENTS_SUBMITTED,
    INDIVIDUAL_PROCESS_STATUSES.CANCELLED,
  ],
  // From documents submitted
  [INDIVIDUAL_PROCESS_STATUSES.DOCUMENTS_SUBMITTED]: [
    INDIVIDUAL_PROCESS_STATUSES.DOCUMENTS_APPROVED,
    INDIVIDUAL_PROCESS_STATUSES.PENDING_DOCUMENTS, // Rejected, need to resubmit
    INDIVIDUAL_PROCESS_STATUSES.CANCELLED,
  ],
  // From documents approved
  [INDIVIDUAL_PROCESS_STATUSES.DOCUMENTS_APPROVED]: [
    INDIVIDUAL_PROCESS_STATUSES.PREPARING_SUBMISSION,
    INDIVIDUAL_PROCESS_STATUSES.CANCELLED,
  ],
  // From preparing submission
  [INDIVIDUAL_PROCESS_STATUSES.PREPARING_SUBMISSION]: [
    INDIVIDUAL_PROCESS_STATUSES.SUBMITTED_TO_GOVERNMENT,
    INDIVIDUAL_PROCESS_STATUSES.CANCELLED,
  ],
  // From submitted to government
  [INDIVIDUAL_PROCESS_STATUSES.SUBMITTED_TO_GOVERNMENT]: [
    INDIVIDUAL_PROCESS_STATUSES.UNDER_GOVERNMENT_REVIEW,
    INDIVIDUAL_PROCESS_STATUSES.CANCELLED,
  ],
  // From under government review
  [INDIVIDUAL_PROCESS_STATUSES.UNDER_GOVERNMENT_REVIEW]: [
    INDIVIDUAL_PROCESS_STATUSES.GOVERNMENT_APPROVED,
    INDIVIDUAL_PROCESS_STATUSES.GOVERNMENT_REJECTED,
    INDIVIDUAL_PROCESS_STATUSES.CANCELLED,
  ],
  // From government approved
  [INDIVIDUAL_PROCESS_STATUSES.GOVERNMENT_APPROVED]: [
    INDIVIDUAL_PROCESS_STATUSES.COMPLETED,
    INDIVIDUAL_PROCESS_STATUSES.CANCELLED,
  ],
  // From government rejected
  [INDIVIDUAL_PROCESS_STATUSES.GOVERNMENT_REJECTED]: [
    INDIVIDUAL_PROCESS_STATUSES.PENDING_DOCUMENTS, // Start over
    INDIVIDUAL_PROCESS_STATUSES.CANCELLED,
  ],
  // From completed (can reopen to in progress)
  [INDIVIDUAL_PROCESS_STATUSES.COMPLETED]: [
    INDIVIDUAL_PROCESS_STATUSES.UNDER_GOVERNMENT_REVIEW, // Reopen if needed
  ],
  // From cancelled (can reopen to last known status)
  [INDIVIDUAL_PROCESS_STATUSES.CANCELLED]: [
    INDIVIDUAL_PROCESS_STATUSES.PENDING_DOCUMENTS, // Restart
  ],
};

/**
 * Status Transition Rules for Collective Processes
 * Maps each status to an array of valid next statuses
 */
export const COLLECTIVE_STATUS_TRANSITIONS: Record<string, string[]> = {
  // From draft
  [COLLECTIVE_PROCESS_STATUSES.DRAFT]: [
    COLLECTIVE_PROCESS_STATUSES.IN_PROGRESS,
    COLLECTIVE_PROCESS_STATUSES.CANCELLED,
  ],
  // From in progress
  [COLLECTIVE_PROCESS_STATUSES.IN_PROGRESS]: [
    COLLECTIVE_PROCESS_STATUSES.COMPLETED,
    COLLECTIVE_PROCESS_STATUSES.CANCELLED,
  ],
  // From completed (can reopen)
  [COLLECTIVE_PROCESS_STATUSES.COMPLETED]: [COLLECTIVE_PROCESS_STATUSES.IN_PROGRESS],
  // From cancelled (can reopen)
  [COLLECTIVE_PROCESS_STATUSES.CANCELLED]: [COLLECTIVE_PROCESS_STATUSES.IN_PROGRESS],
};

/**
 * Tailwind color classes for status badges
 * Uses semantic colors for status indication
 */
export const STATUS_COLORS: Record<string, string> = {
  // Collective process statuses
  [COLLECTIVE_PROCESS_STATUSES.DRAFT]: "bg-gray-100 text-gray-800 border-gray-300",
  [COLLECTIVE_PROCESS_STATUSES.IN_PROGRESS]:
    "bg-blue-100 text-blue-800 border-blue-300",
  [COLLECTIVE_PROCESS_STATUSES.COMPLETED]:
    "bg-green-100 text-green-800 border-green-300",
  [COLLECTIVE_PROCESS_STATUSES.CANCELLED]: "bg-red-100 text-red-800 border-red-300",

  // Individual process statuses
  [INDIVIDUAL_PROCESS_STATUSES.PENDING_DOCUMENTS]:
    "bg-yellow-100 text-yellow-800 border-yellow-300",
  [INDIVIDUAL_PROCESS_STATUSES.DOCUMENTS_SUBMITTED]:
    "bg-blue-100 text-blue-800 border-blue-300",
  [INDIVIDUAL_PROCESS_STATUSES.DOCUMENTS_APPROVED]:
    "bg-cyan-100 text-cyan-800 border-cyan-300",
  [INDIVIDUAL_PROCESS_STATUSES.PREPARING_SUBMISSION]:
    "bg-indigo-100 text-indigo-800 border-indigo-300",
  [INDIVIDUAL_PROCESS_STATUSES.SUBMITTED_TO_GOVERNMENT]:
    "bg-purple-100 text-purple-800 border-purple-300",
  [INDIVIDUAL_PROCESS_STATUSES.UNDER_GOVERNMENT_REVIEW]:
    "bg-violet-100 text-violet-800 border-violet-300",
  [INDIVIDUAL_PROCESS_STATUSES.GOVERNMENT_APPROVED]:
    "bg-emerald-100 text-emerald-800 border-emerald-300",
  [INDIVIDUAL_PROCESS_STATUSES.GOVERNMENT_REJECTED]:
    "bg-rose-100 text-rose-800 border-rose-300",
  [INDIVIDUAL_PROCESS_STATUSES.COMPLETED]:
    "bg-green-100 text-green-800 border-green-300",
  [INDIVIDUAL_PROCESS_STATUSES.CANCELLED]:
    "bg-red-100 text-red-800 border-red-300",
};

/**
 * Default color for unknown statuses
 */
export const DEFAULT_STATUS_COLOR = "bg-gray-100 text-gray-800 border-gray-300";
