"use client"

import { useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { useTranslations } from "next-intl"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Combobox } from "@/components/ui/combobox"
import { Switch } from "@/components/ui/switch"
import { personCompanySchema, type PersonCompanyFormData } from "@/lib/validations/peopleCompanies"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

interface PersonCompanyFormPageProps {
  relationshipId?: Id<"peopleCompanies">
  personId?: Id<"people">
  companyId?: Id<"companies">
  onSuccess?: () => void
}

export function PersonCompanyFormPage({
  relationshipId,
  personId,
  companyId,
  onSuccess,
}: PersonCompanyFormPageProps) {
  const t = useTranslations("PeopleCompanies")
  const tCommon = useTranslations("Common")
  const { toast } = useToast()
  const router = useRouter()

  const relationship = useQuery(
    api.peopleCompanies.get,
    relationshipId ? { id: relationshipId } : "skip"
  )
  const people = useQuery(api.people.list, {}) ?? []
  const companies = useQuery(api.companies.list, {}) ?? []

  const createRelationship = useMutation(api.peopleCompanies.create)
  const updateRelationship = useMutation(api.peopleCompanies.update)

  const form = useForm<PersonCompanyFormData>({
    resolver: zodResolver(personCompanySchema),
    defaultValues: {
      personId: personId ?? "",
      companyId: companyId ?? "",
      role: "",
      startDate: "",
      endDate: "",
      isCurrent: false,
    },
  })

  const isCurrent = form.watch("isCurrent")

  // Clear endDate when isCurrent is enabled
  useEffect(() => {
    if (isCurrent) {
      form.setValue("endDate", "")
    }
  }, [isCurrent, form])

  useEffect(() => {
    if (relationship) {
      form.reset({
        personId: relationship.personId,
        companyId: relationship.companyId,
        role: relationship.role,
        startDate: relationship.startDate,
        endDate: relationship.endDate ?? "",
        isCurrent: relationship.isCurrent,
      })
    } else {
      if (personId) form.setValue("personId", personId)
      if (companyId) form.setValue("companyId", companyId)
    }
  }, [relationship, personId, companyId, form])

  const onSubmit = async (data: PersonCompanyFormData) => {
    try {
      if (relationshipId) {
        await updateRelationship({
          id: relationshipId,
          personId: data.personId as Id<"people">,
          companyId: data.companyId as Id<"companies">,
          role: data.role,
          startDate: data.startDate,
          endDate: data.endDate || undefined,
          isCurrent: data.isCurrent,
        })
        toast({
          title: t("updatedSuccess"),
        })
      } else {
        await createRelationship({
          personId: data.personId as Id<"people">,
          companyId: data.companyId as Id<"companies">,
          role: data.role,
          startDate: data.startDate,
          endDate: data.endDate || undefined,
          isCurrent: data.isCurrent,
        })
        toast({
          title: t("createdSuccess"),
        })
      }

      // Call onSuccess callback if provided, otherwise navigate to list
      if (onSuccess) {
        onSuccess()
      } else {
        router.push('/people-companies')
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : (relationshipId ? t("errorUpdate") : t("errorCreate"))
      toast({
        title: errorMessage,
        variant: "destructive",
      })
    }
  }

  const handleCancel = () => {
    router.push('/people-companies')
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h2 className="text-lg font-semibold">
          {relationshipId ? t("editTitle") : t("newEmployment")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {relationshipId
            ? "Edit the person-company relationship below"
            : t("createDescriptionPage")
          }
        </p>
      </div>
      <div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="personId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("person")}</FormLabel>
                    <FormControl>
                      <Combobox
                        value={field.value}
                        onValueChange={field.onChange}
                        options={people.map((person) => ({
                          value: person._id,
                          label: person.fullName,
                        }))}
                        placeholder={t("selectPerson")}
                        searchPlaceholder={tCommon("search")}
                        emptyText={tCommon("noResults")}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="companyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("company")}</FormLabel>
                    <FormControl>
                      <Combobox
                        value={field.value}
                        onValueChange={field.onChange}
                        options={companies.map((company) => ({
                          value: company._id,
                          label: company.name,
                        }))}
                        placeholder={t("selectCompany")}
                        searchPlaceholder={tCommon("search")}
                        emptyText={tCommon("noResults")}
                      />
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
                    <FormLabel>{t("role")}</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="e.g. Software Engineer" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("startDate")}</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("endDate")}</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          disabled={isCurrent}
                          className={isCurrent ? "opacity-50" : ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="isCurrent"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">{t("isCurrent")}</FormLabel>
                      <p className="text-sm text-muted-foreground">
                        {t("isCurrentDescription")}
                      </p>
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
            </div>

            <div className="flex justify-end gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
              >
                {tCommon("cancel")}
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? tCommon("loading") : tCommon("save")}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  )
}
