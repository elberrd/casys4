"use client"

import { useState } from "react"
import { Document, Page, pdfjs } from "react-pdf"
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
  Maximize2,
  Minimize2,
  AlertCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"

// Configure PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`

import "react-pdf/dist/Page/AnnotationLayer.css"
import "react-pdf/dist/Page/TextLayer.css"

interface PDFViewerInnerProps {
  fileUrl: string
  className?: string
}

export function PDFViewerInner({ fileUrl, className }: PDFViewerInnerProps) {
  const [numPages, setNumPages] = useState<number>(0)
  const [pageNumber, setPageNumber] = useState(1)
  const [scale, setScale] = useState(1.0)
  const [rotation, setRotation] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages)
    setIsLoading(false)
    setError(null)
  }

  const onDocumentLoadError = (err: Error) => {
    console.error("PDF load error:", err)
    setIsLoading(false)
    setError("Não foi possível carregar o PDF")
  }

  const goToPreviousPage = () => {
    setPageNumber((prev) => Math.max(prev - 1, 1))
  }

  const goToNextPage = () => {
    setPageNumber((prev) => Math.min(prev + 1, numPages))
  }

  const zoomIn = () => {
    setScale((prev) => Math.min(prev + 0.25, 3))
  }

  const zoomOut = () => {
    setScale((prev) => Math.max(prev - 0.25, 0.5))
  }

  const rotate = () => {
    setRotation((prev) => (prev + 90) % 360)
  }

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => !prev)
  }

  if (error) {
    return (
      <div className={cn("flex flex-col items-center justify-center gap-4 p-8 border rounded-lg bg-muted/30", className)}>
        <AlertCircle className="h-12 w-12 text-destructive" />
        <div className="text-center">
          <p className="font-medium">{error}</p>
          <p className="text-sm text-muted-foreground mt-1">
            Tente baixar o arquivo para visualizar
          </p>
        </div>
        <Button onClick={() => window.open(fileUrl, "_blank")}>
          <Download className="h-4 w-4 mr-2" />
          Baixar PDF
        </Button>
      </div>
    )
  }

  return (
    <div className={cn("flex flex-col", isFullscreen ? "fixed inset-0 z-50 bg-background" : "", className)}>
      {/* Controls */}
      <div className="flex items-center justify-between gap-2 p-2 border-b bg-muted/50 rounded-t-lg">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={goToPreviousPage}
            disabled={pageNumber <= 1}
            className="cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm min-w-[80px] text-center">
            {pageNumber} / {numPages || "..."}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={goToNextPage}
            disabled={pageNumber >= numPages}
            className="cursor-pointer"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={zoomOut}
            disabled={scale <= 0.5}
            className="cursor-pointer"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-sm min-w-[50px] text-center">{Math.round(scale * 100)}%</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={zoomIn}
            disabled={scale >= 3}
            className="cursor-pointer"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={rotate}
            className="cursor-pointer"
          >
            <RotateCw className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleFullscreen}
            className="cursor-pointer"
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open(fileUrl, "_blank")}
            className="cursor-pointer"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* PDF Content */}
      <ScrollArea className={cn("flex-1", isFullscreen ? "h-[calc(100vh-50px)]" : "h-[500px]")}>
        <div className="flex justify-center p-4 min-h-full bg-muted/30">
          {isLoading && (
            <div className="flex flex-col items-center justify-center gap-2">
              <Skeleton className="w-[400px] h-[550px]" />
              <span className="text-sm text-muted-foreground">Carregando PDF...</span>
            </div>
          )}
          <Document
            file={fileUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={null}
            className={cn(isLoading ? "hidden" : "")}
          >
            <Page
              pageNumber={pageNumber}
              scale={scale}
              rotate={rotation}
              renderTextLayer={true}
              renderAnnotationLayer={true}
              className="shadow-lg"
            />
          </Document>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  )
}
