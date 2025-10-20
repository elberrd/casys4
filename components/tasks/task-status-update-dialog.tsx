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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { useTranslations } from "next-intl"
import { updateStatusSchema, UpdateStatusFormData, statusOptions } from "@/lib/validations/tasks"
import { Id } from "@/convex/_generated/dataModel"
import { toast } from "sonner"

interface TaskStatusUpdateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  taskId: Id<"tasks">
  currentStatus: "todo" | "in_progress" | "completed" | "cancelled"
  onSuccess?: () => void
}

export function TaskStatusUpdateDialog({
  open,
  onOpenChange,
  taskId,
  currentStatus,
  onSuccess,
}: TaskStatusUpdateDialogProps) {
  const t = useTranslations('Tasks')
  const tCommon = useTranslations('Common')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const updateTask = useMutation(api.tasks.update)

  const form = useForm<UpdateStatusFormData>({
    resolver: zodResolver(updateStatusSchema),
    defaultValues: {
      newStatus: currentStatus,
      notes: "",
    },
  })

  const onSubmit = async (data: UpdateStatusFormData) => {
    try {
      setIsSubmitting(true)
      await updateTask({
        id: taskId,
        status: data.newStatus,
      })
      toast.success(t('statusUpdateSuccess'))
      form.reset()
      onOpenChange(false)
      if (onSuccess) {
        onSuccess()
      }
    } catch (error: any) {
      toast.error(error.message || t('statusUpdateError'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    form.reset()
    onOpenChange(false)
  }

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "completed":
        return "default"
      case "in_progress":
        return "secondary"
      case "cancelled":
        return "destructive"
      default:
        return "outline"
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('updateStatus')}</DialogTitle>
          <DialogDescription>
            {t('updateStatusDescription')}
          </DialogDescription>
        </DialogHeader>

        <div className="py-2 px-3 bg-muted rounded-md">
          <p className="text-sm font-medium">{t('currentStatus')}</p>
          <Badge variant={getStatusVariant(currentStatus)} className="mt-1">
            {t(`statuses.${currentStatus}`)}
          </Badge>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="newStatus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('newStatus')}</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t('selectStatus')} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {statusOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {t(`statuses.${option.value}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('statusNotes')} ({tCommon('optional')})</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('statusNotesPlaceholder')}
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
                {isSubmitting ? tCommon('loading') : t('updateStatus')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
