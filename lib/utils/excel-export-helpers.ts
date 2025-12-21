import * as ExcelJS from "exceljs"

export interface ExcelColumnConfig {
  header: string
  key: string
  width?: number
}

export interface ExcelGroupConfig {
  groupName: string
  rows: any[]
}

/**
 * Export table data to Excel (.xlsx) format with optional grouping and styling
 * @param columns - Array of column configurations with headers and keys
 * @param data - Array of data rows or grouped data (ExcelGroupConfig[])
 * @param filename - Name of the file to download (will add .xlsx extension if missing)
 * @param options - Optional configuration for grouped export and styling
 */
export async function exportToExcel(
  columns: ExcelColumnConfig[],
  data: any[] | ExcelGroupConfig[],
  filename: string,
  options?: {
    grouped?: boolean
    groupHeaderColor?: string
  }
): Promise<void> {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet("Sheet1")

  const groupHeaderColor = options?.groupHeaderColor || "4472C4" // Default blue

  // Add column headers
  worksheet.columns = columns.map((col) => ({
    header: col.header,
    key: col.key,
    width: col.width || calculateColumnWidth(col.header, col.key),
  }))

  // Style the header row
  const headerRow = worksheet.getRow(1)
  headerRow.font = { bold: true, size: 11 }
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFE0E0E0" },
  }
  headerRow.alignment = { vertical: "middle", horizontal: "left" }
  headerRow.border = {
    top: { style: "thin" },
    left: { style: "thin" },
    bottom: { style: "thin" },
    right: { style: "thin" },
  }

  if (options?.grouped && Array.isArray(data) && data.length > 0) {
    // Grouped export
    const groupedData = data as ExcelGroupConfig[]

    for (const group of groupedData) {
      // Skip empty groups
      if (!group.rows || group.rows.length === 0) {
        continue
      }

      // Add group header row
      const groupRow = worksheet.addRow({})
      const groupCell = groupRow.getCell(1)
      groupCell.value = group.groupName

      // Merge cells across all columns
      worksheet.mergeCells(
        groupRow.number,
        1,
        groupRow.number,
        columns.length
      )

      // Style group header
      groupRow.font = { bold: true, size: 12, color: { argb: "FFFFFFFF" } }
      groupRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: `FF${groupHeaderColor}` },
      }
      groupRow.alignment = { vertical: "middle", horizontal: "left" }
      groupRow.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      }
      groupRow.height = 20

      // Add data rows for this group
      for (const row of group.rows) {
        const dataRow = worksheet.addRow(row)
        dataRow.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        }
      }
    }
  } else {
    // Non-grouped export
    const simpleData = data as any[]

    for (const row of simpleData) {
      const dataRow = worksheet.addRow(row)
      dataRow.border = {
        top: { style: "thin" },
        left: { style: "thin" },
        bottom: { style: "thin" },
        right: { style: "thin" },
      }
    }
  }

  // Add auto-filter to header row
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: 1, column: columns.length },
  }

  // Freeze header row
  worksheet.views = [{ state: "frozen", ySplit: 1 }]

  // Generate Excel file
  const buffer = await workbook.xlsx.writeBuffer()

  // Download the file
  downloadExcelFile(buffer, filename)
}

/**
 * Calculate optimal column width based on header and content
 */
function calculateColumnWidth(header: string, key: string): number {
  // Base width on header length
  const headerWidth = header.length * 1.2

  // Common column types with specific widths
  const commonWidths: Record<string, number> = {
    id: 8,
    name: 25,
    email: 30,
    phone: 18,
    date: 15,
    status: 20,
    company: 25,
    nationality: 20,
    processType: 25,
  }

  // Check if key matches common patterns
  for (const [pattern, width] of Object.entries(commonWidths)) {
    if (key.toLowerCase().includes(pattern)) {
      return Math.max(width, headerWidth)
    }
  }

  // Default width with min/max constraints
  return Math.min(Math.max(headerWidth, 10), 50)
}

/**
 * Trigger browser download of Excel file
 */
function downloadExcelFile(buffer: ArrayBuffer, filename: string): void {
  // Ensure filename has .xlsx extension
  const finalFilename = filename.endsWith(".xlsx")
    ? filename
    : `${filename}.xlsx`

  // Create blob and download link
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })

  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = finalFilename
  link.click()

  // Clean up
  URL.revokeObjectURL(url)
}
