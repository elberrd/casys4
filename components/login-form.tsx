"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useAuthActions } from "@convex-dev/auth/react"
import { useRouter } from "@/i18n/routing"
import { useState, useEffect } from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useTranslations } from "next-intl"
import { InfoIcon, CheckCircle2 } from "lucide-react"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { signIn } = useAuthActions()
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [shouldCheckEmail, setShouldCheckEmail] = useState(false)
  const router = useRouter()
  const t = useTranslations('Users')

  // Check if email is pre-registered (only when in sign-up mode and email is provided)
  const preRegCheck = useQuery(
    api.userProfiles.checkPreRegisteredEmail,
    flow === "signUp" && email && shouldCheckEmail ? { email } : "skip"
  )

  const isPreRegistered = preRegCheck?.isPreRegistered ?? false
  const preRegProfile = preRegCheck?.userProfile

  // Reset email check when switching flows
  useEffect(() => {
    setShouldCheckEmail(false)
    setError(null)
  }, [flow])

  // Trigger email check when user stops typing (debounce)
  useEffect(() => {
    if (flow === "signUp" && email) {
      const timer = setTimeout(() => {
        setShouldCheckEmail(true)
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [email, flow])

  // Convert technical errors to user-friendly messages
  const getUserFriendlyError = (error: unknown): string => {
    if (!(error instanceof Error)) {
      return "An unexpected error occurred. Please try again."
    }

    const errorMessage = error.message

    // Check for common authentication errors
    if (errorMessage.includes("InvalidAccountId") || errorMessage.includes("retrieveAccount")) {
      return flow === "signIn"
        ? "Invalid email or password. Please check your credentials and try again."
        : "Unable to create account. Please contact support if this issue persists."
    }

    if (errorMessage.includes("User profile not found")) {
      return "Your account is not set up yet. Please contact an administrator."
    }

    if (errorMessage.includes("User profile not activated")) {
      return "Your account is pending activation. Please contact an administrator."
    }

    if (errorMessage.includes("Invalid credentials") || errorMessage.includes("incorrect password")) {
      return "Invalid email or password. Please try again."
    }

    if (errorMessage.includes("Email already exists") || errorMessage.includes("already registered")) {
      return "This email is already registered. Please sign in instead."
    }

    if (errorMessage.includes("network") || errorMessage.includes("fetch")) {
      return "Network error. Please check your connection and try again."
    }

    // If it's a short, non-technical message, show it as-is
    if (errorMessage.length < 100 && !errorMessage.includes("Request ID") && !errorMessage.includes(".ts:")) {
      return errorMessage
    }

    // Default fallback for unknown errors
    return "Unable to complete your request. Please try again or contact support."
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    const formData = new FormData(e.currentTarget)
    formData.set("flow", flow)

    try {
      await signIn("password", formData)
      router.push("/dashboard")
    } catch (error) {
      const errorMessage = getUserFriendlyError(error)
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value)
    setShouldCheckEmail(false) // Reset check until user stops typing
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle>
            {flow === "signIn"
              ? "Login to your account"
              : isPreRegistered
              ? t('activateAccount')
              : "Create an account"}
          </CardTitle>
          <CardDescription>
            {flow === "signIn"
              ? "Enter your email below to login to your account"
              : isPreRegistered
              ? t('setPasswordToActivate')
              : "Enter your email below to create your account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  disabled={isLoading}
                  value={email}
                  onChange={handleEmailChange}
                />
              </Field>

              {/* Show pre-registration info if detected */}
              {flow === "signUp" && isPreRegistered && preRegProfile && (
                <Alert className="bg-blue-500/10 border-blue-500/50">
                  <InfoIcon className="h-4 w-4 text-blue-500" />
                  <AlertDescription className="ml-2">
                    <div className="space-y-1">
                      <p className="font-medium text-blue-900 dark:text-blue-100">
                        {t('emailPreRegistered')}
                      </p>
                      <div className="text-sm text-blue-800 dark:text-blue-200 space-y-0.5">
                        <p className="flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>{t('yourRoleWillBe', { role: t(preRegProfile.role) })}</span>
                        </p>
                        {preRegProfile.companyName && (
                          <p className="flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            <span>{t('yourCompanyWillBe', { company: preRegProfile.companyName })}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  disabled={isLoading}
                />
              </Field>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              <Field>
                <Button type="submit" disabled={isLoading} className="w-full">
                  {isLoading
                    ? "Please wait..."
                    : flow === "signIn"
                    ? "Login"
                    : isPreRegistered
                    ? t('activateAccount')
                    : "Sign up"}
                </Button>
                <FieldDescription className="text-center">
                  {flow === "signIn" ? (
                    <>
                      Don&apos;t have an account?{" "}
                      <button
                        type="button"
                        onClick={() => {
                          setFlow("signUp")
                          setError(null)
                          setEmail("")
                          setShouldCheckEmail(false)
                        }}
                        className="underline hover:no-underline"
                        disabled={isLoading}
                      >
                        Sign up
                      </button>
                    </>
                  ) : (
                    <>
                      Already have an account?{" "}
                      <button
                        type="button"
                        onClick={() => {
                          setFlow("signIn")
                          setError(null)
                          setEmail("")
                          setShouldCheckEmail(false)
                        }}
                        className="underline hover:no-underline"
                        disabled={isLoading}
                      >
                        Sign in
                      </button>
                    </>
                  )}
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
