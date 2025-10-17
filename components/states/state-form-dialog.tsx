"use client"

import { useEffect } from "react"
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
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Combobox } from "@/components/ui/combobox"
import { useTranslations } from "next-intl"
import { stateSchema, StateFormData } from "@/lib/validations/states"
import { Id } from "@/convex/_generated/dataModel"
import { useToast } from "@/hooks/use-toast"

interface StateFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  stateId?: Id<"states">
  onSuccess?: () => void
}

export function StateFormDialog({
  open,
  onOpenChange,
  stateId,
  onSuccess,
}: StateFormDialogProps) {
  const t = useTranslations('States')
  const tCommon = useTranslations('Common')
  const { toast } = useToast()

  const state = useQuery(
    api.states.get,
    stateId ? { id: stateId } : "skip"
  )

  const countries = useQuery(api.countries.list) ?? []
  const createState = useMutation(api.states.create)
  const updateState = useMutation(api.states.update)

  const form = useForm<StateFormData>({
    resolver: zodResolver(stateSchema),
    defaultValues: {
      name: "",
      countryId: "",
    },
  })

  // Reset form when state data loads
  useEffect(() => {
    if (state) {
      form.reset({
        name: state.name,
        countryId: state.countryId,
      })
    } else if (!stateId) {
      form.reset({
        name: "",
        countryId: "",
      })
    }
  }, [state, stateId, form])

  const onSubmit = async (data: StateFormData) => {
    try {
      if (stateId) {
        await updateState({ id: stateId, ...data })
        toast({
          title: t('updatedSuccess'),
        })
      } else {
        await createState(data)
        toast({
          title: t('createdSuccess'),
        })
      }
      form.reset()
      onSuccess?.()
    } catch (error) {
      toast({
        title: stateId ? t('errorUpdate') : t('errorCreate'),
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      })
    }
  }

  const countryOptions = countries.map((country) => ({
    value: country._id,
    label: country.name,
  }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {stateId ? t('editTitle') : t('createTitle')}
          </DialogTitle>
          <DialogDescription>
            {stateId
              ? "Edit the state information below"
              : "Fill in the information to create a new state"
            }
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
                    <Input placeholder="São Paulo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="countryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('country')}</FormLabel>
                  <FormControl>
                    <Combobox
                      options={countryOptions}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder={t('selectCountry')}
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
                {form.formState.isSubmitting ? tCommon('loading') : tCommon('save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
