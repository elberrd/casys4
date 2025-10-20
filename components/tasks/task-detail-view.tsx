"use client"

import { useTranslations } from "next-intl"
import { Id } from "@/convex/_generated/dataModel"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Edit, Trash2, CheckCircle, UserPlus, Calendar, ArrowRight } from "lucide-react"
import Link from "next/link"
import { format } from "date-fns"

interface TaskDetailViewProps {
  task: {
    _id: Id<"tasks">
    title: string
    description: string
    status: string
    priority: string
    dueDate: string
    createdAt: number
    updatedAt: number
    completedAt?: number
    individualProcess?: {
      _id: Id<"individualProcesses">
      status: string
      person?: {
        _id: Id<"people">
        fullName: string
      } | null
    } | null
    mainProcess?: {
      _id: Id<"mainProcesses">
      referenceNumber: string
      status: string
    } | null
    assignedToUser?: {
      _id: string
      userId: Id<"users">
      fullName: string
      email: string
    } | null
    createdByUser?: {
      _id: string
      userId: Id<"users">
      fullName: string
      email: string
    } | null
    completedByUser?: {
      _id: string
      userId: Id<"users">
      fullName: string
      email: string
    } | null
  }
  onEdit?: () => void
  onDelete?: () => void
  onComplete?: () => void
  onReassign?: () => void
  onExtendDeadline?: () => void
}

