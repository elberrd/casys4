"use client"

import * as React from "react"
import { useRouter } from "@/i18n/routing"
import { UnsavedChangesDialog } from "@/components/ui/unsaved-changes-dialog"

interface NavigationBlockerContextType {
  /**
   * Whether navigation is currently blocked
   */
  isBlocked: boolean

  /**
   * Set the blocked state and callback for when unblocked
   * @param blocked - Whether to block navigation
   * @param onConfirmLeave - Callback when user confirms they want to leave
   */
  setBlocked: (blocked: boolean, onConfirmLeave?: () => void) => void

  /**
   * Attempt to navigate - will show dialog if blocked
   * @param href - The URL to navigate to
   * @returns true if navigation proceeded, false if blocked
   */
  navigateTo: (href: string) => boolean
}

const NavigationBlockerContext = React.createContext<NavigationBlockerContextType | null>(null)

export function NavigationBlockerProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [isBlocked, setIsBlocked] = React.useState(false)
  const [pendingNavigation, setPendingNavigation] = React.useState<string | null>(null)
  const [showDialog, setShowDialog] = React.useState(false)
  const onConfirmLeaveRef = React.useRef<(() => void) | undefined>(undefined)

  const setBlocked = React.useCallback((blocked: boolean, onConfirmLeave?: () => void) => {
    setIsBlocked(blocked)
    onConfirmLeaveRef.current = onConfirmLeave
  }, [])

  const navigateTo = React.useCallback((href: string): boolean => {
    if (isBlocked) {
      setPendingNavigation(href)
      setShowDialog(true)
      return false
    }
    router.push(href)
    return true
  }, [isBlocked, router])

  const handleConfirmLeave = React.useCallback(() => {
    setShowDialog(false)
    setIsBlocked(false)

    // Call the cleanup callback if provided
    if (onConfirmLeaveRef.current) {
      onConfirmLeaveRef.current()
    }

    // Navigate to pending URL
    if (pendingNavigation) {
      router.push(pendingNavigation)
      setPendingNavigation(null)
    }
  }, [pendingNavigation, router])

  const handleCancelLeave = React.useCallback(() => {
    setShowDialog(false)
    setPendingNavigation(null)
  }, [])

  const value = React.useMemo(() => ({
    isBlocked,
    setBlocked,
    navigateTo,
  }), [isBlocked, setBlocked, navigateTo])

  return (
    <NavigationBlockerContext.Provider value={value}>
      {children}
      <UnsavedChangesDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        onConfirm={handleConfirmLeave}
        onCancel={handleCancelLeave}
      />
    </NavigationBlockerContext.Provider>
  )
}

export function useNavigationBlocker() {
  const context = React.useContext(NavigationBlockerContext)
  if (!context) {
    throw new Error("useNavigationBlocker must be used within NavigationBlockerProvider")
  }
  return context
}

/**
 * Hook to block navigation when there are unsaved changes
 * @param hasUnsavedChanges - Whether there are unsaved changes
 * @param onConfirmLeave - Callback when user confirms they want to leave (use to reset form state)
 */
export function useBlockNavigation(hasUnsavedChanges: boolean, onConfirmLeave?: () => void) {
  const { setBlocked } = useNavigationBlocker()

  React.useEffect(() => {
    setBlocked(hasUnsavedChanges, onConfirmLeave)

    return () => {
      setBlocked(false, undefined)
    }
  }, [hasUnsavedChanges, onConfirmLeave, setBlocked])
}
