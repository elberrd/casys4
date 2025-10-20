"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery, useMutation } from "convex/react"
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
import { Textarea } from "@/components/ui/textarea"
import { Combobox } from "@/components/ui/combobox"
import { useTranslations } from "next-intl"
import { reassignTaskSchema, ReassignTaskFormData } from "@/lib/validations/tasks"
import { Id } from "@/convex/_generated/dataModel"
import { toast } from "sonner"

interface ReassignTaskDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  taskId: Id<"tasks">
  currentAssignee?: {
    fullName: string
    email: string
  }
  onSuccess?: () => void
}

export function ReassignTaskDialog({
  open,
  onOpenChange,
  taskId,
  currentAssignee,
  onSuccess,
}: ReassignTaskDialogProps) {
  const t = useTranslations('Tasks')
  const tCommon = useTranslations('Common')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const users = useQuery(api.userProfiles.list, { isActive: true }) ?? []
  const reassignTask = useMutation(api.tasks.reassign)

  const form = useForm<ReassignTaskFormData>({
    resolver: zodResolver(reassignTaskSchema),
    defaultValues: {
      newAssignee: "" as Id<"users">,
      notes: "",
    },
  })

  const userOptions = users.map((user) => ({
    value: user.userId,
    label: `${user.fullName} (${user.email})`,
  }))

  const onSubmit = async (data: ReassignTaskFormData) => {
    try {
      setIsSubmitting(true)
      await reassignTask({
        id: taskId,
        assignedTo: data.newAssignee,
      })
      toast.success(t('reassignSuccess'))
      form.reset()
      onOpenChange(false)
      if (onSuccess) {
        onSuccess()
      }
    } catch (error: any) {
      toast.error(error.message || t('reassignError'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    form.reset()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{t('reassignTask')}</DialogTitle>
          <DialogDescription>
            {t('reassignTaskDescription')}
          </DialogDescription>
        </DialogHeader>

        {currentAssignee && (
          <div className="py-2 px-3 bg-muted rounded-md">
            <p className="text-sm font-medium">{t('currentAssignee')}</p>
            <p className="text-sm text-muted-foreground">{currentAssignee.fullName}</p>
            <p className="text-xs text-muted-foreground">{currentAssignee.email}</p>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="newAssignee"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('newAssignee')}</FormLabel>
                  <FormControl>
                    <Combobox
                      options={userOptions}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder={t('selectUser')}
                      emptyText={t('noUsers')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('reassignNotes')} ({tCommon('optional')})</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('reassignNotesPlaceholder')}
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
                {isSubmitting ? tCommon('loading') : t('reassignTask')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
