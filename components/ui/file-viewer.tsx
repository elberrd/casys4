"use client"

import { useState, useEffect, useCallback } from "react"
import dynamic from "next/dynamic"
import * as ExcelJS from "exceljs"
import Papa from "papaparse"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Download,
  RotateCw,
  FileText,
  Maximize2,
  Minimize2,
  AlertCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface FileViewerProps {
  fileUrl: string
  fileName: string
  mimeType: string
  className?: string
}

type ViewerType = "pdf" | "image" | "spreadsheet" | "text" | "unsupported"

interface SpreadsheetData {
  headers: string[]
  rows: (string | number | boolean | null)[][]
  sheetNames: string[]
  currentSheet: number
}

function getViewerType(mimeType: string, fileName: string): ViewerType {
  const ext = fileName.split(".").pop()?.toLowerCase() || ""

  if (mimeType === "application/pdf" || ext === "pdf") {
    return "pdf"
  }

  if (mimeType.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"].includes(ext)) {
    return "image"
  }

  if (
    mimeType.includes("spreadsheet") ||
    mimeType.includes("excel") ||
    mimeType === "text/csv" ||
    ["xlsx", "xls", "csv", "ods"].includes(ext)
  ) {
    return "spreadsheet"
  }

  if (mimeType.startsWith("text/") || ["txt", "md", "json", "xml", "html", "css", "js", "ts"].includes(ext)) {
    return "text"
  }

  return "unsupported"
}

// PDF Viewer Component - loaded dynamically to avoid SSR issues
const PDFViewerInner = dynamic(
  () => import("./pdf-viewer-inner").then((mod) => mod.PDFViewerInner),
  {
    ssr: false,
    loading: () => (
      <div className="flex flex-col items-center justify-center gap-2 p-8">
        <Skeleton className="w-[400px] h-[550px]" />
        <span className="text-sm text-muted-foreground">Carregando visualizador de PDF...</span>
      </div>
    ),
  }
)

// PDF Viewer Wrapper Component
function PDFViewer({ fileUrl, className }: { fileUrl: string; className?: string }) {
  return <PDFViewerInner fileUrl={fileUrl} className={className} />
}

// Image Viewer Component
function ImageViewer({ fileUrl, fileName, className }: { fileUrl: string; fileName: string; className?: string }) {
  const [scale, setScale] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [error, setError] = useState(false)

  const zoomIn = () => setScale((prev) => Math.min(prev + 0.25, 5))
  const zoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.25))
  const resetZoom = () => setScale(1)

  if (error) {
    return (
      <div className={cn("flex flex-col items-center justify-center gap-4 p-8 border rounded-lg bg-muted/30", className)}>
        <AlertCircle className="h-12 w-12 text-destructive" />
        <div className="text-center">
          <p className="font-medium">Erro ao carregar imagem</p>
          <p className="text-sm text-muted-foreground mt-1">{fileName}</p>
        </div>
        <Button onClick={() => window.open(fileUrl, "_blank")}>
          <Download className="h-4 w-4 mr-2" />
          Baixar imagem
        </Button>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col", isFullscreen ? "fixed inset-0 z-50 bg-background" : "", className)}>
      {/* Controls */}
      <div className="flex items-center justify-between gap-2 p-2 border-b bg-muted/50 rounded-t-lg">
        <span className="text-sm text-muted-foreground truncate max-w-[200px]">{fileName}</span>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={zoomOut} disabled={scale <= 0.25} className="cursor-pointer">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={resetZoom} className="cursor-pointer">
            <span className="text-xs">{Math.round(scale * 100)}%</span>
          </Button>
          <Button variant="ghost" size="sm" onClick={zoomIn} disabled={scale >= 5} className="cursor-pointer">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setIsFullscreen((prev) => !prev)} className="cursor-pointer">
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => window.open(fileUrl, "_blank")} className="cursor-pointer">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Image Content */}
      <ScrollArea className={cn("flex-1", isFullscreen ? "h-[calc(100vh-50px)]" : "h-[500px]")}>
        <div className="flex items-center justify-center p-4 min-h-full bg-muted/30">
          {isLoading && <Skeleton className="w-[400px] h-[300px]" />}
          <img
            src={fileUrl}
            alt={fileName}
            onLoad={() => setIsLoading(false)}
            onError={() => {
              setIsLoading(false)
              setError(true)
            }}
            style={{ transform: `scale(${scale})`, transformOrigin: "center" }}
            className={cn(
              "max-w-full transition-transform duration-200 rounded shadow-lg",
              isLoading ? "hidden" : ""
            )}
          />
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  )
}

