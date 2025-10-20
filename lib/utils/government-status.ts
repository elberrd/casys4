/**
 * Government Submission Status Utility
 *
 * Calculates the submission status and progress based on government protocol fields
 */

export type GovernmentSubmissionStatus =
  | "not_started"
  | "preparing"
  | "submitted"
  | "under_review"
  | "approved";

export interface GovernmentStatusResult {
  status: GovernmentSubmissionStatus;
  progress: number; // 0-100
  label: string;
  color: "gray" | "yellow" | "blue" | "green";
}

interface GovernmentFields {
  mreOfficeNumber?: string;
  douNumber?: string;
  douSection?: string;
  douPage?: string;
  douDate?: string;
  protocolNumber?: string;
  rnmNumber?: string;
  rnmDeadline?: string;
  appointmentDateTime?: string;
}

/**
 * Calculate government submission status based on filled fields
 *
 * Status progression:
 * - Not Started: No government fields filled (0%)
 * - Preparing: Some fields filled but no protocol (25-50%)
 * - Submitted: Protocol number present (60%)
 * - Under Review: DOU published (80%)
 * - Approved: RNM number received (100%)
 */
export function calculateGovernmentStatus(fields: GovernmentFields): GovernmentStatusResult {
  const {
    mreOfficeNumber,
    douNumber,
    douDate,
    protocolNumber,
    rnmNumber,
  } = fields;

  // Approved: RNM number received
  if (rnmNumber) {
    return {
      status: "approved",
      progress: 100,
      label: "approved",
      color: "green",
    };
  }

  // Under Review: DOU published
  if (douDate) {
    return {
      status: "under_review",
      progress: 80,
      label: "underReview",
      color: "blue",
    };
  }

  // Submitted: Protocol number present
  if (protocolNumber) {
    return {
      status: "submitted",
      progress: 60,
      label: "submitted",
      color: "blue",
    };
  }

  // Preparing: Some fields filled
  const filledFieldsCount = [
    mreOfficeNumber,
    douNumber,
  ].filter(Boolean).length;

  if (filledFieldsCount > 0) {
    // Calculate progress based on fields filled (25-50%)
    const baseProgress = 25;
    const additionalProgress = (filledFieldsCount / 2) * 25;

    return {
      status: "preparing",
      progress: Math.min(baseProgress + additionalProgress, 50),
      label: "preparing",
      color: "yellow",
    };
  }

  // Not Started: No fields filled
  return {
    status: "not_started",
    progress: 0,
    label: "notStarted",
    color: "gray",
  };
}

/**
 * Calculate percentage of government fields completed
 */
export function calculateGovernmentFieldsCompletion(fields: GovernmentFields): number {
  const allFields = [
    fields.mreOfficeNumber,
    fields.douNumber,
    fields.douSection,
    fields.douPage,
    fields.douDate,
    fields.protocolNumber,
    fields.rnmNumber,
    fields.rnmDeadline,
    fields.appointmentDateTime,
  ];

  const filledFields = allFields.filter(Boolean).length;
  const totalFields = allFields.length;

  return Math.round((filledFields / totalFields) * 100);
}

/**
 * Get the next required action based on current status
 */
export function getNextGovernmentAction(fields: GovernmentFields): string | null {
  const status = calculateGovernmentStatus(fields);

  switch (status.status) {
    case "not_started":
      return "startPreparation";
    case "preparing":
      return fields.protocolNumber ? null : "submitProtocol";
    case "submitted":
      return fields.douDate ? null : "awaitingDOUPublication";
    case "under_review":
      return fields.rnmNumber ? null : "awaitingRNMApproval";
    case "approved":
      return null;
    default:
      return null;
  }
}
