"use client"

import * as React from "react"
import { Link } from "@/i18n/routing"
import { useNavigationBlocker } from "@/contexts/navigation-blocker-context"

type LinkProps = React.ComponentProps<typeof Link>

export interface SafeLinkProps extends Omit<LinkProps, "onClick"> {
  /**
   * Optional onClick handler that runs before navigation check
   */
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void
}

/**
 * SafeLink - A Link component that respects navigation blocking
 *
 * This component wraps the standard Link and checks if navigation is blocked
 * before allowing the user to navigate. If blocked, it will show a confirmation
 * dialog instead of navigating immediately.
 *
 * Use this component in navigation menus to prevent accidental data loss
 * when users have unsaved changes.
 *
 * @example
 * ```tsx
 * <SafeLink href="/dashboard">
 *   Dashboard
 * </SafeLink>
 * ```
 */
export const SafeLink = React.forwardRef<HTMLAnchorElement, SafeLinkProps>(
  ({ href, onClick, children, ...props }, ref) => {
    const { isBlocked, navigateTo } = useNavigationBlocker()

    const handleClick = React.useCallback(
      (e: React.MouseEvent<HTMLAnchorElement>) => {
        // Call original onClick if provided
        onClick?.(e)

        // If already prevented, don't do anything
        if (e.defaultPrevented) return

        // If navigation is blocked, prevent default and use our navigateTo
        if (isBlocked) {
          e.preventDefault()
          navigateTo(typeof href === "string" ? href : href.pathname || "/")
        }
      },
      [href, isBlocked, navigateTo, onClick]
    )

    return (
      <Link ref={ref} href={href} onClick={handleClick} {...props}>
        {children}
      </Link>
    )
  }
)

SafeLink.displayName = "SafeLink"
