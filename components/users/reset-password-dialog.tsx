"use client"

import { useEffect, useState } from "react"
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
  FormDescription,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { useTranslations } from "next-intl"
import { passwordResetSchema, PasswordResetFormData } from "@/lib/validations/users"
import { Id } from "@/convex/_generated/dataModel"
import { useToast } from "@/hooks/use-toast"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import { Progress } from "@/components/ui/progress"

interface ResetPasswordDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userProfileId: Id<"userProfiles">
  onSuccess: () => void
}

export function ResetPasswordDialog({
  open,
  onOpenChange,
  userProfileId,
  onSuccess
}: ResetPasswordDialogProps) {
  const t = useTranslations('Users')
  const tCommon = useTranslations('Common')
  const { toast } = useToast()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const userProfile = useQuery(
    api.userProfiles.get,
    open ? { id: userProfileId } : "skip"
  )
  const resetPassword = useMutation(api.userProfiles.resetUserPassword)

  const form = useForm<PasswordResetFormData>({
    resolver: zodResolver(passwordResetSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  })

  const newPassword = form.watch("newPassword")

  // Calculate password strength
  const getPasswordStrength = (password: string): { strength: number; label: string; color: string } => {
    if (!password) return { strength: 0, label: "", color: "" }

    let strength = 0
    if (password.length >= 8) strength += 25
    if (/[a-z]/.test(password)) strength += 25
    if (/[A-Z]/.test(password)) strength += 25
    if (/[0-9]/.test(password)) strength += 25

    if (strength <= 25) return { strength, label: t('passwordWeak'), color: "bg-red-500" }
    if (strength <= 50) return { strength, label: t('passwordMedium'), color: "bg-yellow-500" }
    if (strength <= 75) return { strength, label: t('passwordMedium'), color: "bg-blue-500" }
    return { strength, label: t('passwordStrong'), color: "bg-green-500" }
  }

  const passwordStrength = getPasswordStrength(newPassword)

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      form.reset()
      setShowPassword(false)
      setShowConfirmPassword(false)
    }
  }, [open, form])

  const onSubmit = async (data: PasswordResetFormData) => {
    try {
      await resetPassword({
        userProfileId,
        newPassword: data.newPassword,
      })

      toast({
        title: t('success.passwordReset'),
        description: t('passwordResetSuccess'),
      })

      form.reset()
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      toast({
        title: t('errors.passwordReset'),
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      })
    }
  }

  const isLoading = userProfile === undefined

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('resetPasswordTitle')}</DialogTitle>
          <DialogDescription>
            {t('resetPasswordDescription')}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : !userProfile ? (
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-muted-foreground">{t('userNotFound')}</p>
          </div>
        ) : (
          <>
            <div className="space-y-2 rounded-lg border p-3">
              <p className="text-sm font-medium">{t('userDetails')}</p>
              <div className="space-y-1">
                <p className="text-sm">
                  <span className="text-muted-foreground">{t('fullName')}:</span>{" "}
                  {userProfile.fullName}
                </p>
                <p className="text-sm">
                  <span className="text-muted-foreground">{t('email')}:</span>{" "}
                  {userProfile.email}
                </p>
              </div>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('newPassword')}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showPassword ? "text" : "password"}
                            placeholder="••••••••"
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                      {newPassword && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span>{t('passwordStrength')}</span>
                            <span className="font-medium">{passwordStrength.label}</span>
                          </div>
                          <Progress
                            value={passwordStrength.strength}
                            className="h-2"
                            indicatorClassName={passwordStrength.color}
                          />
                        </div>
                      )}
                      <FormDescription>
                        {t('passwordRequirements')}
                      </FormDescription>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('confirmPassword')}</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            type={showConfirmPassword ? "text" : "password"}
                            placeholder="••••••••"
                            {...field}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          >
                            {showConfirmPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChange(false)}
                  >
                    {tCommon('cancel')}
                  </Button>
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? tCommon('loading') : t('resetPassword')}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
