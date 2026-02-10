/**
 * Pure helper function for document validity checking.
 * No DB access — works with plain values.
 */

export type ValidityStatus = "valid" | "expiring_soon" | "expired" | "missing_date" | "no_rule";

export interface ValidityCheckResult {
  status: ValidityStatus;
  messageKey: string;
  daysValue?: number;
}

/** Threshold in days before the limit when we start warning */
const EXPIRING_SOON_THRESHOLD = 30;

/**
 * Check document validity based on the configured rule.
 *
 * @param validityType - "min_remaining" or "max_age" (or undefined = no rule)
 * @param validityDays - Number of days for the rule
 * @param issueDate - ISO date string (YYYY-MM-DD) when the document was issued
 * @param expiryDate - ISO date string (YYYY-MM-DD) when the document expires
 */
export function checkDocumentValidity(
  validityType: string | undefined,
  validityDays: number | undefined,
  issueDate: string | undefined,
  expiryDate: string | undefined,
): ValidityCheckResult {
  // No rule configured
  if (!validityType || !validityDays) {
    return { status: "no_rule", messageKey: "validity.noRule" };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (validityType === "min_remaining") {
    // Document must have at least `validityDays` days before expiry
    if (!expiryDate) {
      return { status: "missing_date", messageKey: "validity.missingExpiryDate" };
    }

    const expiry = new Date(expiryDate);
    expiry.setHours(0, 0, 0, 0);
    const diffMs = expiry.getTime() - today.getTime();
    const daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (daysRemaining < 0) {
      return { status: "expired", messageKey: "validity.expired", daysValue: Math.abs(daysRemaining) };
    }

    if (daysRemaining < validityDays) {
      // Doesn't meet the minimum remaining validity
      return { status: "expired", messageKey: "validity.insufficientRemaining", daysValue: daysRemaining };
    }

    if (daysRemaining < validityDays + EXPIRING_SOON_THRESHOLD) {
      return { status: "expiring_soon", messageKey: "validity.expiringSoon", daysValue: daysRemaining };
    }

    return { status: "valid", messageKey: "validity.valid", daysValue: daysRemaining };
  }

  if (validityType === "max_age") {
    // Document must have been issued within the last `validityDays` days
    if (!issueDate) {
      return { status: "missing_date", messageKey: "validity.missingIssueDate" };
    }

    const issued = new Date(issueDate);
    issued.setHours(0, 0, 0, 0);
    const diffMs = today.getTime() - issued.getTime();
    const daysSinceIssue = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const daysLeft = validityDays - daysSinceIssue;

    if (daysLeft < 0) {
      return { status: "expired", messageKey: "validity.maxAgeExceeded", daysValue: Math.abs(daysLeft) };
    }

    if (daysLeft < EXPIRING_SOON_THRESHOLD) {
      return { status: "expiring_soon", messageKey: "validity.expiringSoon", daysValue: daysLeft };
    }

    return { status: "valid", messageKey: "validity.valid", daysValue: daysLeft };
  }

  return { status: "no_rule", messageKey: "validity.noRule" };
}
