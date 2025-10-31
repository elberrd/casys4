"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { DashboardPageHeader } from "@/components/dashboard-page-header"
import { TasksTable } from "@/components/tasks/tasks-table"
import { ReassignTaskDialog } from "@/components/tasks/reassign-task-dialog"
import { ExtendDeadlineDialog } from "@/components/tasks/extend-deadline-dialog"
import { TaskStatusUpdateDialog } from "@/components/tasks/task-status-update-dialog"
import { BulkReassignTasksDialog } from "@/components/tasks/bulk-reassign-tasks-dialog"
import { ExportDataDialog } from "@/components/ui/export-data-dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, CheckCircle2, Clock, AlertTriangle, ListTodo } from "lucide-react"
import { toast } from "sonner"

export function TasksClient() {
  const router = useRouter()
  const t = useTranslations('Tasks')
  const tBreadcrumbs = useTranslations('Breadcrumbs')
  const tCommon = useTranslations('Common')

  const [activeTab, setActiveTab] = useState("my-tasks")
  const [reassignDialogOpen, setReassignDialogOpen] = useState(false)
  const [selectedTaskForReassign, setSelectedTaskForReassign] = useState<Id<"tasks"> | null>(null)
  const [extendDeadlineDialogOpen, setExtendDeadlineDialogOpen] = useState(false)
  const [selectedTaskForExtend, setSelectedTaskForExtend] = useState<Id<"tasks"> | null>(null)
  const [statusUpdateDialogOpen, setStatusUpdateDialogOpen] = useState(false)
  const [selectedTaskForStatusUpdate, setSelectedTaskForStatusUpdate] = useState<Id<"tasks"> | null>(null)
  const [bulkReassignDialogOpen, setBulkReassignDialogOpen] = useState(false)
  const [selectedTasksForBulkReassign, setSelectedTasksForBulkReassign] = useState<any[]>([])
  const [bulkStatusUpdateDialogOpen, setBulkStatusUpdateDialogOpen] = useState(false)
  const [selectedTasksForBulkStatusUpdate, setSelectedTasksForBulkStatusUpdate] = useState<any[]>([])

  // Fetch all tasks for different views
  const myTasks = useQuery(api.tasks.getMyTasks, {})
  const myTasksTodo = useQuery(api.tasks.getMyTasks, { status: "todo" })
  const myTasksInProgress = useQuery(api.tasks.getMyTasks, { status: "in_progress" })
  const myTasksOverdue = useQuery(api.tasks.getMyTasks, { overdue: true })
  const allTasks = useQuery(api.tasks.list, {})

  // Mutations
  const completeTask = useMutation(api.tasks.complete)
  const deleteTask = useMutation(api.tasks.remove)

  const breadcrumbs = [
    { label: tBreadcrumbs('dashboard'), href: "/dashboard" },
    { label: tBreadcrumbs('tasks') }
  ]

  const handleViewTask = (id: Id<"tasks">) => {
    router.push(`/tasks/${id}`)
  }

  const handleEditTask = (id: Id<"tasks">) => {
    router.push(`/tasks/${id}/edit`)
  }

  const handleCompleteTask = async (id: Id<"tasks">) => {
    try {
      await completeTask({ id })
      toast.success(t('completeSuccess'))
    } catch (error: any) {
      toast.error(error.message || t('completeError'))
    }
  }

  const handleDeleteTask = async (id: Id<"tasks">) => {
    if (!window.confirm(tCommon('deleteConfirm'))) return

    try {
      await deleteTask({ id })
      toast.success(t('deleteSuccess'))
    } catch (error: any) {
      toast.error(error.message || t('deleteError'))
    }
  }

  const handleReassignTask = (id: Id<"tasks">) => {
    setSelectedTaskForReassign(id)
    setReassignDialogOpen(true)
  }

  const handleExtendDeadline = (id: Id<"tasks">) => {
    setSelectedTaskForExtend(id)
    setExtendDeadlineDialogOpen(true)
  }

  const handleUpdateStatus = (id: Id<"tasks">) => {
    setSelectedTaskForStatusUpdate(id)
    setStatusUpdateDialogOpen(true)
  }

  const handleCreateTask = () => {
    router.push('/tasks/new')
  }

  const handleBulkReassign = (selectedTasks: any[]) => {
    setSelectedTasksForBulkReassign(selectedTasks)
    setBulkReassignDialogOpen(true)
  }

  const handleBulkStatusUpdate = (selectedTasks: any[]) => {
    setSelectedTasksForBulkStatusUpdate(selectedTasks)
    setBulkStatusUpdateDialogOpen(true)
  }

  // Calculate stats
  const stats = {
    total: myTasks?.length || 0,
    todo: myTasksTodo?.length || 0,
    inProgress: myTasksInProgress?.length || 0,
    overdue: myTasksOverdue?.length || 0,
  }

  // Get tasks for today and this week
  const today = new Date().toISOString().split("T")[0]
  const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]

  const dueToday = myTasks?.filter(task =>
    task.dueDate === today &&
    task.status !== "completed" &&
    task.status !== "cancelled"
  ) || []

  const dueThisWeek = myTasks?.filter(task =>
    task.dueDate &&
    task.dueDate > today &&
    task.dueDate <= weekFromNow &&
    task.status !== "completed" &&
    task.status !== "cancelled"
  ) || []

  return (
    <>
      <DashboardPageHeader breadcrumbs={breadcrumbs}>
        <div className="flex items-center gap-2">
          <ExportDataDialog defaultExportType="tasks" />
          <Button onClick={handleCreateTask}>
            <Plus className="mr-2 h-4 w-4" />
            {t('createTask')}
          </Button>
        </div>
      </DashboardPageHeader>

      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div>
          <h1 className="text-2xl font-bold">{t('taskDashboard')}</h1>
          <p className="text-sm text-muted-foreground">
            {t('description')}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('totalTasks')}
              </CardTitle>
              <ListTodo className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">
                {t('tasksOverview')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('tasksTodo')}
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.todo}</div>
              <p className="text-xs text-muted-foreground">
                {dueToday.length} {t('dueToday')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('tasksInProgress')}
              </CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.inProgress}</div>
              <p className="text-xs text-muted-foreground">
                {dueThisWeek.length} {t('dueThisWeek')}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {t('tasksOverdueCount')}
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats.overdue}</div>
              <p className="text-xs text-muted-foreground">
                {t('overdue')}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tasks Tabs */}
        <Card>
          <CardHeader>
            <CardTitle>{t('taskDashboard')}</CardTitle>
            <CardDescription>
              {t('tasksOverview')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="my-tasks">
                  {t('myTasks')}
                  {stats.total > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {stats.total}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="overdue">
                  {t('overdueTasks')}
                  {stats.overdue > 0 && (
                    <Badge variant="destructive" className="ml-2">
                      {stats.overdue}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="upcoming">
                  {t('upcomingTasks')}
                  {dueThisWeek.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {dueThisWeek.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="all">
                  {t('allTasks')}
                  {allTasks && allTasks.length > 0 && (
                    <Badge variant="outline" className="ml-2">
                      {allTasks.length}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>

              <TabsContent value="my-tasks" className="mt-4">
                {myTasks === undefined ? (
                  <div className="flex items-center justify-center h-32">
                    <p className="text-muted-foreground">{tCommon('loading')}</p>
                  </div>
                ) : myTasks.length === 0 ? (
                  <div className="flex items-center justify-center h-32">
                    <p className="text-muted-foreground">{t('noResults')}</p>
                  </div>
                ) : (
                  <TasksTable
                    tasks={myTasks}
                    onView={handleViewTask}
                    onEdit={handleEditTask}
                    onDelete={handleDeleteTask}
                    onComplete={handleCompleteTask}
                    onReassign={handleReassignTask}
                    onExtendDeadline={handleExtendDeadline}
                    onUpdateStatus={handleUpdateStatus}
                    onBulkReassign={handleBulkReassign}
                    onBulkUpdateStatus={handleBulkStatusUpdate}
                  />
                )}
              </TabsContent>

              <TabsContent value="overdue" className="mt-4">
                {myTasksOverdue === undefined ? (
                  <div className="flex items-center justify-center h-32">
                    <p className="text-muted-foreground">{tCommon('loading')}</p>
                  </div>
                ) : myTasksOverdue.length === 0 ? (
                  <div className="flex items-center justify-center h-32">
                    <p className="text-muted-foreground">{t('noResults')}</p>
                  </div>
                ) : (
                  <TasksTable
                    tasks={myTasksOverdue}
                    onView={handleViewTask}
                    onEdit={handleEditTask}
                    onDelete={handleDeleteTask}
                    onComplete={handleCompleteTask}
                    onReassign={handleReassignTask}
                    onExtendDeadline={handleExtendDeadline}
                    onUpdateStatus={handleUpdateStatus}
                    onBulkReassign={handleBulkReassign}
                    onBulkUpdateStatus={handleBulkStatusUpdate}
                  />
                )}
              </TabsContent>

              <TabsContent value="upcoming" className="mt-4">
                {dueThisWeek.length === 0 ? (
                  <div className="flex items-center justify-center h-32">
                    <p className="text-muted-foreground">{t('noResults')}</p>
                  </div>
                ) : (
                  <TasksTable
                    tasks={dueThisWeek}
                    onView={handleViewTask}
                    onEdit={handleEditTask}
                    onDelete={handleDeleteTask}
                    onComplete={handleCompleteTask}
                    onReassign={handleReassignTask}
                    onExtendDeadline={handleExtendDeadline}
                    onUpdateStatus={handleUpdateStatus}
                    onBulkReassign={handleBulkReassign}
                    onBulkUpdateStatus={handleBulkStatusUpdate}
                  />
                )}
              </TabsContent>

              <TabsContent value="all" className="mt-4">
                {allTasks === undefined ? (
                  <div className="flex items-center justify-center h-32">
                    <p className="text-muted-foreground">{tCommon('loading')}</p>
                  </div>
                ) : allTasks.length === 0 ? (
                  <div className="flex items-center justify-center h-32">
                    <p className="text-muted-foreground">{t('noResults')}</p>
                  </div>
                ) : (
                  <TasksTable
                    tasks={allTasks}
                    onView={handleViewTask}
                    onEdit={handleEditTask}
                    onDelete={handleDeleteTask}
                    onComplete={handleCompleteTask}
                    onReassign={handleReassignTask}
                    onExtendDeadline={handleExtendDeadline}
                    onUpdateStatus={handleUpdateStatus}
                    onBulkReassign={handleBulkReassign}
                    onBulkUpdateStatus={handleBulkStatusUpdate}
                  />
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {/* Reassign Task Dialog */}
      {selectedTaskForReassign && (
        <ReassignTaskDialog
          open={reassignDialogOpen}
          onOpenChange={setReassignDialogOpen}
          taskId={selectedTaskForReassign}
          currentAssignee={
            (allTasks || [])
              .find((task) => task._id === selectedTaskForReassign)
              ?.assignedToUser ?? undefined
          }
          onSuccess={() => {
            setReassignDialogOpen(false)
            setSelectedTaskForReassign(null)
          }}
        />
      )}

      {/* Extend Deadline Dialog */}
      {selectedTaskForExtend && (
        <ExtendDeadlineDialog
          open={extendDeadlineDialogOpen}
          onOpenChange={setExtendDeadlineDialogOpen}
          taskId={selectedTaskForExtend}
          currentDueDate={
            [...(myTasks || []), ...(allTasks || [])]
              .find((task) => task._id === selectedTaskForExtend)
              ?.dueDate || ""
          }
          onSuccess={() => {
            setExtendDeadlineDialogOpen(false)
            setSelectedTaskForExtend(null)
          }}
        />
      )}

      {/* Status Update Dialog */}
      {selectedTaskForStatusUpdate && (
        <TaskStatusUpdateDialog
          open={statusUpdateDialogOpen}
          onOpenChange={setStatusUpdateDialogOpen}
          taskId={selectedTaskForStatusUpdate}
          currentStatus={
            [...(myTasks || []), ...(allTasks || [])]
              .find((task) => task._id === selectedTaskForStatusUpdate)
              ?.status as "todo" | "in_progress" | "completed" | "cancelled" || "todo"
          }
          onSuccess={() => {
            setStatusUpdateDialogOpen(false)
            setSelectedTaskForStatusUpdate(null)
          }}
        />
      )}

      {/* Bulk Reassign Tasks Dialog */}
      <BulkReassignTasksDialog
        open={bulkReassignDialogOpen}
        onOpenChange={setBulkReassignDialogOpen}
        selectedTasks={selectedTasksForBulkReassign}
        onSuccess={() => {
          setBulkReassignDialogOpen(false)
          setSelectedTasksForBulkReassign([])
        }}
      />

      {/* Bulk Status Update Dialog - Using existing TaskStatusUpdateDialog approach */}
      {/* Note: For now we're only adding bulk reassign. Bulk status update would require */}
      {/* creating a new specialized dialog component for multiple tasks */}
    </>
  )
}
