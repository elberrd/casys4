"use client"

import { useTranslations } from "next-intl"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  Globe,
  User,
  Calendar,
  FileText,
  Briefcase
} from "lucide-react"
import { formatCNPJ } from "@/lib/utils/document-masks"
import { format } from "date-fns"

interface CompanyInfoCardProps {
  companyId: Id<"companies">
}

export function CompanyInfoCard({ companyId }: CompanyInfoCardProps) {
  const t = useTranslations('Companies')
  const tCommon = useTranslations('Common')

  const company = useQuery(api.companies.get, { id: companyId })
  const economicActivities = useQuery(api.companies.getEconomicActivities, { companyId })

  if (!company) {
    return null
  }

  // Format full address from separate fields
  const fullAddress = [
    company.addressStreet && company.addressNumber
      ? `${company.addressStreet}, ${company.addressNumber}`
      : null,
    company.addressComplement,
    company.addressNeighborhood,
    company.city?.name,
    company.state?.code,
    company.addressPostalCode
  ].filter(Boolean).join(', ')

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {t('dashboard.companyInformation')}
          </CardTitle>
          <Badge variant={company.isActive ? "default" : "secondary"}>
            {company.isActive ? tCommon('active') : tCommon('inactive')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Tax ID (CNPJ) */}
          {company.taxId && (
            <div className="flex items-start gap-3">
              <FileText className="h-4 w-4 mt-1 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('taxId')}</p>
                <p className="text-sm">{formatCNPJ(company.taxId)}</p>
              </div>
            </div>
          )}

          {/* Opening Date */}
          {company.openingDate && (
            <div className="flex items-start gap-3">
              <Calendar className="h-4 w-4 mt-1 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('openingDate')}</p>
                <p className="text-sm">
                  {format(new Date(company.openingDate), 'dd/MM/yyyy')}
                </p>
              </div>
            </div>
          )}

          {/* Email */}
          {company.email && (
            <div className="flex items-start gap-3">
              <Mail className="h-4 w-4 mt-1 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('email')}</p>
                <a
                  href={`mailto:${company.email}`}
                  className="text-sm text-primary hover:underline"
                >
                  {company.email}
                </a>
              </div>
            </div>
          )}

          {/* Phone Number */}
          {company.phoneNumber && (
            <div className="flex items-start gap-3">
              <Phone className="h-4 w-4 mt-1 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('phoneNumber')}</p>
                <a
                  href={`tel:${company.phoneNumber}`}
                  className="text-sm text-primary hover:underline"
                >
                  {company.phoneNumber}
                </a>
              </div>
            </div>
          )}

          {/* Address */}
          {fullAddress && (
            <div className="flex items-start gap-3 md:col-span-2">
              <MapPin className="h-4 w-4 mt-1 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('address')}</p>
                <p className="text-sm">{fullAddress}</p>
              </div>
            </div>
          )}

          {/* Website */}
          {company.website && (
            <div className="flex items-start gap-3">
              <Globe className="h-4 w-4 mt-1 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('website')}</p>
                <a
                  href={company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  {company.website}
                </a>
              </div>
            </div>
          )}

          {/* Contact Person */}
          {company.contactPerson && (
            <div className="flex items-start gap-3">
              <User className="h-4 w-4 mt-1 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('contactPerson')}</p>
                <p className="text-sm">{company.contactPerson.fullName}</p>
              </div>
            </div>
          )}

          {/* Economic Activities */}
          {economicActivities && economicActivities.length > 0 && (
            <div className="flex items-start gap-3 md:col-span-2">
              <Briefcase className="h-4 w-4 mt-1 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  {t('economicActivities')}
                </p>
                <div className="flex flex-wrap gap-1">
                  {economicActivities.map((activity) => (
                    <Badge key={activity._id} variant="outline">
                      {activity.code ? `${activity.code} - ` : ''}{activity.name}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          {company.notes && (
            <div className="flex items-start gap-3 md:col-span-2">
              <FileText className="h-4 w-4 mt-1 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-muted-foreground">{t('notes')}</p>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{company.notes}</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
