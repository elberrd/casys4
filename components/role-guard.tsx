"use client"

import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { usePathname } from "next/navigation"
import { useRouter } from "@/i18n/routing"
import { useEffect } from "react"

const CLIENT_ALLOWED_PATHS = ["/individual-processes", "/settings"]

function isPathAllowed(pathname: string): boolean {
  // Remove locale prefix (e.g., /pt/individual-processes -> /individual-processes)
  const segments = pathname.split("/")
  const pathWithoutLocale = "/" + segments.slice(2).join("/")

  return CLIENT_ALLOWED_PATHS.some((allowed) =>
    pathWithoutLocale.startsWith(allowed)
  )
}

export function RoleGuard({ children }: { children: React.ReactNode }) {
  const userProfile = useQuery(api.userProfiles.getCurrentUser)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (!userProfile) return

    if (userProfile.role === "client" && !isPathAllowed(pathname)) {
      router.replace("/individual-processes")
    }
  }, [userProfile, pathname, router])

  // While loading profile, show children (auth is already handled by layout)
  if (userProfile === undefined) {
    return null
  }

  // If client on disallowed path, don't render until redirect
  if (userProfile?.role === "client" && !isPathAllowed(pathname)) {
    return null
  }

  return <>{children}</>
}
