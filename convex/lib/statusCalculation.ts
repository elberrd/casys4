/**
 * Status Calculation Logic
 *
 * This module provides utilities to calculate main process status from individual processes.
 * Main process status is now calculated, not stored, based on the linked individual processes.
 */

import { Doc, Id } from "../_generated/dataModel";

export type StatusBreakdown = {
  caseStatusId: Id<"caseStatuses">;
  caseStatusName: string;
  caseStatusNameEn?: string;
  count: number;
};

export type CalculatedStatus = {
  displayText: string;
  displayTextEn: string;
  breakdown: StatusBreakdown[];
  totalProcesses: number;
  hasMultipleStatuses: boolean;
};

/**
 * Calculate main process status from individual processes
 *
 * @param individualProcesses - Array of individual processes with their case status populated
 * @param locale - Current locale ('pt' or 'en')
 * @returns Calculated status object with display text and breakdown
 */
export function calculateMainProcessStatus(
  individualProcesses: Array<
    Doc<"individualProcesses"> & {
      caseStatus?: Doc<"caseStatuses"> | null;
    }
  >,
  locale: "pt" | "en" = "pt"
): CalculatedStatus {
  // Handle empty case
  if (!individualProcesses || individualProcesses.length === 0) {
    return {
      displayText: "Sem processos individuais",
      displayTextEn: "No individual processes",
      breakdown: [],
      totalProcesses: 0,
      hasMultipleStatuses: false,
    };
  }

  // Get breakdown of statuses
  const breakdown = getStatusBreakdown(individualProcesses);

  // Format display text
  const displayText = formatStatusBreakdown(breakdown, "pt");
  const displayTextEn = formatStatusBreakdown(breakdown, "en");

  return {
    displayText,
    displayTextEn,
    breakdown,
    totalProcesses: individualProcesses.length,
    hasMultipleStatuses: breakdown.length > 1,
  };
}

/**
 * Get status breakdown by grouping and counting individual processes by status
 *
 * @param individualProcesses - Array of individual processes with populated case status
 * @returns Array of status breakdown objects sorted by count (descending)
 */
export function getStatusBreakdown(
  individualProcesses: Array<
    Doc<"individualProcesses"> & {
      caseStatus?: Doc<"caseStatuses"> | null;
    }
  >
): StatusBreakdown[] {
  const statusMap = new Map<string, StatusBreakdown>();

  for (const process of individualProcesses) {
    // Skip processes without case status
    if (!process.caseStatus || !process.caseStatusId) {
      continue;
    }

    const statusId = process.caseStatusId;
    const existing = statusMap.get(statusId);

    if (existing) {
      existing.count++;
    } else {
      statusMap.set(statusId, {
        caseStatusId: statusId,
        caseStatusName: process.caseStatus.name,
        caseStatusNameEn: process.caseStatus.nameEn,
        count: 1,
      });
    }
  }

  // Convert map to array and sort by count (descending), then by name
  return Array.from(statusMap.values()).sort((a, b) => {
    if (b.count !== a.count) {
      return b.count - a.count;
    }
    return a.caseStatusName.localeCompare(b.caseStatusName);
  });
}

/**
 * Format status breakdown into human-readable text
 *
 * @param breakdown - Status breakdown array
 * @param locale - Current locale ('pt' or 'en')
 * @returns Formatted string like "3 Deferido, 2 Em Trâmite" or "3 Approved, 2 In Progress"
 */
export function formatStatusBreakdown(
  breakdown: StatusBreakdown[],
  locale: "pt" | "en" = "pt"
): string {
  if (breakdown.length === 0) {
    return locale === "pt" ? "Sem status definido" : "No status defined";
  }

  // If all same status, return single status with count
  if (breakdown.length === 1) {
    const status = breakdown[0];
    const statusName = locale === "en" && status.caseStatusNameEn
      ? status.caseStatusNameEn
      : status.caseStatusName;

    if (status.count === 1) {
      return statusName;
    }
    return `${status.count} ${statusName}`;
  }

  // Multiple statuses - return comma-separated list
  return breakdown
    .map((status) => {
      const statusName = locale === "en" && status.caseStatusNameEn
        ? status.caseStatusNameEn
        : status.caseStatusName;
      return `${status.count} ${statusName}`;
    })
    .join(", ");
}

/**
 * Get the most common status from breakdown (for simplified displays)
 *
 * @param breakdown - Status breakdown array
 * @returns The status with highest count, or null if no statuses
 */
export function getMostCommonStatus(
  breakdown: StatusBreakdown[]
): StatusBreakdown | null {
  if (breakdown.length === 0) {
    return null;
  }

  // Breakdown is already sorted by count descending
  return breakdown[0];
}

/**
 * Check if all individual processes have the same status
 *
 * @param breakdown - Status breakdown array
 * @returns True if all processes share one status, false otherwise
 */
export function hasUniformStatus(breakdown: StatusBreakdown[]): boolean {
  return breakdown.length === 1;
}

/**
 * Get status color for display (from the most common status)
 *
 * @param breakdown - Status breakdown array
 * @param individualProcesses - Array with populated case status objects
 * @returns Hex color code or null
 */
export function getStatusColor(
  breakdown: StatusBreakdown[],
  individualProcesses: Array<
    Doc<"individualProcesses"> & {
      caseStatus?: Doc<"caseStatuses"> | null;
    }
  >
): string | null {
  const mostCommon = getMostCommonStatus(breakdown);
  if (!mostCommon) {
    return null;
  }

  // Find the actual case status object to get color
  const process = individualProcesses.find(
    (p) => p.caseStatusId === mostCommon.caseStatusId
  );

  return process?.caseStatus?.color || null;
}
