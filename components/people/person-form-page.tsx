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
import { Combobox } from "@/components/ui/combobox"
import { Separator } from "@/components/ui/separator"
import { useTranslations } from "next-intl"
import { personSchema, PersonFormData, maritalStatusOptions } from "@/lib/validations/people"
import { Id } from "@/convex/_generated/dataModel"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

interface PersonFormPageProps {
  personId?: Id<"people">
  onSuccess?: () => void
}

export function PersonFormPage({
  personId,
  onSuccess,
}: PersonFormPageProps) {
  const t = useTranslations('People')
  const tCommon = useTranslations('Common')
  const { toast } = useToast()
  const router = useRouter()

  const person = useQuery(
    api.people.get,
    personId ? { id: personId } : "skip"
  )

  const cities = useQuery(api.cities.listWithRelations, {}) ?? []
  const countries = useQuery(api.countries.list, {}) ?? []
  const createPerson = useMutation(api.people.create)
  const updatePerson = useMutation(api.people.update)

  const form = useForm<PersonFormData>({
    resolver: zodResolver(personSchema),
    defaultValues: {
      fullName: "",
      email: "",
      cpf: "",
      birthDate: "",
      birthCityId: "" as Id<"cities">,
      nationalityId: "" as Id<"countries">,
      maritalStatus: "Single",
      profession: "",
      motherName: "",
      fatherName: "",
      phoneNumber: "",
      address: "",
      currentCityId: "" as Id<"cities">,
      photoUrl: "",
      notes: "",
    },
  })

  // Reset form when person data loads
  useEffect(() => {
    if (person) {
      form.reset({
        fullName: person.fullName,
        email: person.email,
        cpf: person.cpf ?? "",
        birthDate: person.birthDate,
        birthCityId: person.birthCityId,
        nationalityId: person.nationalityId,
        maritalStatus: person.maritalStatus as "Single" | "Married" | "Divorced" | "Widowed",
        profession: person.profession,
        motherName: person.motherName,
        fatherName: person.fatherName,
        phoneNumber: person.phoneNumber,
        address: person.address,
        currentCityId: person.currentCityId,
        photoUrl: person.photoUrl ?? "",
        notes: person.notes ?? "",
      })
    }
  }, [person, form])

  const onSubmit = async (data: PersonFormData) => {
    try {
      // Clean optional fields
      const submitData = {
        ...data,
        cpf: data.cpf || undefined,
        photoUrl: data.photoUrl || undefined,
        notes: data.notes || undefined,
      }

      if (personId) {
        await updatePerson({ id: personId, ...submitData })
        toast({
          title: t('updatedSuccess'),
        })
      } else {
        await createPerson(submitData)
        toast({
          title: t('createdSuccess'),
        })
      }

      // Call onSuccess callback if provided, otherwise navigate to list
      if (onSuccess) {
        onSuccess()
      } else {
        router.push('/people')
      }
    } catch (error) {
      toast({
        title: personId ? t('errorUpdate') : t('errorCreate'),
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      })
    }
  }

  const handleCancel = () => {
    router.push('/people')
  }

  const cityOptions = cities.map((city) => ({
    value: city._id,
    label: `${city.name}${city.state ? ` - ${city.state.code}` : ''}`,
  }))

  const countryOptions = countries.map((country) => ({
    value: country._id,
    label: country.name,
  }))

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h2 className="text-lg font-semibold">
          {personId ? t('editTitle') : t('newPerson')}
        </h2>
        <p className="text-sm text-muted-foreground">
          {personId
            ? "Edit the person information below"
            : t('createDescription')
          }
        </p>
      </div>
      <div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">{t('personalInfo')}</h3>

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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('email')}</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="john@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cpf"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('cpf')}</FormLabel>
                      <FormControl>
                        <Input placeholder="000.000.000-00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="birthDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('birthDate')}</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="birthCityId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('birthCity')}</FormLabel>
                      <FormControl>
                        <Combobox
                          options={cityOptions}
                          value={field.value}
                          onValueChange={field.onChange}
                          placeholder={t('selectBirthCity')}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="nationalityId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('nationality')}</FormLabel>
                    <FormControl>
                      <Combobox
                        options={countryOptions}
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder={t('selectNationality')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Family Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">{t('familyInfo')}</h3>

              <FormField
                control={form.control}
                name="maritalStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('maritalStatus')}</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t('selectMaritalStatus')} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {maritalStatusOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {t(`maritalStatus${option.value}` as any)}
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
                name="motherName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('motherName')}</FormLabel>
                    <FormControl>
                      <Input placeholder="Mother's full name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fatherName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('fatherName')}</FormLabel>
                    <FormControl>
                      <Input placeholder="Father's full name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Professional Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">{t('professionalInfo')}</h3>

              <FormField
                control={form.control}
                name="profession"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('profession')}</FormLabel>
                    <FormControl>
                      <Input placeholder="Software Engineer" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Contact Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">{t('contactInfo')}</h3>

              <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('phoneNumber')}</FormLabel>
                    <FormControl>
                      <Input placeholder="+55 11 98765-4321" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('address')}</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Street address" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currentCityId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('currentCity')}</FormLabel>
                    <FormControl>
                      <Combobox
                        options={cityOptions}
                        value={field.value}
                        onValueChange={field.onChange}
                        placeholder={t('selectCurrentCity')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Additional Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">{t('additionalInfo')}</h3>

              <FormField
                control={form.control}
                name="photoUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('photoUrl')}</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com/photo.jpg" {...field} />
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
                    <FormLabel>{t('notes')}</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Additional notes..." {...field} />
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
