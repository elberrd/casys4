"use client"

import { useEffect, useMemo } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Combobox } from "@/components/ui/combobox"
import { Separator } from "@/components/ui/separator"
import { useTranslations } from "next-intl"
import { legalFrameworkSchema, LegalFrameworkFormData } from "@/lib/validations/legalFrameworks"
import { Id } from "@/convex/_generated/dataModel"
import { useToast } from "@/hooks/use-toast"
import { UnsavedChangesDialog } from "@/components/ui/unsaved-changes-dialog"
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes"
import { DocumentTypeAssociationSection } from "./document-type-association-section"
import { InfoRequirementsSection } from "./info-requirements-section"

interface LegalFrameworkFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  legalFrameworkId?: Id<"legalFrameworks">
  onSuccess?: (createdId?: Id<"legalFrameworks">) => void
}

export function LegalFrameworkFormDialog({
  open,
  onOpenChange,
  legalFrameworkId,
  onSuccess,
}: LegalFrameworkFormDialogProps) {
  const t = useTranslations('LegalFrameworks')
  const tCommon = useTranslations('Common')
  const { toast } = useToast()

  const legalFramework = useQuery(
    api.legalFrameworks.get,
    legalFrameworkId ? { id: legalFrameworkId } : "skip"
  )

  const processTypes = useQuery(api.processTypes.listActive, {}) ?? []

  const createLegalFramework = useMutation(api.legalFrameworks.create)
  const updateLegalFramework = useMutation(api.legalFrameworks.update)

  // Prepare process types options for combobox
  const processTypeOptions = useMemo(
    () =>
      processTypes.map((pt) => ({
        value: pt._id,
        label: pt.name,
      })),
    [processTypes]
  )

  const form = useForm<LegalFrameworkFormData>({
    resolver: zodResolver(legalFrameworkSchema),
    defaultValues: {
      name: "",
      description: "",
      processTypeIds: [],
      isActive: true,
      documentTypeAssociations: [],
    },
  })

  // Unsaved changes protection
  const {
    showUnsavedDialog,
    setShowUnsavedDialog,
    handleOpenChange,
    handleConfirmClose,
    handleCancelClose,
  } = useUnsavedChanges({
    formState: form.formState,
    onConfirmedClose: () => {
      form.reset()
      onOpenChange(false)
    },
    isSubmitting: form.formState.isSubmitting,
  })

  // Reset form when legal framework data loads
  useEffect(() => {
    if (legalFramework) {
      form.reset({
        name: legalFramework.name,
        description: legalFramework.description,
        processTypeIds: legalFramework.processTypes?.map((pt) => pt._id) || [],
        isActive: legalFramework.isActive,
        documentTypeAssociations: legalFramework.documentTypeAssociations?.map((a) => ({
          documentTypeId: a.documentTypeId,
          isRequired: a.isRequired,
          validityType: a.validityType as "min_remaining" | "max_age" | undefined,
          validityDays: a.validityDays,
        })) || [],
      })
    } else if (!legalFrameworkId) {
      form.reset({
        name: "",
        description: "",
        processTypeIds: [],
        isActive: true,
        documentTypeAssociations: [],
      })
    }
  }, [legalFramework, legalFrameworkId, form])

  const onSubmit = async (data: LegalFrameworkFormData) => {
    try {
      // Clean optional fields and convert IDs to the correct types
      const documentTypeAssociations = data.documentTypeAssociations?.map((a) => ({
        documentTypeId: a.documentTypeId as Id<"documentTypes">,
        isRequired: a.isRequired,
        validityType: a.validityType,
        validityDays: a.validityDays,
      }))

      const submitData = {
        ...data,
        description: data.description || undefined,
        processTypeIds: data.processTypeIds && data.processTypeIds.length > 0
          ? data.processTypeIds as Id<"processTypes">[]
          : undefined,
        documentTypeAssociations: documentTypeAssociations && documentTypeAssociations.length > 0
          ? documentTypeAssociations
          : undefined,
      }

      let createdId: Id<"legalFrameworks"> | undefined

      if (legalFrameworkId) {
        await updateLegalFramework({ id: legalFrameworkId, ...submitData })
        toast({
          title: t('updatedSuccess'),
        })
      } else {
        createdId = await createLegalFramework(submitData)
        toast({
          title: t('createdSuccess'),
        })
      }
      form.reset()
      onSuccess?.(createdId)
    } catch (error) {
      toast({
        title: legalFrameworkId ? t('errorUpdate') : t('errorCreate'),
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      })
    }
  }

  return (
    <>
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>
            {legalFrameworkId ? t('editTitle') : t('createTitle')}
          </DialogTitle>
          <DialogDescription>
            {legalFrameworkId
              ? t('editDescription')
              : t('createDescription')
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col min-h-0 flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto pr-2 space-y-4 pb-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('name')}</FormLabel>
                  <FormControl>
                    <Input placeholder="Law 13.445/2017" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="processTypeIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('processType')}</FormLabel>
                  <FormControl>
                    <Combobox
                      multiple
                      options={processTypeOptions}
                      value={field.value || []}
                      onValueChange={field.onChange}
                      placeholder={t('selectProcessType')}
                      searchPlaceholder={tCommon('search')}
                      emptyText={tCommon('noResults')}
                    />
                  </FormControl>
                  <FormDescription>
                    Select the process types this legal framework applies to
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('description')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Description of the legal framework..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator className="my-4" />

            {/* Document Type Associations Section */}
            <FormField
              control={form.control}
              name="documentTypeAssociations"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <DocumentTypeAssociationSection
                      value={field.value || []}
                      onChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Info Requirements Section - Only show in edit mode */}
            {legalFrameworkId && (
              <>
                <Separator className="my-4" />
                <InfoRequirementsSection legalFrameworkId={legalFrameworkId} />
              </>
            )}

            <Separator className="my-4" />

            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      {t('isActive')}
                    </FormLabel>
                    <FormDescription>
                      Active legal frameworks are available for selection
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
            </div>

            <DialogFooter className="flex-shrink-0 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={form.formState.isSubmitting}
              >
                {tCommon('cancel')}
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? tCommon('loading') : tCommon('save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>

    {/* Unsaved Changes Confirmation Dialog */}
    <UnsavedChangesDialog
      open={showUnsavedDialog}
      onOpenChange={setShowUnsavedDialog}
      onConfirm={handleConfirmClose}
      onCancel={handleCancelClose}
    />
    </>
  )
}
