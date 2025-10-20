/**
 * Status validation utilities for Convex backend
 * These functions validate status transitions for individual and main processes
 */

// Individual Process Statuses
const INDIVIDUAL_PROCESS_STATUSES = {
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

// Main Process Statuses
const MAIN_PROCESS_STATUSES = {
  DRAFT: "draft",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;

/**
 * Status Transition Rules for Individual Processes
 */
const INDIVIDUAL_STATUS_TRANSITIONS: Record<string, string[]> = {
  [INDIVIDUAL_PROCESS_STATUSES.PENDING_DOCUMENTS]: [
    INDIVIDUAL_PROCESS_STATUSES.DOCUMENTS_SUBMITTED,
    INDIVIDUAL_PROCESS_STATUSES.CANCELLED,
  ],
  [INDIVIDUAL_PROCESS_STATUSES.DOCUMENTS_SUBMITTED]: [
    INDIVIDUAL_PROCESS_STATUSES.DOCUMENTS_APPROVED,
    INDIVIDUAL_PROCESS_STATUSES.PENDING_DOCUMENTS,
    INDIVIDUAL_PROCESS_STATUSES.CANCELLED,
  ],
  [INDIVIDUAL_PROCESS_STATUSES.DOCUMENTS_APPROVED]: [
    INDIVIDUAL_PROCESS_STATUSES.PREPARING_SUBMISSION,
    INDIVIDUAL_PROCESS_STATUSES.CANCELLED,
  ],
  [INDIVIDUAL_PROCESS_STATUSES.PREPARING_SUBMISSION]: [
    INDIVIDUAL_PROCESS_STATUSES.SUBMITTED_TO_GOVERNMENT,
    INDIVIDUAL_PROCESS_STATUSES.CANCELLED,
  ],
  [INDIVIDUAL_PROCESS_STATUSES.SUBMITTED_TO_GOVERNMENT]: [
    INDIVIDUAL_PROCESS_STATUSES.UNDER_GOVERNMENT_REVIEW,
    INDIVIDUAL_PROCESS_STATUSES.CANCELLED,
  ],
  [INDIVIDUAL_PROCESS_STATUSES.UNDER_GOVERNMENT_REVIEW]: [
    INDIVIDUAL_PROCESS_STATUSES.GOVERNMENT_APPROVED,
    INDIVIDUAL_PROCESS_STATUSES.GOVERNMENT_REJECTED,
    INDIVIDUAL_PROCESS_STATUSES.CANCELLED,
  ],
  [INDIVIDUAL_PROCESS_STATUSES.GOVERNMENT_APPROVED]: [
    INDIVIDUAL_PROCESS_STATUSES.COMPLETED,
    INDIVIDUAL_PROCESS_STATUSES.CANCELLED,
  ],
  [INDIVIDUAL_PROCESS_STATUSES.GOVERNMENT_REJECTED]: [
    INDIVIDUAL_PROCESS_STATUSES.PENDING_DOCUMENTS,
    INDIVIDUAL_PROCESS_STATUSES.CANCELLED,
  ],
  [INDIVIDUAL_PROCESS_STATUSES.COMPLETED]: [
    INDIVIDUAL_PROCESS_STATUSES.UNDER_GOVERNMENT_REVIEW,
  ],
  [INDIVIDUAL_PROCESS_STATUSES.CANCELLED]: [
    INDIVIDUAL_PROCESS_STATUSES.PENDING_DOCUMENTS,
  ],
};

/**
 * Status Transition Rules for Main Processes
 */
const MAIN_STATUS_TRANSITIONS: Record<string, string[]> = {
  [MAIN_PROCESS_STATUSES.DRAFT]: [
    MAIN_PROCESS_STATUSES.IN_PROGRESS,
    MAIN_PROCESS_STATUSES.CANCELLED,
  ],
  [MAIN_PROCESS_STATUSES.IN_PROGRESS]: [
    MAIN_PROCESS_STATUSES.COMPLETED,
    MAIN_PROCESS_STATUSES.CANCELLED,
  ],
  [MAIN_PROCESS_STATUSES.COMPLETED]: [MAIN_PROCESS_STATUSES.IN_PROGRESS],
  [MAIN_PROCESS_STATUSES.CANCELLED]: [MAIN_PROCESS_STATUSES.IN_PROGRESS],
};

/**
 * Validates if a status transition is allowed for individual processes
 * @param currentStatus - The current status
 * @param newStatus - The desired new status
 * @returns true if transition is valid, false otherwise
 */
export function isValidIndividualStatusTransition(
  currentStatus: string,
  newStatus: string
): boolean {
  // Same status is always valid
  if (currentStatus === newStatus) {
    return true;
  }

  const allowedTransitions = INDIVIDUAL_STATUS_TRANSITIONS[currentStatus];

  // If no transitions defined for current status, reject
  if (!allowedTransitions) {
    return false;
  }

  return allowedTransitions.includes(newStatus);
}

/**
 * Validates if a status transition is allowed for main processes
 * @param currentStatus - The current status
 * @param newStatus - The desired new status
 * @returns true if transition is valid, false otherwise
 */
export function isValidMainStatusTransition(
  currentStatus: string,
  newStatus: string
): boolean {
  // Same status is always valid
  if (currentStatus === newStatus) {
    return true;
  }

  const allowedTransitions = MAIN_STATUS_TRANSITIONS[currentStatus];

  // If no transitions defined for current status, reject
  if (!allowedTransitions) {
    return false;
  }

  return allowedTransitions.includes(newStatus);
}

/**
 * Gets the list of allowed next statuses from current status for individual processes
 * @param currentStatus - The current status
 * @returns Array of valid next statuses
 */
export function getNextAllowedIndividualStatuses(
  currentStatus: string
): string[] {
  return INDIVIDUAL_STATUS_TRANSITIONS[currentStatus] || [];
}

/**
 * Gets the list of allowed next statuses from current status for main processes
 * @param currentStatus - The current status
 * @returns Array of valid next statuses
 */
export function getNextAllowedMainStatuses(currentStatus: string): string[] {
  return MAIN_STATUS_TRANSITIONS[currentStatus] || [];
}
