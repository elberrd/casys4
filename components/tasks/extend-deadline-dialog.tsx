"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
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
import { useTranslations } from "next-intl"
import { extendDeadlineSchema, ExtendDeadlineFormData } from "@/lib/validations/tasks"
import { Id } from "@/convex/_generated/dataModel"
import { toast } from "sonner"
import { format } from "date-fns"

interface ExtendDeadlineDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  taskId: Id<"tasks">
  currentDueDate: string
  onSuccess?: () => void
}

export function ExtendDeadlineDialog({
  open,
  onOpenChange,
  taskId,
  currentDueDate,
  onSuccess,
}: ExtendDeadlineDialogProps) {
  const t = useTranslations('Tasks')
  const tCommon = useTranslations('Common')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const extendDeadline = useMutation(api.tasks.extendDeadline)

  const form = useForm<ExtendDeadlineFormData>({
    resolver: zodResolver(extendDeadlineSchema),
    defaultValues: {
      newDueDate: "",
      reason: "",
    },
  })

  const onSubmit = async (data: ExtendDeadlineFormData) => {
    try {
      setIsSubmitting(true)
      await extendDeadline({
        id: taskId,
        newDueDate: data.newDueDate,
      })
      toast.success(t('extendDeadlineSuccess'))
      form.reset()
      onOpenChange(false)
      if (onSuccess) {
        onSuccess()
      }
    } catch (error: any) {
      toast.error(error.message || t('extendDeadlineError'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    form.reset()
    onOpenChange(false)
  }

  // Get tomorrow's date as minimum
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const minDate = tomorrow.toISOString().split('T')[0]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('extendDeadline')}</DialogTitle>
          <DialogDescription>
            {t('extendDeadlineDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 px-3 bg-muted rounded-md">
          <p className="text-sm font-medium">{t('currentDueDate')}</p>
          <p className="text-sm text-muted-foreground">
            {format(new Date(currentDueDate), 'PPP')}
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="newDueDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('newDueDate')}</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      min={minDate}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('extendReason')} ({tCommon('optional')})</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('extendReasonPlaceholder')}
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                {tCommon('cancel')}
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? tCommon('loading') : t('extendDeadline')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
