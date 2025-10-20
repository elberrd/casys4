import {
  INDIVIDUAL_STATUS_TRANSITIONS,
  MAIN_STATUS_TRANSITIONS,
  STATUS_COLORS,
  DEFAULT_STATUS_COLOR,
} from "../constants/process-statuses";

/**
 * Validates if a status transition is allowed for individual processes
 * @param currentStatus - The current status
 * @param newStatus - The desired new status
 * @returns true if transition is valid, false otherwise
 */
export function isValidIndividualStatusTransition(
  currentStatus: string,
  newStatus: string,
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
  newStatus: string,
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
 * Generic status transition validator
 * @param currentStatus - The current status
 * @param newStatus - The desired new status
 * @param processType - Type of process ("main" or "individual")
 * @returns true if transition is valid, false otherwise
 */
export function isValidStatusTransition(
  currentStatus: string,
  newStatus: string,
  processType: "main" | "individual",
): boolean {
  if (processType === "main") {
    return isValidMainStatusTransition(currentStatus, newStatus);
  } else {
    return isValidIndividualStatusTransition(currentStatus, newStatus);
  }
}

/**
 * Gets the list of allowed next statuses from current status for individual processes
 * @param currentStatus - The current status
 * @returns Array of valid next statuses
 */
export function getNextAllowedIndividualStatuses(
  currentStatus: string,
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

/**
 * Generic next statuses getter
 * @param currentStatus - The current status
 * @param processType - Type of process ("main" or "individual")
 * @returns Array of valid next statuses
 */
export function getNextAllowedStatuses(
  currentStatus: string,
  processType: "main" | "individual",
): string[] {
  if (processType === "main") {
    return getNextAllowedMainStatuses(currentStatus);
  } else {
    return getNextAllowedIndividualStatuses(currentStatus);
  }
}

/**
 * Gets the Tailwind CSS color classes for a status badge
 * @param status - The status to get colors for
 * @returns Tailwind CSS classes string for badge styling
 */
export function getStatusColor(status: string): string {
  return STATUS_COLORS[status] || DEFAULT_STATUS_COLOR;
}

/**
 * Formats a status string for display
 * Converts snake_case to Title Case with spaces
 * @param status - The status string to format
 * @returns Formatted status string
 */
export function formatStatus(status: string): string {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}
