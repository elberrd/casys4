"use client"

import { useState } from "react"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Download, CheckCircle, XCircle, Trash2, MoreVertical, Loader2 } from "lucide-react"
import { toast } from "sonner"
import JSZip from "jszip"

interface BulkDocumentActionsMenuProps {
  selectedDocuments: Array<{
    _id: Id<"documentsDelivered">
    fileName?: string
    fileUrl?: string
    status: string
    documentType?: { name: string }
  }>
  onSuccess?: () => void
  userRole: "admin" | "client"
}

interface DialogState {
  deleteConfirm: boolean
  rejectReason: boolean
}

export function BulkDocumentActionsMenu({
  selectedDocuments,
  onSuccess,
  userRole,
}: BulkDocumentActionsMenuProps) {
  const t = useTranslations("BulkDocumentActions")
  const tCommon = useTranslations("Common")

  const [dialogs, setDialogs] = useState<DialogState>({
    deleteConfirm: false,
    rejectReason: false,
  })
  const [rejectionReason, setRejectionReason] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)

  const bulkApproveDocuments = useMutation(api.documentsDelivered.bulkApprove)
  const bulkRejectDocuments = useMutation(api.documentsDelivered.bulkReject)
  const bulkDeleteDocuments = useMutation(api.documentsDelivered.bulkDelete)

  const selectedCount = selectedDocuments.length
  const isAdmin = userRole === "admin"

  // Check if any documents are in a state that can be approved/rejected
  const canApprove = selectedDocuments.some(
    (doc) => doc.status === "uploaded" || doc.status === "under_review"
  )
  const canReject = selectedDocuments.some(
    (doc) => doc.status === "uploaded" || doc.status === "under_review"
  )
  const canDelete = isAdmin && selectedCount > 0

  const handleBulkDownload = async () => {
    setIsProcessing(true)
    try {
      const zip = new JSZip()

      // Create a folder structure: Person Name / Document Type / filename
      for (const doc of selectedDocuments) {
        if (doc.fileUrl && doc.fileName) {
          try {
            // Fetch the file
            const response = await fetch(doc.fileUrl)
            if (!response.ok) {
              throw new Error(`Failed to fetch ${doc.fileName}`)
            }

            const blob = await response.blob()
            const folderName = doc.documentType?.name || "Unknown"
            zip.file(`${folderName}/${doc.fileName}`, blob)
          } catch (error) {
            console.error(`Error downloading ${doc.fileName}:`, error)
            toast.error(t("downloadError", { fileName: doc.fileName }))
          }
        }
      }

      // Generate the zip file
      const content = await zip.generateAsync({ type: "blob" })

      // Trigger download
      const url = URL.createObjectURL(content)
      const a = document.createElement("a")
      a.href = url
      a.download = `documents-${new Date().toISOString().split("T")[0]}.zip`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast.success(t("downloadSuccess", { count: selectedCount }))
    } catch (error) {
      console.error("Error creating zip:", error)
      toast.error(t("downloadFailed"))
    } finally {
      setIsProcessing(false)
    }
  }

  const handleBulkApprove = async () => {
    if (!isAdmin) return

    setIsProcessing(true)
    try {
      const documentIds = selectedDocuments
        .filter((doc) => doc.status === "uploaded" || doc.status === "under_review")
        .map((doc) => doc._id)

      if (documentIds.length === 0) {
        toast.error(t("noDocumentsToApprove"))
        return
      }

      await bulkApproveDocuments({ documentIds })
      toast.success(t("approveSuccess", { count: documentIds.length }))
      onSuccess?.()
    } catch (error) {
      console.error("Error approving documents:", error)
      toast.error(t("approveFailed"))
    } finally {
      setIsProcessing(false)
    }
  }

  const handleBulkReject = async () => {
    if (!isAdmin || !rejectionReason.trim()) return

    setIsProcessing(true)
    try {
      const documentIds = selectedDocuments
        .filter((doc) => doc.status === "uploaded" || doc.status === "under_review")
        .map((doc) => doc._id)

      if (documentIds.length === 0) {
        toast.error(t("noDocumentsToReject"))
        return
      }

      await bulkRejectDocuments({
        documentIds,
        rejectionReason: rejectionReason.trim(),
      })

      toast.success(t("rejectSuccess", { count: documentIds.length }))
      setDialogs({ ...dialogs, rejectReason: false })
      setRejectionReason("")
      onSuccess?.()
    } catch (error) {
      console.error("Error rejecting documents:", error)
      toast.error(t("rejectFailed"))
    } finally {
      setIsProcessing(false)
    }
  }

  const handleBulkDelete = async () => {
    if (!isAdmin) return

    setIsProcessing(true)
    try {
      const documentIds = selectedDocuments.map((doc) => doc._id)

      await bulkDeleteDocuments({ documentIds })
      toast.success(t("deleteSuccess", { count: documentIds.length }))
      setDialogs({ ...dialogs, deleteConfirm: false })
      onSuccess?.()
    } catch (error) {
      console.error("Error deleting documents:", error)
      toast.error(t("deleteFailed"))
    } finally {
      setIsProcessing(false)
    }
  }

  if (selectedCount === 0) {
    return null
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          {t("selected", { count: selectedCount })}
        </span>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={isProcessing}
            >
              {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("bulkActions")}
              <MoreVertical className="h-4 w-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem onClick={handleBulkDownload}>
              <Download className="h-4 w-4 mr-2" />
              {t("downloadAll")}
            </DropdownMenuItem>

            {isAdmin && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleBulkApprove}
                  disabled={!canApprove}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {t("approveAll")}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => setDialogs({ ...dialogs, rejectReason: true })}
                  disabled={!canReject}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  {t("rejectAll")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setDialogs({ ...dialogs, deleteConfirm: true })}
                  disabled={!canDelete}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t("deleteAll")}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Reject Reason Dialog */}
      <Dialog
        open={dialogs.rejectReason}
        onOpenChange={(open) => {
          if (!open) {
            setDialogs({ ...dialogs, rejectReason: false })
            setRejectionReason("")
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("rejectReasonTitle")}</DialogTitle>
            <DialogDescription>
              {t("rejectReasonDescription", { count: selectedCount })}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejectionReason">{t("reason")}</Label>
              <Textarea
                id="rejectionReason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder={t("reasonPlaceholder")}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDialogs({ ...dialogs, rejectReason: false })
                setRejectionReason("")
              }}
            >
              {tCommon("cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkReject}
              disabled={!rejectionReason.trim() || isProcessing}
            >
              {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("rejectAll")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={dialogs.deleteConfirm}
        onOpenChange={(open) => setDialogs({ ...dialogs, deleteConfirm: open })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteConfirmDescription", { count: selectedCount })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isProcessing}
            >
              {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("deleteAll")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