export function TaskDetailView({
  task,
  onEdit,
  onDelete,
  onComplete,
  onReassign,
  onExtendDeadline,
}: TaskDetailViewProps) {
  const t = useTranslations('Tasks')
  const tCommon = useTranslations('Common')

  // Helper to get priority badge variant
  const getPriorityVariant = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "destructive"
      case "high":
        return "default"
      case "medium":
        return "secondary"
      case "low":
        return "outline"
      default:
        return "outline"
    }
  }

  // Helper to get status badge variant
  const getStatusVariant = (status: string) => {
    switch (status) {
      case "completed":
        return "default"
      case "in_progress":
        return "secondary"
      case "cancelled":
        return "destructive"
      case "todo":
        return "outline"
      default:
        return "outline"
    }
  }

  // Check if task is overdue
  const isOverdue = task.status !== "completed" && task.status !== "cancelled" && task.dueDate < new Date().toISOString().split("T")[0]

  const canComplete = task.status !== "completed" && task.status !== "cancelled"
  const canEdit = task.status !== "completed"

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-bold tracking-tight">{task.title}</h2>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={getStatusVariant(task.status)}>
              {t(`statuses.${task.status}`)}
            </Badge>
            <Badge variant={getPriorityVariant(task.priority)}>
              {t(`priorities.${task.priority}`)}
            </Badge>
            {isOverdue && (
              <Badge variant="destructive">{t('overdue')}</Badge>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {canComplete && onComplete && (
            <Button onClick={onComplete} variant="default" size="sm">
              <CheckCircle className="h-4 w-4 mr-2" />
              {t('markComplete')}
            </Button>
          )}
          {canEdit && onEdit && (
            <Button onClick={onEdit} variant="outline" size="sm">
              <Edit className="h-4 w-4 mr-2" />
              {tCommon('edit')}
            </Button>
          )}
          {onReassign && (
            <Button onClick={onReassign} variant="outline" size="sm">
              <UserPlus className="h-4 w-4 mr-2" />
              {t('reassign')}
            </Button>
          )}
          {canEdit && onExtendDeadline && (
            <Button onClick={onExtendDeadline} variant="outline" size="sm">
              <Calendar className="h-4 w-4 mr-2" />
              {t('extendDeadline')}
            </Button>
          )}
          {onDelete && (
            <Button onClick={onDelete} variant="destructive" size="sm">
              <Trash2 className="h-4 w-4 mr-2" />
              {tCommon('delete')}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Task Information */}
        <Card>
          <CardHeader>
            <CardTitle>{t('taskInformation')}</CardTitle>
            <CardDescription>{t('taskDetails')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">
                {t('description')}
              </h4>
              <p className="text-sm whitespace-pre-wrap">{task.description}</p>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">
                  {t('status')}
                </h4>
                <Badge variant={getStatusVariant(task.status)}>
                  {t(`statuses.${task.status}`)}
                </Badge>
              </div>

              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">
                  {t('priority')}
                </h4>
                <Badge variant={getPriorityVariant(task.priority)}>
                  {t(`priorities.${task.priority}`)}
                </Badge>
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">
                {t('dueDate')}
              </h4>
              <div className="flex items-center gap-2">
                <p className={`text-sm font-medium ${isOverdue ? 'text-destructive' : ''}`}>
                  {task.dueDate}
                </p>
                {isOverdue && (
                  <Badge variant="destructive" className="text-xs">
                    {t('overdue')}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Process Information */}
        <Card>
          <CardHeader>
            <CardTitle>{t('processInformation')}</CardTitle>
            <CardDescription>
              {task.mainProcess ? t('mainProcess') : t('individualProcess')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {task.mainProcess && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">
                  {t('mainProcess')}
                </h4>
                <Link
                  href={`/main-processes/${task.mainProcess._id}`}
                  className="flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                >
                  <span className="font-mono">{task.mainProcess.referenceNumber}</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <p className="text-sm text-muted-foreground mt-1">
                  {t('status')}: {task.mainProcess.status}
                </p>
              </div>
            )}

            {task.individualProcess && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">
                  {t('individualProcess')}
                </h4>
                {task.individualProcess.person && (
                  <Link
                    href={`/individual-processes/${task.individualProcess._id}`}
                    className="flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                  >
                    <span>{task.individualProcess.person.fullName}</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
                <p className="text-sm text-muted-foreground mt-1">
                  {t('status')}: {task.individualProcess.status}
                </p>
              </div>
            )}

            {!task.mainProcess && !task.individualProcess && (
              <p className="text-sm text-muted-foreground">
                {tCommon('notApplicable')}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Assignment Information */}
        <Card>
          <CardHeader>
            <CardTitle>{t('assignmentInformation')}</CardTitle>
            <CardDescription>{t('taskAssignment')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">
                {t('assignedTo')}
              </h4>
              {task.assignedToUser ? (
                <div>
                  <p className="text-sm font-medium">{task.assignedToUser.fullName}</p>
                  <p className="text-sm text-muted-foreground">{task.assignedToUser.email}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{tCommon('notApplicable')}</p>
              )}
            </div>

            <Separator />

            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">
                {t('createdBy')}
              </h4>
              {task.createdByUser ? (
                <div>
                  <p className="text-sm font-medium">{task.createdByUser.fullName}</p>
                  <p className="text-sm text-muted-foreground">{task.createdByUser.email}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{tCommon('notApplicable')}</p>
              )}
            </div>

            {task.completedByUser && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">
                    {t('completedBy')}
                  </h4>
                  <div>
                    <p className="text-sm font-medium">{task.completedByUser.fullName}</p>
                    <p className="text-sm text-muted-foreground">{task.completedByUser.email}</p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>{t('timeline')}</CardTitle>
            <CardDescription>{t('taskTimeline')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">
                {t('createdAt')}
              </h4>
              <p className="text-sm">
                {format(new Date(task.createdAt), 'PPpp')}
              </p>
            </div>

            <Separator />

            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-1">
                {t('dueDate')}
              </h4>
              <p className={`text-sm font-medium ${isOverdue ? 'text-destructive' : ''}`}>
                {task.dueDate}
              </p>
            </div>

            {task.completedAt && (
              <>
                <Separator />
                <div>
                  <h4 className="text-sm font-medium text-muted-foreground mb-1">
                    {t('completedAt')}
                  </h4>
                  <p className="text-sm">
                    {format(new Date(task.completedAt), 'PPpp')}
                  </p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
