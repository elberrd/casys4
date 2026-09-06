export type VisaReceiptLocation = "brazil" | "abroad"

export type PlaceName = {
  cityName: string | null
  stateCode: string | null
}

export type VisaReceiptPlaceInput = {
  visaReceiptLocation?: VisaReceiptLocation | null
  receivedInBrazil?: boolean | null
  consularPost?: string | null
  consulate?: PlaceName | null
  workplace?: PlaceName | null
  company?: PlaceName | null
}

function namedPlace(
  cityName: string | null | undefined,
  stateCode: string | null | undefined,
): PlaceName | null {
  const city = cityName?.trim() || null
  if (!city) return null
  return { cityName: city, stateCode: stateCode?.trim() || null }
}

function resolveReceiptDestination(
  visaReceiptLocation: VisaReceiptLocation | null | undefined,
  receivedInBrazil: boolean | null | undefined,
): VisaReceiptLocation | null {
  if (visaReceiptLocation === "brazil" || visaReceiptLocation === "abroad") {
    return visaReceiptLocation
  }
  if (receivedInBrazil === true) return "brazil"
  if (receivedInBrazil === false) return "abroad"
  return null
}

/**
 * City printed before the report date, taken from "Local de Recebimento do Visto":
 * Brazil → workplace / company city; abroad → consular post / consulate city.
 */
export function resolveVisaReceiptPlace(input: VisaReceiptPlaceInput): PlaceName {
  const destination = resolveReceiptDestination(
    input.visaReceiptLocation,
    input.receivedInBrazil,
  )
  const consularPost = namedPlace(input.consularPost, null)
  const consulate = namedPlace(input.consulate?.cityName, input.consulate?.stateCode)
  const workplace = namedPlace(input.workplace?.cityName, input.workplace?.stateCode)
  const company = namedPlace(input.company?.cityName, input.company?.stateCode)

  if (destination === "abroad") {
    return consularPost ?? consulate ?? { cityName: null, stateCode: null }
  }

  if (destination === "brazil") {
    return workplace ?? company ?? consulate ?? { cityName: null, stateCode: null }
  }

  return (
    workplace ??
    company ??
    consularPost ??
    consulate ?? { cityName: null, stateCode: null }
  )
}
