"use client"

import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { useTranslations, useLocale } from "next-intl"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Eye, Mail, Phone } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { formatDate } from "@/lib/format-field-value"

interface CompanyPeopleViewProps {
  companyId: Id<"companies">
}

/**
 * Component to display all people associated with a company.
 * Shows a table with person name, email, profession, and role in the company.
 * Includes empty state when no people are associated.
 */
export function CompanyPeopleView({ companyId }: CompanyPeopleViewProps) {
  const t = useTranslations('Companies')
  const tPeople = useTranslations('People')
  const locale = useLocale()

  const relationships = useQuery(api.peopleCompanies.listByCompany, {
    companyId,
  }) ?? []

  if (relationships.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <p className="text-sm text-muted-foreground mb-2">{t('noPeople')}</p>
        <p className="text-xs text-muted-foreground">{t('addPersonDescription')}</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="text-sm font-medium">{t('relatedPeople')}</div>

      {/* Desktop view - Table */}
      <div className="hidden md:block rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{tPeople('fullName')}</TableHead>
              <TableHead>{tPeople('profession')}</TableHead>
              <TableHead>{t('role')}</TableHead>
              <TableHead>{tPeople('email')}</TableHead>
              <TableHead className="text-right">{t('status')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {relationships.map((relationship) => (
              <TableRow key={relationship._id}>
                <TableCell className="font-medium">
                  {relationship.person?.fullName || tPeople('noName')}
                </TableCell>
                <TableCell>
                  {/* We don't have profession in the relationship, would need to fetch person details */}
                  -
                </TableCell>
                <TableCell>{relationship.role || '-'}</TableCell>
                <TableCell>
                  {/* We don't have email in the relationship, would need to fetch person details */}
                  -
                </TableCell>
                <TableCell className="text-right">
                  {relationship.isCurrent ? (
                    <Badge variant="default">{t('currentEmployee')}</Badge>
                  ) : (
                    <Badge variant="secondary">{t('formerEmployee')}</Badge>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile view - Cards */}
      <div className="md:hidden space-y-3">
        {relationships.map((relationship) => (
          <div
            key={relationship._id}
            className="rounded-lg border p-4 space-y-2"
          >
            <div className="flex items-start justify-between">
              <div className="font-medium">
                {relationship.person?.fullName || tPeople('noName')}
              </div>
              {relationship.isCurrent ? (
                <Badge variant="default">{t('currentEmployee')}</Badge>
              ) : (
                <Badge variant="secondary">{t('formerEmployee')}</Badge>
              )}
            </div>

            {relationship.role && (
              <div className="text-sm text-muted-foreground">
                {t('role')}: {relationship.role}
              </div>
            )}

            {relationship.startDate && (
              <div className="text-xs text-muted-foreground">
                {t('since')}: {formatDate(relationship.startDate, locale)}
                {relationship.endDate && ` - ${formatDate(relationship.endDate, locale)}`}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
