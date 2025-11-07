"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
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
import { PhoneInput } from "@/components/ui/phone-input"
import { Combobox } from "@/components/ui/combobox"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useTranslations } from "next-intl"
import { userSchema, UserFormData } from "@/lib/validations/users"
import { Id } from "@/convex/_generated/dataModel"
import { useToast } from "@/hooks/use-toast"
import { Loader2 } from "lucide-react"

interface EditUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  userProfileId: Id<"userProfiles">
  onSuccess: () => void
}

export function EditUserDialog({
  open,
  onOpenChange,
  userProfileId,
  onSuccess
}: EditUserDialogProps) {
  const t = useTranslations('Users')
  const tCommon = useTranslations('Common')
  const { toast } = useToast()

  const userProfile = useQuery(
    api.userProfiles.get,
    open ? { id: userProfileId } : "skip"
  )
  const companies = useQuery(api.companies.list, {}) ?? []
  const updateUser = useMutation(api.userProfiles.update)

  const form = useForm<UserFormData & { isActive: boolean }>({
    resolver: zodResolver(userSchema.extend({
      isActive: z.boolean(),
    })),
    defaultValues: {
      email: "",
      fullName: "",
      role: "client",
      companyId: "" as Id<"companies"> | "",
      phoneNumber: "",
      isActive: true,
    },
  })

  const selectedRole = form.watch("role")

  // Reset companyId when role changes
  useEffect(() => {
    if (selectedRole === "admin") {
      form.setValue("companyId", "")
    }
  }, [selectedRole, form])

  // Load user data into form
  useEffect(() => {
    if (userProfile) {
      form.reset({
        email: userProfile.email,
        fullName: userProfile.fullName,
        role: userProfile.role,
        companyId: userProfile.companyId ?? ("" as Id<"companies"> | ""),
        phoneNumber: userProfile.phoneNumber ?? "",
        isActive: userProfile.isActive,
      })
    } else if (!open) {
      form.reset()
    }
  }, [userProfile, open, form])

  const onSubmit = async (data: UserFormData & { isActive: boolean }) => {
    try {
      // Clean optional fields and convert empty strings to undefined
      const submitData = {
        id: userProfileId,
        email: data.email,
        fullName: data.fullName,
        role: data.role,
        companyId: data.companyId === "" ? undefined : data.companyId,
        phoneNumber: data.phoneNumber || undefined,
        isActive: data.isActive,
      }

      await updateUser(submitData)

      toast({
        title: t('success.updated'),
      })

      form.reset()
      onSuccess()
      onOpenChange(false)
    } catch (error) {
      toast({
        title: t('errors.update'),
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      })
    }
  }

  const companyOptions = companies.map((company) => ({
    value: company._id,
    label: company.name,
  }))

  const isLoading = userProfile === undefined

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('editTitle')}</DialogTitle>
          <DialogDescription>
            {t('editDescription')}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('email')}</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="user@example.com"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('fullName')}</FormLabel>
                    <FormControl>
                      <Input placeholder="John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('role')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('selectRole')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="admin">{t('admin')}</SelectItem>
                        <SelectItem value="client">{t('client')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedRole === "client" && (
                <FormField
                  control={form.control}
                  name="companyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('company')}</FormLabel>
                      <FormControl>
                        <Combobox
                          options={companyOptions}
                          value={field.value || ""}
                          onValueChange={field.onChange}
                          placeholder={t('selectCompany')}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('phoneNumber')} ({tCommon('optional')})</FormLabel>
                    <FormControl>
                      <PhoneInput {...field} defaultCountry="BR" />
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
                      <FormLabel>{t('isActive')}</FormLabel>
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
                  {tCommon('cancel')}
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? tCommon('loading') : tCommon('save')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  )
}
