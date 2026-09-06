const MONTHS_PT = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
] as const

const MONTH_ABBR_PT = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
] as const

function parseIsoDate(iso: string): { year: number; month: number; day: number } | null {
  const match = iso.trim().match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return null
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return null
  return { year, month, day }
}

export function formatLongDatePt(iso: string | null | undefined): string | null {
  if (!iso) return null
  const parsed = parseIsoDate(iso)
  if (!parsed) return null
  const monthName = MONTHS_PT[parsed.month - 1]
  if (!monthName) return null
  const day = String(parsed.day).padStart(2, "0")
  return `${day} de ${monthName} de ${parsed.year}`
}

export function formatFilenameDatePt(iso: string): string {
  const parsed = parseIsoDate(iso)
  if (!parsed) return iso
  const abbr = MONTH_ABBR_PT[parsed.month - 1] ?? "mes"
  const day = String(parsed.day).padStart(2, "0")
  return `${day}_${abbr}_${parsed.year}`
}

export function todayIsoInSaoPaulo(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(now)
}
