"use client"

import { ReactNode } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Edit } from "lucide-react"
import { useTranslations } from "next-intl"

export interface ViewField {
  label: string
  value: ReactNode
  fullWidth?: boolean
  icon?: ReactNode
  className?: string
}

export interface ViewSection {
  title: string
  icon?: ReactNode
  fields: ViewField[]
}

export type EntityViewModalSize = "sm" | "md" | "lg" | "xl" | "2xl" | "full"

interface EntityViewModalProps<T> {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  sections: ViewSection[]
  onEdit?: () => void
  size?: EntityViewModalSize
  loading?: boolean
  entity?: T
  loadingText?: string
  editButtonText?: string
  children?: ReactNode
  customHeader?: ReactNode
}

const sizeClasses: Record<EntityViewModalSize, string> = {
  sm: "max-w-lg",
  md: "max-w-2xl",
  lg: "max-w-4xl",
  xl: "max-w-6xl",
  "2xl": "max-w-7xl",
  full: "max-w-[95vw]",
}

export function EntityViewModal<T>({
  open,
  onOpenChange,
  title,
  sections,
  onEdit,
  size = "lg",
  loading = false,
  loadingText,
  editButtonText,
  children,
  customHeader,
}: EntityViewModalProps<T>) {
  const tCommon = useTranslations("Common")

  const defaultLoadingText = loadingText || tCommon("loading")
  const defaultEditButtonText = editButtonText || tCommon("edit")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${sizeClasses[size]} flex max-h-[calc(100vh-2rem)] flex-col overflow-hidden p-0 sm:max-h-[90vh]`}>
        <DialogHeader className="shrink-0 border-b bg-background px-6 pb-3 pt-6 pr-14">
          <DialogTitle className="text-xl font-semibold">{title}</DialogTitle>
          {onEdit && !loading && (
            <Button
              onClick={() => {
                onEdit()
                onOpenChange(false)
              }}
              size="sm"
              className="ml-auto mr-2"
            >
              <Edit className="h-4 w-4 mr-2" />
              {defaultEditButtonText}
            </Button>
          )}
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8 px-6">
            <p className="text-muted-foreground">{defaultLoadingText}</p>
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6 pt-4">
            {customHeader && <div className="mb-4">{customHeader}</div>}
            <div className="space-y-6 pr-2">
              {sections.map((section, sectionIndex) => (
                <Card key={sectionIndex}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      {section.icon}
                      {section.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {section.fields.map((field, fieldIndex) => (
                      <div
                        key={fieldIndex}
                        className={`${
                          field.fullWidth ? "md:col-span-2" : ""
                        } ${field.className || ""}`}
                      >
                        <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                          {field.icon}
                          {field.label}
                        </p>
                        <div className="text-sm mt-1">
                          {field.value}
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}

              {children}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
