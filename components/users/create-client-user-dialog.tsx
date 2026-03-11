"use client"

import { useState, useEffect, useMemo } from "react"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Combobox } from "@/components/ui/combobox"
import { useTranslations } from "next-intl"
import { useToast } from "@/hooks/use-toast"
import { Copy, Eye, EyeOff, RefreshCw, Check } from "lucide-react"

interface CreateClientUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

function generatePassword(length = 12): string {
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
  const lower = "abcdefghijklmnopqrstuvwxyz"
  const digits = "0123456789"
  const all = upper + lower + digits

  // Ensure at least one of each type
  let password =
    upper[Math.floor(Math.random() * upper.length)] +
    lower[Math.floor(Math.random() * lower.length)] +
    digits[Math.floor(Math.random() * digits.length)]

  for (let i = 3; i < length; i++) {
    password += all[Math.floor(Math.random() * all.length)]
  }

  // Shuffle
  return password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("")
}

export function CreateClientUserDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateClientUserDialogProps) {
  const t = useTranslations("Users")
  const tCommon = useTranslations("Common")
  const { toast } = useToast()

  const eligiblePeople = useQuery(api.people.listEligibleForClientUser) ?? []
  const preRegisterUser = useMutation(api.userProfiles.preRegisterUser)

  const [selectedPersonId, setSelectedPersonId] = useState<string>("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showCredentials, setShowCredentials] = useState(false)
  const [createdEmail, setCreatedEmail] = useState("")
  const [createdPassword, setCreatedPassword] = useState("")
  const [copied, setCopied] = useState(false)

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setSelectedPersonId("")
      setPassword("")
      setShowPassword(false)
      setIsSubmitting(false)
      setShowCredentials(false)
      setCreatedEmail("")
      setCreatedPassword("")
      setCopied(false)
    } else {
      setPassword(generatePassword())
    }
  }, [open])

  const selectedPerson = useMemo(
    () => eligiblePeople.find((p) => p.personId === selectedPersonId),
    [eligiblePeople, selectedPersonId]
  )

  const personOptions = useMemo(
    () =>
      eligiblePeople.map((p) => ({
        value: p.personId,
        label: `${p.fullName} | ${p.companyName} | ${p.email}`,
      })),
    [eligiblePeople]
  )

  const handleGeneratePassword = () => {
    setPassword(generatePassword())
  }

  const handleCopyPassword = async () => {
    const textToCopy = showCredentials
      ? `${t("shareCredentialsEmail", { email: createdEmail })}\n${t("shareCredentialsPassword", { password: createdPassword })}`
      : password
    await navigator.clipboard.writeText(textToCopy)
    setCopied(true)
    toast({
      title: t("passwordCopied"),
    })
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSubmit = async () => {
    if (!selectedPerson || !password) return

    setIsSubmitting(true)
    try {
      await preRegisterUser({
        email: selectedPerson.email,
        fullName: selectedPerson.fullName,
        role: "client",
        companyId: selectedPerson.companyId,
      })

      setCreatedEmail(selectedPerson.email)
      setCreatedPassword(password)
      setShowCredentials(true)

      toast({
        title: t("clientUserCreatedSuccess"),
      })

      onSuccess()
    } catch (error) {
      toast({
        title: t("errorCreate"),
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      })
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={showCredentials ? undefined : onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("createClientUserTitle")}</DialogTitle>
          <DialogDescription>
            {t("createClientUserDescription")}
          </DialogDescription>
        </DialogHeader>

        {showCredentials ? (
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
              <h4 className="font-medium">{t("credentialsTitle")}</h4>
              <p className="text-sm text-muted-foreground">
                {t("shareCredentials")}
              </p>
              <div className="space-y-2 font-mono text-sm bg-background rounded p-3">
                <p>{t("shareCredentialsEmail", { email: createdEmail })}</p>
                <p>{t("shareCredentialsPassword", { password: createdPassword })}</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyPassword}
                className="gap-2"
              >
                {copied ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
                {t("copyPassword")}
              </Button>
            </div>
            <DialogFooter>
              <Button onClick={handleClose}>{t("close")}</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            {eligiblePeople.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t("noEligiblePeople")}
              </p>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>{t("selectPerson")}</Label>
                  <Combobox
                    options={personOptions}
                    value={selectedPersonId || undefined}
                    onValueChange={(val) => setSelectedPersonId(val ?? "")}
                    placeholder={t("selectPerson")}
                    searchPlaceholder={t("searchPerson")}
                    emptyText={t("noPeopleFound")}
                  />
                </div>

                {selectedPerson && (
                  <>
                    <div className="rounded-lg border bg-muted/50 p-3 space-y-1 text-sm">
                      <p>
                        <span className="font-medium">{t("fullName")}:</span>{" "}
                        {selectedPerson.fullName}
                      </p>
                      <p>
                        <span className="font-medium">{t("email")}:</span>{" "}
                        {selectedPerson.email}
                      </p>
                      <p>
                        <span className="font-medium">{t("company")}:</span>{" "}
                        {selectedPerson.companyName}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>{t("temporaryPassword")}</Label>
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input
                            type={showPassword ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="pr-10 font-mono"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="absolute right-0 top-0 h-full px-3"
                            onClick={() => setShowPassword(!showPassword)}
                            title={showPassword ? t("hidePassword") : t("showPassword")}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={handleGeneratePassword}
                          title={t("generatePassword")}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={handleCopyPassword}
                          title={t("copyPassword")}
                        >
                          {copied ? (
                            <Check className="h-4 w-4" />
                          ) : (
                            <Copy className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {tCommon("cancel")}
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={!selectedPerson || !password || password.length < 8 || isSubmitting}
              >
                {isSubmitting ? tCommon("loading") : t("createUser")}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
