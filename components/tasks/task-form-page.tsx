"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
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
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { DatePicker } from "@/components/ui/date-picker"
import { Combobox } from "@/components/ui/combobox"
import { Separator } from "@/components/ui/separator"
import { useTranslations } from "next-intl"
import { taskSchema, TaskFormData, priorityOptions, statusOptions } from "@/lib/validations/tasks"
import { Id } from "@/convex/_generated/dataModel"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

interface TaskFormPageProps {
  taskId?: Id<"tasks">
  onSuccess?: () => void
}

export function TaskFormPage({
  taskId,
  onSuccess,
}: TaskFormPageProps) {
  const t = useTranslations('Tasks')
  const tCommon = useTranslations('Common')
  const { toast } = useToast()
  const router = useRouter()

  const task = useQuery(
    api.tasks.get,
    taskId ? { id: taskId } : "skip"
  )

  const mainProcesses = useQuery(api.mainProcesses.list, {}) ?? []
  const individualProcesses = useQuery(api.individualProcesses.list, {}) ?? []
  const users = useQuery(api.userProfiles.list, { isActive: true }) ?? []

  const createTask = useMutation(api.tasks.create)
  const updateTask = useMutation(api.tasks.update)

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      description: "",
      dueDate: "",
      priority: "medium",
      status: undefined,
      assignedTo: "" as Id<"users">,
      individualProcessId: undefined,
      mainProcessId: undefined,
    },
  })

  // Reset form when task data loads
  useEffect(() => {
    if (task) {
      form.reset({
        title: task.title,
        description: task.description,
        dueDate: task.dueDate,
        priority: task.priority as "low" | "medium" | "high" | "urgent",
        status: task.status as "todo" | "in_progress" | "completed" | "cancelled",
        assignedTo: task.assignedTo,
        individualProcessId: task.individualProcessId ?? undefined,
        mainProcessId: task.mainProcessId ?? undefined,
      })
    }
  }, [task, form])

  const onSubmit = async (data: TaskFormData) => {
    try {
      if (taskId) {
        await updateTask({
          id: taskId,
          title: data.title,
          description: data.description,
          dueDate: data.dueDate,
          priority: data.priority,
          status: data.status,
          assignedTo: data.assignedTo,
        })
        toast({
          title: t('updatedSuccess'),
        })
      } else {
        await createTask({
          title: data.title,
          description: data.description,
          dueDate: data.dueDate,
          priority: data.priority,
          assignedTo: data.assignedTo,
          individualProcessId: data.individualProcessId,
          mainProcessId: data.mainProcessId,
        })
        toast({
          title: t('createdSuccess'),
        })
      }

      // Call onSuccess callback if provided, otherwise navigate to list
      if (onSuccess) {
        onSuccess()
      } else {
        router.push('/tasks')
      }
    } catch (error) {
      toast({
        title: taskId ? t('errorUpdate') : t('errorCreate'),
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      })
    }
  }

  const handleCancel = () => {
    router.push('/tasks')
  }

  const mainProcessOptions = mainProcesses.map((process) => ({
    value: process._id,
    label: `${process.referenceNumber}${process.company ? ` - ${process.company.name}` : ''}`,
  }))

  const individualProcessOptions = individualProcesses.map((process) => ({
    value: process._id,
    label: `${process.person?.fullName || 'Unknown'}${process.mainProcess ? ` (${process.mainProcess.referenceNumber})` : ''}`,
  }))

  const userOptions = users.map((user) => ({
    value: user.userId,
    label: `${user.fullName} (${user.email})`,
  }))

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h2 className="text-lg font-semibold">
          {taskId ? t('editTitle') : t('newTask')}
        </h2>
        <p className="text-sm text-muted-foreground">
          {taskId
            ? t('editDescription')
            : t('createDescription')
          }
        </p>
      </div>
      <div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Task Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">{t('taskInfo')}</h3>

              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('title')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('titlePlaceholder')} {...field} />
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
                    <FormLabel>{t('description')}</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder={t('descriptionPlaceholder')}
                        rows={4}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Process Assignment */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">{t('processAssignment')}</h3>
              <p className="text-sm text-muted-foreground">{t('processAssignmentDescription')}</p>

              <FormField
                control={form.control}
                name="mainProcessId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('mainProcess')}</FormLabel>
                    <FormControl>
                      <Combobox
                        options={mainProcessOptions}
                        value={field.value || ""}
                        onValueChange={(value) => {
                          field.onChange(value || undefined)
                          // Clear individual process if main process is selected
                          if (value) {
                            form.setValue('individualProcessId', undefined)
                          }
                        }}
                        placeholder={t('selectMainProcess')}
                        emptyText={t('noMainProcesses')}
                      />
                    </FormControl>
                    <FormDescription>
                      {t('mainProcessDescription')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="text-center text-sm text-muted-foreground">
                {t('or')}
              </div>

              <FormField
                control={form.control}
                name="individualProcessId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('individualProcess')}</FormLabel>
                    <FormControl>
                      <Combobox
                        options={individualProcessOptions}
                        value={field.value || ""}
                        onValueChange={(value) => {
                          field.onChange(value || undefined)
                          // Clear main process if individual process is selected
                          if (value) {
                            form.setValue('mainProcessId', undefined)
                          }
                        }}
                        placeholder={t('selectIndividualProcess')}
                        emptyText={t('noIndividualProcesses')}
                      />
                    </FormControl>
                    <FormDescription>
                      {t('individualProcessDescription')}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Task Settings */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">{t('taskSettings')}</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('priority')}</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder={t('selectPriority')} />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {priorityOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {t(`priorities.${option.value}`)}
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
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('dueDate')}</FormLabel>
                      <FormControl>
                        <DatePicker value={field.value} onChange={field.onChange} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {taskId && (
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('status')}</FormLabel>
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
              )}

              <FormField
                control={form.control}
                name="assignedTo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('assignedTo')}</FormLabel>
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
            </div>

            <div className="flex justify-end gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
              >
                {tCommon('cancel')}
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? tCommon('loading') : tCommon('save')}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  )
}