// Spreadsheet Viewer Component
function SpreadsheetViewer({
  fileUrl,
  fileName,
  mimeType,
  className,
}: {
  fileUrl: string
  fileName: string
  mimeType: string
  className?: string
}) {
  const [data, setData] = useState<SpreadsheetData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadSpreadsheet = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(fileUrl)
      if (!response.ok) {
        throw new Error("Falha ao carregar arquivo")
      }

      const ext = fileName.split(".").pop()?.toLowerCase()

      if (ext === "csv" || mimeType === "text/csv") {
        // Parse CSV
        const text = await response.text()
        const result = Papa.parse(text, { header: false, skipEmptyLines: true })
        const rows = result.data as string[][]
        const headers = rows[0] || []
        const dataRows = rows.slice(1)

        setData({
          headers,
          rows: dataRows,
          sheetNames: ["Sheet1"],
          currentSheet: 0,
        })
      } else {
        // Parse Excel
        const buffer = await response.arrayBuffer()
        const workbook = new ExcelJS.Workbook()
        await workbook.xlsx.load(buffer)

        const sheetNames = workbook.worksheets.map((ws) => ws.name)
        const firstSheet = workbook.worksheets[0]

        if (!firstSheet) {
          throw new Error("Nenhuma planilha encontrada")
        }

        const headers: string[] = []
        const rows: (string | number | boolean | null)[][] = []

        firstSheet.eachRow((row, rowNumber) => {
          const rowData = row.values as (string | number | boolean | null)[]
          // ExcelJS row.values starts at index 1, so we slice from 1
          const cleanRowData = rowData.slice(1)

          if (rowNumber === 1) {
            headers.push(...cleanRowData.map((v) => String(v ?? "")))
          } else {
            rows.push(cleanRowData)
          }
        })

        setData({
          headers,
          rows,
          sheetNames,
          currentSheet: 0,
        })
      }
    } catch (err) {
      console.error("Error loading spreadsheet:", err)
      setError("Não foi possível carregar a planilha")
    } finally {
      setIsLoading(false)
    }
  }, [fileUrl, fileName, mimeType])

  useEffect(() => {
    loadSpreadsheet()
  }, [loadSpreadsheet])

  if (isLoading) {
    return (
      <div className={cn("flex flex-col items-center justify-center gap-2 p-8", className)}>
        <Skeleton className="w-full h-[300px]" />
        <span className="text-sm text-muted-foreground">Carregando planilha...</span>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className={cn("flex flex-col items-center justify-center gap-4 p-8 border rounded-lg bg-muted/30", className)}>
        <AlertCircle className="h-12 w-12 text-destructive" />
        <div className="text-center">
          <p className="font-medium">{error || "Erro ao carregar arquivo"}</p>
          <p className="text-sm text-muted-foreground mt-1">{fileName}</p>
        </div>
        <Button onClick={() => window.open(fileUrl, "_blank")}>
          <Download className="h-4 w-4 mr-2" />
          Baixar arquivo
        </Button>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col", className)}>
      {/* Header with download */}
      <div className="flex items-center justify-between gap-2 p-2 border-b bg-muted/50 rounded-t-lg">
        <span className="text-sm text-muted-foreground truncate">{fileName}</span>
        <Button variant="ghost" size="sm" onClick={() => window.open(fileUrl, "_blank")} className="cursor-pointer">
          <Download className="h-4 w-4" />
        </Button>
      </div>

      {/* Sheet tabs */}
      {data.sheetNames.length > 1 && (
        <div className="flex gap-1 p-2 border-b bg-muted/30 overflow-x-auto">
          {data.sheetNames.map((name, index) => (
            <Button
              key={name}
              variant={data.currentSheet === index ? "default" : "ghost"}
              size="sm"
              onClick={() => setData({ ...data, currentSheet: index })}
              className="cursor-pointer"
            >
              {name}
            </Button>
          ))}
        </div>
      )}

      {/* Table */}
      <ScrollArea className="h-[450px]">
        <div className="p-2">
          <table className="w-full border-collapse text-sm">
            <thead className="sticky top-0 bg-background">
              <tr className="bg-muted">
                <th className="border px-3 py-2 text-left font-medium text-muted-foreground w-10">#</th>
                {data.headers.map((header, index) => (
                  <th key={index} className="border px-3 py-2 text-left font-medium whitespace-nowrap">
                    {header || `Col ${index + 1}`}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.slice(0, 500).map((row, rowIndex) => (
                <tr key={rowIndex} className="hover:bg-muted/50">
                  <td className="border px-3 py-2 text-muted-foreground text-center">{rowIndex + 1}</td>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="border px-3 py-2 whitespace-nowrap">
                      {cell !== null && cell !== undefined ? String(cell) : ""}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {data.rows.length > 500 && (
            <p className="text-center text-sm text-muted-foreground mt-4">
              Mostrando 500 de {data.rows.length} linhas
            </p>
          )}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  )
}

// Text Viewer Component
function TextViewer({ fileUrl, fileName, className }: { fileUrl: string; fileName: string; className?: string }) {
  const [content, setContent] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch(fileUrl)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load")
        return res.text()
      })
      .then((text) => {
        setContent(text)
        setIsLoading(false)
      })
      .catch((err) => {
        console.error("Error loading text file:", err)
        setError(true)
        setIsLoading(false)
      })
  }, [fileUrl])

  if (isLoading) {
    return <Skeleton className={cn("w-full h-[400px]", className)} />
  }

  if (error) {
    return (
      <div className={cn("flex flex-col items-center justify-center gap-4 p-8 border rounded-lg bg-muted/30", className)}>
        <AlertCircle className="h-12 w-12 text-destructive" />
        <div className="text-center">
          <p className="font-medium">Erro ao carregar arquivo</p>
          <p className="text-sm text-muted-foreground mt-1">{fileName}</p>
        </div>
        <Button onClick={() => window.open(fileUrl, "_blank")}>
          <Download className="h-4 w-4 mr-2" />
          Baixar arquivo
        </Button>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col", className)}>
      <div className="flex items-center justify-between gap-2 p-2 border-b bg-muted/50 rounded-t-lg">
        <span className="text-sm text-muted-foreground truncate">{fileName}</span>
        <Button variant="ghost" size="sm" onClick={() => window.open(fileUrl, "_blank")} className="cursor-pointer">
          <Download className="h-4 w-4" />
        </Button>
      </div>
      <ScrollArea className="h-[450px] border-x border-b rounded-b-lg">
        <pre className="p-4 text-sm font-mono whitespace-pre-wrap break-words">{content}</pre>
      </ScrollArea>
    </div>
  )
}

// Unsupported File Component
function UnsupportedViewer({
  fileUrl,
  fileName,
  mimeType,
  className,
}: {
  fileUrl: string
  fileName: string
  mimeType: string
  className?: string
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-4 p-8 border rounded-lg bg-muted/30", className)}>
      <FileText className="h-16 w-16 text-muted-foreground" />
      <div className="text-center">
        <p className="font-medium">{fileName}</p>
        <p className="text-sm text-muted-foreground mt-1">
          Tipo: {mimeType || "Desconhecido"}
        </p>
        <p className="text-sm text-muted-foreground">
          Visualização não disponível para este tipo de arquivo
        </p>
      </div>
      <Button onClick={() => window.open(fileUrl, "_blank")} className="cursor-pointer">
        <Download className="h-4 w-4 mr-2" />
        Baixar arquivo
      </Button>
    </div>
  )
}

// Main FileViewer Component
export function FileViewer({ fileUrl, fileName, mimeType, className }: FileViewerProps) {
  const viewerType = getViewerType(mimeType, fileName)

  switch (viewerType) {
    case "pdf":
      return <PDFViewer fileUrl={fileUrl} className={className} />
    case "image":
      return <ImageViewer fileUrl={fileUrl} fileName={fileName} className={className} />
    case "spreadsheet":
      return <SpreadsheetViewer fileUrl={fileUrl} fileName={fileName} mimeType={mimeType} className={className} />
    case "text":
      return <TextViewer fileUrl={fileUrl} fileName={fileName} className={className} />
    default:
      return <UnsupportedViewer fileUrl={fileUrl} fileName={fileName} mimeType={mimeType} className={className} />
  }
}
