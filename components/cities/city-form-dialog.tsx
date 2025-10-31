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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Combobox } from "@/components/ui/combobox"
import { useTranslations } from "next-intl"
import { citySchema, CityFormData } from "@/lib/validations/cities"
import { Id } from "@/convex/_generated/dataModel"
import { useToast } from "@/hooks/use-toast"

interface CityFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  cityId?: Id<"cities">
  onSuccess?: () => void
}

export function CityFormDialog({
  open,
  onOpenChange,
  cityId,
  onSuccess,
}: CityFormDialogProps) {
  const t = useTranslations('Cities')
  const tCommon = useTranslations('Common')
  const { toast } = useToast()

  const city = useQuery(
    api.cities.get,
    cityId ? { id: cityId } : "skip"
  )

  const states = useQuery(api.states.listWithCountry) ?? []
  const createCity = useMutation(api.cities.create)
  const updateCity = useMutation(api.cities.update)

  const form = useForm<CityFormData>({
    resolver: zodResolver(citySchema),
    defaultValues: {
      name: "",
      stateId: "",
      hasFederalPolice: false,
    },
  })

  // Reset form when city data loads
  useEffect(() => {
    if (city) {
      form.reset({
        name: city.name,
        stateId: city.stateId,
        hasFederalPolice: city.hasFederalPolice,
      })
    } else if (!cityId) {
      form.reset({
        name: "",
        stateId: "",
        hasFederalPolice: false,
      })
    }
  }, [city, cityId, form])

  const onSubmit = async (data: CityFormData) => {
    try {
      // Convert empty string to undefined for stateId
      const submitData = {
        ...data,
        stateId: data.stateId === "" ? undefined : data.stateId,
      }

      if (cityId) {
        await updateCity({ id: cityId, ...submitData })
        toast({
          title: t('updatedSuccess'),
        })
      } else {
        await createCity(submitData)
        toast({
          title: t('createdSuccess'),
        })
      }
      form.reset()
      onSuccess?.()
    } catch (error) {
      toast({
        title: cityId ? t('errorUpdate') : t('errorCreate'),
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      })
    }
  }

  const stateOptions = states.map((state) => ({
    value: state._id,
    label: `${state.name} - ${state.country?.name || 'Unknown Country'}`,
  }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {cityId ? t('editTitle') : t('createTitle')}
          </DialogTitle>
          <DialogDescription>
            {cityId
              ? "Edit the city information below"
              : "Fill in the information to create a new city"
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
              name="stateId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('state')}</FormLabel>
                  <FormControl>
                    <Combobox
                      options={stateOptions}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder={t('selectState')}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="hasFederalPolice"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      {t('hasFederalPolice')}
                    </FormLabel>
                    <FormDescription>
                      Check this if the city has a Federal Police office
                    </FormDescription>
                  </div>
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
