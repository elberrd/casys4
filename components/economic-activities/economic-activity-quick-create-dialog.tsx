"use client"

import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "convex/react"
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
import { useTranslations } from "next-intl"
import { economicActivityQuickCreateSchema, EconomicActivityQuickCreateFormData } from "@/lib/validations/economic-activities"
import { Id } from "@/convex/_generated/dataModel"
import { useToast } from "@/hooks/use-toast"

interface EconomicActivityQuickCreateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: (economicActivityId: Id<"economicActivities">) => void
}

/**
 * Simplified economic activity creation dialog for inline use in other forms.
 * Contains essential fields: name and code (optional).
 */
export function EconomicActivityQuickCreateDialog({
  open,
  onOpenChange,
  onSuccess,
}: EconomicActivityQuickCreateDialogProps) {
  const t = useTranslations('EconomicActivities')
  const tCommon = useTranslations('Common')
  const { toast } = useToast()

  const createEconomicActivity = useMutation(api.economicActivities.create)

  const form = useForm<EconomicActivityQuickCreateFormData>({
    resolver: zodResolver(economicActivityQuickCreateSchema),
    defaultValues: {
      name: "",
      code: "",
    },
  })

  const onSubmit = async (data: EconomicActivityQuickCreateFormData) => {
    try {
      const economicActivityId = await createEconomicActivity({
        name: data.name,
        code: data.code || undefined,
        isActive: true,
      })

      toast({
        title: t('createdSuccess'),
      })

      form.reset()
      onOpenChange(false)
      onSuccess?.(economicActivityId)
    } catch (error) {
      toast({
        title: t('errorCreate'),
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('quickCreateTitle')}</DialogTitle>
          <DialogDescription>
            {t('quickCreateDescription')}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('name')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Information Technology Services"
                      {...field}
                      autoFocus
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('code')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., 62.01-5-00"
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
                onClick={() => onOpenChange(false)}
              >
                {tCommon('cancel')}
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? tCommon('loading') : tCommon('create')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
