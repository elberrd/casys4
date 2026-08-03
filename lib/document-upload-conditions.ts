import { normalizeString } from "@/lib/utils"

const DISPLAY_ORDER = new Map([
  ["copia do documento original", 0],
  ["apostilado", 1],
  ["traducao juramentada", 2],
])

function getDisplayOrder(conditionName: string): number | undefined {
  return DISPLAY_ORDER.get(normalizeString(conditionName).trim())
}

/**
 * Reorders only the requested upload conditions, preserving the positions and
 * relative order of every unrelated condition.
 */
export function orderDocumentUploadConditions<T extends { name: string }>(
  conditions: readonly T[]
): T[] {
  const orderedTargetConditions = conditions
    .filter((condition) => getDisplayOrder(condition.name) !== undefined)
    .sort(
      (a, b) =>
        (getDisplayOrder(a.name) ?? Number.MAX_SAFE_INTEGER) -
        (getDisplayOrder(b.name) ?? Number.MAX_SAFE_INTEGER)
    )

  let targetIndex = 0

  return conditions.map((condition) => {
    if (getDisplayOrder(condition.name) === undefined) {
      return condition
    }

    const orderedCondition = orderedTargetConditions[targetIndex]
    targetIndex += 1
    return orderedCondition
  })
}
