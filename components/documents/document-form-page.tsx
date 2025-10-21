"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { useTranslations } from "next-intl"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Combobox } from "@/components/ui/combobox"
import { Switch } from "@/components/ui/switch"
import { documentSchema, type DocumentFormData } from "@/lib/validations/documents"

interface DocumentFormPageProps {
  documentId?: Id<"documents">
  onSuccess?: () => void
}

export function DocumentFormPage({
  documentId,
  onSuccess,
}: DocumentFormPageProps) {
  const t = useTranslations("Documents")
  const tCommon = useTranslations("Common")
  const { toast } = useToast()
  const router = useRouter()

  const [uploadingFile, setUploadingFile] = useState(false)
  const [uploadedStorageId, setUploadedStorageId] = useState<Id<"_storage"> | undefined>()

  const document = useQuery(
    api.documents.get,
    documentId ? { id: documentId } : "skip"
  )
  const documentTypes = useQuery(api.documentTypes.list, {}) ?? []
  const people = useQuery(api.people.list, {}) ?? []
  const companies = useQuery(api.companies.list, {}) ?? []

  const createDocument = useMutation(api.documents.create)
  const updateDocument = useMutation(api.documents.update)
  const generateUploadUrl = useMutation(api.documents.generateUploadUrl)

  const form = useForm<DocumentFormData>({
    resolver: zodResolver(documentSchema),
    defaultValues: {
      name: "",
      documentTypeId: "",
      personId: "",
      companyId: "",
      notes: "",
      issueDate: "",
      expiryDate: "",
      isActive: true,
    },
  })

  useEffect(() => {
    if (document) {
      form.reset({
        name: document.name,
        documentTypeId: document.documentTypeId,
        personId: document.personId || "",
        companyId: document.companyId || "",
        storageId: document.storageId || "",
        fileName: document.fileName || "",
        fileSize: document.fileSize || 0,
        fileType: document.fileType || "",
        notes: document.notes || "",
        issueDate: document.issueDate || "",
        expiryDate: document.expiryDate || "",
        isActive: document.isActive,
      })
      if (document.storageId) {
        setUploadedStorageId(document.storageId as Id<"_storage">)
      }
    } else {
      form.reset({
        name: "",
        documentTypeId: "",
        personId: "",
        companyId: "",
        notes: "",
        issueDate: "",
        expiryDate: "",
        isActive: true,
      })
      setUploadedStorageId(undefined)
    }
  }, [document, form])

  const handleFileUpload = async (file: File) => {
    setUploadingFile(true)
    try {
      // Get upload URL
      const uploadUrl = await generateUploadUrl()

      // Upload file
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      })

      if (!result.ok) {
        throw new Error("Upload failed")
      }

      const { storageId } = await result.json()
      setUploadedStorageId(storageId)

      // Update form with file metadata
      form.setValue("storageId", storageId)
      form.setValue("fileName", file.name)
      form.setValue("fileSize", file.size)
      form.setValue("fileType", file.type)

      toast({
        title: t("fileUploadedSuccess") || "File uploaded successfully",
      })
    } catch (error) {
      console.error("Error uploading file:", error)
      toast({
        title: t("errorUploadFile") || "Error uploading file",
        variant: "destructive",
      })
    } finally {
      setUploadingFile(false)
    }
  }

  const onSubmit = async (data: DocumentFormData) => {
    try {
      const payload = {
        name: data.name,
        documentTypeId: data.documentTypeId as Id<"documentTypes">,
        personId: data.personId ? (data.personId as Id<"people">) : undefined,
        companyId: data.companyId ? (data.companyId as Id<"companies">) : undefined,
        storageId: uploadedStorageId,
        fileName: data.fileName,
        fileSize: data.fileSize,
        fileType: data.fileType,
        notes: data.notes,
        issueDate: data.issueDate,
        expiryDate: data.expiryDate,
        isActive: data.isActive,
      }

      if (documentId) {
        await updateDocument({ id: documentId, ...payload })
        toast({
          title: t("updatedSuccess"),
        })
      } else {
        await createDocument(payload)
        toast({
          title: t("createdSuccess"),
        })
      }

      // Call onSuccess callback if provided, otherwise navigate to list
      if (onSuccess) {
        onSuccess()
      } else {
        router.push('/documents')
      }

      form.reset()
      setUploadedStorageId(undefined)
    } catch (error) {
      console.error("Error saving document:", error)
      toast({
        title: documentId ? t("errorUpdate") : t("errorCreate"),
        variant: "destructive",
      })
    }
  }

  const handleCancel = () => {
    router.push('/documents')
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h2 className="text-lg font-semibold">
          {documentId ? t("editTitle") : t("newDocument")}
        </h2>
        <p className="text-sm text-muted-foreground">
          {documentId
            ? t("editDescription") || "Edit the document details below"
            : t("createDescription") || "Add a new document to the system"}
        </p>
      </div>
      <div>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("name")}</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder={t("name")} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="documentTypeId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("documentType")}</FormLabel>
                  <FormControl>
                    <Combobox
                      options={documentTypes.map((type) => ({
                        label: type.name,
                        value: type._id,
                      }))}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder={t("selectDocumentType")}
                      searchPlaceholder={tCommon("search")}
                      emptyText={t("noDocumentTypes") || "No document types found"}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="personId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("person")}</FormLabel>
                    <FormControl>
                      <Combobox
                        options={people.map((person) => ({
                          label: person.fullName,
                          value: person._id,
                        }))}
                        value={field.value || ""}
                        onValueChange={field.onChange}
                        placeholder={t("selectPerson")}
                        searchPlaceholder={tCommon("search")}
                        emptyText={t("noPeople") || "No people found"}
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
                        options={companies.map((company) => ({
                          label: company.name,
                          value: company._id,
                        }))}
                        value={field.value || ""}
                        onValueChange={field.onChange}
                        placeholder={t("selectCompany")}
                        searchPlaceholder={tCommon("search")}
                        emptyText={t("noCompanies") || "No companies found"}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-2">
              <FormLabel>{t("file") || "File"}</FormLabel>
              <div className="border-2 border-dashed rounded-lg p-4">
                <Input
                  type="file"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      handleFileUpload(file)
                    }
                  }}
                  disabled={uploadingFile}
                />
                {uploadingFile && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {t("uploadingFile") || "Uploading file..."}
                  </p>
                )}
                {uploadedStorageId && !uploadingFile && (
                  <p className="text-sm text-green-600 mt-2">
                    {t("fileUploaded") || "File uploaded successfully"}: {form.watch("fileName")}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="issueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("issueDate")}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expiryDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("expiryDate")}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("notes")}</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder={t("notes")}
                      rows={3}
                    />
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
                    <FormLabel>{t("isActive")}</FormLabel>
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

            <div className="flex justify-end gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
              >
                {tCommon("cancel")}
              </Button>
              <Button type="submit" disabled={uploadingFile}>
                {tCommon("save")}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  )
}
