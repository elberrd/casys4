"use client"

import { useEffect } from "react"
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { useTranslations } from "next-intl"
import { companyGroupSchema, CompanyGroupFormData } from "@/lib/validations/company-groups"
import { Id } from "@/convex/_generated/dataModel"
import { useToast } from "@/hooks/use-toast"
import { UnsavedChangesDialog } from "@/components/ui/unsaved-changes-dialog"
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes"

interface CompanyGroupFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  companyGroupId?: Id<"companyGroups">
  onSuccess?: () => void
}

export function CompanyGroupFormDialog({
  open,
  onOpenChange,
  companyGroupId,
  onSuccess,
}: CompanyGroupFormDialogProps) {
  const t = useTranslations("CompanyGroups")
  const tCommon = useTranslations("Common")
  const { toast } = useToast()

  const companyGroup = useQuery(
    api.companyGroups.get,
    companyGroupId ? { id: companyGroupId } : "skip"
  )

  const createCompanyGroup = useMutation(api.companyGroups.create)
  const updateCompanyGroup = useMutation(api.companyGroups.update)

  const form = useForm<CompanyGroupFormData>({
    resolver: zodResolver(companyGroupSchema),
    defaultValues: {
      name: "",
      description: "",
      isActive: true,
    },
  })

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

  useEffect(() => {
    if (companyGroup) {
      form.reset({
        name: companyGroup.name,
        description: companyGroup.description ?? "",
        isActive: companyGroup.isActive,
      })
    } else if (!companyGroupId) {
      form.reset({
        name: "",
        description: "",
        isActive: true,
      })
    }
  }, [companyGroup, companyGroupId, form])

  const onSubmit = async (data: CompanyGroupFormData) => {
    try {
      const submitData = {
        name: data.name,
        description: data.description || undefined,
        isActive: data.isActive ?? true,
      }

      if (companyGroupId) {
        await updateCompanyGroup({ id: companyGroupId, ...submitData })
        toast({
          title: t("updatedSuccess"),
        })
      } else {
        await createCompanyGroup(submitData)
        toast({
          title: t("createdSuccess"),
        })
      }
      form.reset()
      onSuccess?.()
    } catch (error) {
      toast({
        title: companyGroupId ? t("errorUpdate") : t("errorCreate"),
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      })
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {companyGroupId ? t("editTitle") : t("createTitle")}
            </DialogTitle>
            <DialogDescription>
              {companyGroupId ? t("editDescription") : t("createDescription")}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("name")}</FormLabel>
                    <FormControl>
                      <Input placeholder={t("namePlaceholder")} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("descriptionLabel")}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t("descriptionPlaceholder")}
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>{t("isActive")}</FormLabel>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  {tCommon("cancel")}
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? tCommon("loading") : tCommon("save")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <UnsavedChangesDialog
        open={showUnsavedDialog}
        onOpenChange={setShowUnsavedDialog}
        onConfirm={handleConfirmClose}
        onCancel={handleCancelClose}
      />
    </>
  )
}
