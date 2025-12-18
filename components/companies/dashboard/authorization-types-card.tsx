"use client"

import { useTranslations } from "next-intl"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface AuthorizationTypesCardProps {
  companyId: Id<"companies">
}

export function AuthorizationTypesCard({ companyId }: AuthorizationTypesCardProps) {
  const t = useTranslations('Companies.dashboard')

  const distribution = useQuery(api.companies.getCompanyProcessTypeDistribution, { companyId })

  if (!distribution) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('authorizationTypes')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (distribution.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('authorizationTypes')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-32">
            <p className="text-sm text-muted-foreground">{t('noProcesses')}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Generate color palette for different types
  const colors = [
    "bg-blue-500",
    "bg-green-500",
    "bg-purple-500",
    "bg-orange-500",
    "bg-pink-500",
    "bg-cyan-500",
    "bg-indigo-500",
    "bg-teal-500",
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('authorizationTypes')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Visual Bar Chart */}
          <div className="flex h-8 rounded-lg overflow-hidden bg-secondary">
            {distribution.map((type, index) => (
              <div
                key={type.processTypeId}
                className={`${colors[index % colors.length]} flex items-center justify-center transition-all hover:opacity-80`}
                style={{ width: `${type.percentage}%` }}
                title={`${type.processTypeName}: ${type.count} (${type.percentage}%)`}
              >
                {type.percentage >= 10 && (
                  <span className="text-white text-xs font-medium">
                    {type.percentage}%
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="grid grid-cols-1 gap-2">
            {distribution.map((type, index) => (
              <div key={type.processTypeId} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded ${colors[index % colors.length]}`} />
                  <span>{type.processTypeName}</span>
                </div>
                <Badge variant="secondary">
                  {type.count} ({type.percentage}%)
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
