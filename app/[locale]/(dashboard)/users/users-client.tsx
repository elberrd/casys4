"use client"

import { useState } from "react"
import { DashboardPageHeader } from "@/components/dashboard-page-header"
import { useTranslations } from "next-intl"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { CreateUserDialog } from "@/components/users/create-user-dialog"
import { EditUserDialog } from "@/components/users/edit-user-dialog"
import { UsersTable } from "@/components/users/users-table"
import { UserViewModal } from "@/components/users/user-view-modal"
import { ResetPasswordDialog } from "@/components/users/reset-password-dialog"
import { Id } from "@/convex/_generated/dataModel"
import { useToast } from "@/hooks/use-toast"

export function UsersClient() {
  const t = useTranslations('Users')
  const tBreadcrumbs = useTranslations('Breadcrumbs')
  const tCommon = useTranslations('Common')
  const { toast } = useToast()

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<Id<"userProfiles"> | null>(null)
  const [viewingId, setViewingId] = useState<Id<"userProfiles"> | null>(null)
  const [resetPasswordId, setResetPasswordId] = useState<Id<"userProfiles"> | null>(null)

  const users = useQuery(api.userProfiles.list, {}) ?? []
  const deleteUser = useMutation(api.userProfiles.remove)
  const updateActiveStatus = useMutation(api.userProfiles.updateActiveStatus)

  const breadcrumbs = [
    { label: tBreadcrumbs('dashboard'), href: "/dashboard" },
    { label: tBreadcrumbs('peopleCompanies') },
    { label: tBreadcrumbs('users') }
  ]

  const handleView = (id: Id<"userProfiles">) => {
    setViewingId(id)
  }

  const handleEdit = (id: Id<"userProfiles">) => {
    setEditingId(id)
  }

  const handleResetPassword = (id: Id<"userProfiles">) => {
    setResetPasswordId(id)
  }

  const handleActivate = async (id: Id<"userProfiles">, isActive: boolean) => {
    try {
      await updateActiveStatus({ id, isActive })
      toast({
        title: tCommon('success'),
        description: isActive ? t('success.activated') : t('success.deactivated'),
      })
    } catch (error) {
      console.error("Error updating user status:", error)
      toast({
        title: tCommon('error'),
        description: isActive ? t('errors.activate') : t('errors.deactivate'),
        variant: "destructive",
      })
    }
  }

  const handleDelete = async (id: Id<"userProfiles">) => {
    if (confirm(t('deleteConfirm'))) {
      try {
        await deleteUser({ id })
        toast({
          title: tCommon('deleteSuccess'),
          description: t('success.deleted'),
        })
      } catch (error) {
        console.error("Error deleting user:", error)
        toast({
          title: tCommon('deleteError'),
          description: t('errors.delete'),
          variant: "destructive",
        })
      }
    }
  }

  return (
    <>
      <DashboardPageHeader breadcrumbs={breadcrumbs} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t('title')}</h1>
            <p className="text-sm text-muted-foreground">
              {t('description')}
            </p>
          </div>
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            {t('newUser')}
          </Button>
        </div>

        <UsersTable
          users={users}
          onView={handleView}
          onEdit={handleEdit}
          onResetPassword={handleResetPassword}
          onActivate={handleActivate}
          onDelete={handleDelete}
        />

        {viewingId && (
          <UserViewModal
            userProfileId={viewingId}
            open={true}
            onOpenChange={(open) => !open && setViewingId(null)}
            onEdit={() => {
              setEditingId(viewingId)
              setViewingId(null)
            }}
          />
        )}

        {editingId && (
          <EditUserDialog
            open={true}
            onOpenChange={(open) => !open && setEditingId(null)}
            userProfileId={editingId}
            onSuccess={() => setEditingId(null)}
          />
        )}

        {resetPasswordId && (
          <ResetPasswordDialog
            open={true}
            onOpenChange={(open) => !open && setResetPasswordId(null)}
            userProfileId={resetPasswordId}
            onSuccess={() => setResetPasswordId(null)}
          />
        )}

        <CreateUserDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onSuccess={() => setCreateDialogOpen(false)}
        />
      </div>
    </>
  )
}
