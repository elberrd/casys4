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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useTranslations } from "next-intl"
import { caseStatusSchema, CaseStatusFormData, caseStatusCategories } from "@/lib/validations/caseStatuses"
import { Id } from "@/convex/_generated/dataModel"
import { useToast } from "@/hooks/use-toast"

interface CaseStatusFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  caseStatusId?: Id<"caseStatuses">
  onSuccess?: () => void
}

export function CaseStatusFormDialog({
  open,
  onOpenChange,
  caseStatusId,
  onSuccess,
}: CaseStatusFormDialogProps) {
  const t = useTranslations('CaseStatuses')
  const tCommon = useTranslations('Common')
  const { toast } = useToast()

  const caseStatus = useQuery(
    api.caseStatuses.get,
    caseStatusId ? { id: caseStatusId } : "skip"
  )

  const allStatuses = useQuery(api.caseStatuses.list, { includeInactive: true }) ?? []
  const createCaseStatus = useMutation(api.caseStatuses.create)
  const updateCaseStatus = useMutation(api.caseStatuses.update)

  // Calculate next sort order for new statuses
  const nextSortOrder = allStatuses.length > 0
    ? Math.max(...allStatuses.map(s => s.sortOrder)) + 1
    : 1

  const form = useForm<CaseStatusFormData>({
    resolver: zodResolver(caseStatusSchema),
    defaultValues: {
      name: "",
      nameEn: "",
      code: "",
      description: "",
      category: "",
      color: "#3B82F6",
      sortOrder: nextSortOrder,
      orderNumber: undefined,
    },
  })

  // Reset form when case status data loads
  useEffect(() => {
    if (caseStatus) {
      form.reset({
        name: caseStatus.name,
        nameEn: caseStatus.nameEn || "",
        code: caseStatus.code,
        description: caseStatus.description || "",
        category: (caseStatus.category || "") as "" | "preparation" | "in_progress" | "review" | "approved" | "completed" | "cancelled",
        color: caseStatus.color || "#3B82F6",
        sortOrder: caseStatus.sortOrder,
        orderNumber: caseStatus.orderNumber,
      })
    } else if (!caseStatusId) {
      form.reset({
        name: "",
        nameEn: "",
        code: "",
        description: "",
        category: "",
        color: "#3B82F6",
        sortOrder: nextSortOrder,
        orderNumber: undefined,
      })
    }
  }, [caseStatus, caseStatusId, form, nextSortOrder])

  const onSubmit = async (data: CaseStatusFormData) => {
    try {
      // Convert empty strings to undefined
      const submitData = {
        ...data,
        nameEn: data.nameEn === "" ? undefined : data.nameEn,
        description: data.description === "" ? undefined : data.description,
        category: data.category === "" ? undefined : data.category,
        color: data.color === "" ? undefined : data.color,
        orderNumber: data.orderNumber === "" || data.orderNumber === undefined ? undefined : data.orderNumber,
      }

      if (caseStatusId) {
        await updateCaseStatus({ id: caseStatusId, ...submitData })
        toast({
          title: t('updatedSuccess'),
        })
      } else {
        await createCaseStatus(submitData)
        toast({
          title: t('createdSuccess'),
        })
      }
      form.reset()
      onSuccess?.()
    } catch (error) {
      toast({
        title: caseStatusId ? t('errorUpdate') : t('errorCreate'),
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {caseStatusId ? t('editTitle') : t('createTitle')}
          </DialogTitle>
          <DialogDescription>
            {caseStatusId
              ? t('editDescription')
              : t('createDescription')
            }
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('name')}</FormLabel>
                    <FormControl>
                      <Input placeholder="Em Preparação" {...field} />
                    </FormControl>
                    <FormDescription>
                      {t('nameDescription')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nameEn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('nameEn')}</FormLabel>
                    <FormControl>
                      <Input placeholder="In Preparation" {...field} />
                    </FormControl>
                    <FormDescription>
                      {t('nameEnDescription')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('code')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="em_preparacao"
                      {...field}
                      disabled={!!caseStatusId}
                    />
                  </FormControl>
                  <FormDescription>
                    {t('codeDescription')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="sortOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('sortOrder')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                      />
                    </FormControl>
                    <FormDescription>
                      {t('sortOrderDescription')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="orderNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('orderNumber')}</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="1"
                        max="99"
                        placeholder={t('orderNumberPlaceholder')}
                        {...field}
                        value={field.value ?? ""}
                        onChange={(e) => {
                          const val = e.target.value;
                          field.onChange(val === "" ? undefined : parseInt(val));
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      {t('orderNumberHelp')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('category')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('selectCategory')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {caseStatusCategories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {t(`categories.${cat}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      {t('categoryDescription')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('color')}</FormLabel>
                    <div className="flex gap-2">
                      <FormControl>
                        <Input
                          type="color"
                          className="w-20 h-10 p-1 cursor-pointer"
                          {...field}
                        />
                      </FormControl>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="#3B82F6"
                          className="flex-1"
                          {...field}
                        />
                      </FormControl>
                    </div>
                    <FormDescription>
                      {t('colorDescription')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('description')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('descriptionPlaceholder')}
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {t('descriptionDescription')}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
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
  )
}
