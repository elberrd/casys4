"use client"

import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Id } from "@/convex/_generated/dataModel"
import { useTranslations } from "next-intl"
import { EntityViewModal, ViewSection } from "@/components/ui/entity-view-modal"
import {
  createField,
  createRelationshipField,
  createBadgeField,
} from "@/lib/entity-view-helpers"
import { User, Mail, Phone, Building2, Calendar, Shield } from "lucide-react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

interface UserViewModalProps {
  userProfileId: Id<"userProfiles">
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: () => void
}

export function UserViewModal({
  userProfileId,
  open,
  onOpenChange,
  onEdit,
}: UserViewModalProps) {
  const t = useTranslations("Users")
  const tCommon = useTranslations("Common")

  const userProfile = useQuery(
    api.userProfiles.get,
    open ? { id: userProfileId } : "skip"
  )

  if (!userProfile) {
    return (
      <EntityViewModal
        open={open}
        onOpenChange={onOpenChange}
        title={t("userDetails")}
        sections={[]}
        size="lg"
        loading={true}
        loadingText={tCommon("loading")}
      />
    )
  }

  // Create avatar header
  const avatarHeader = (
    <div className="flex items-center gap-4 pb-4 border-b">
      <Avatar className="h-16 w-16">
        <AvatarImage src={userProfile.photoUrl} alt={userProfile.fullName} />
        <AvatarFallback className="text-lg">
          {userProfile.fullName
            .split(' ')
            .map(n => n[0])
            .join('')
            .substring(0, 2)
            .toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <h3 className="text-xl font-semibold">{userProfile.fullName}</h3>
        <p className="text-sm text-muted-foreground">{userProfile.email}</p>
      </div>
    </div>
  )

  const sections: ViewSection[] = [
    {
      title: t("basicInformation"),
      icon: <User className="h-5 w-5" />,
      fields: [
        createField(t("fullName"), userProfile.fullName),
        createField(t("email"), userProfile.email, "email", {
          icon: <Mail className="h-4 w-4" />,
        }),
        createField(t("phoneNumber"), userProfile.phoneNumber || "-", "phone", {
          icon: <Phone className="h-4 w-4" />,
        }),
        createBadgeField(
          t("role"),
          userProfile.role === "admin" ? t("admin") : t("client"),
          userProfile.role === "admin" ? "default" : "secondary",
          {
            icon: <Shield className="h-4 w-4" />,
          }
        ),
      ],
    },
  ]

  // Add company section if user is a client
  if (userProfile.role === "client" && userProfile.company) {
    sections.push({
      title: t("company"),
      icon: <Building2 className="h-5 w-5" />,
      fields: [
        createRelationshipField(
          t("company"),
          userProfile.company,
          "name",
          {
            icon: <Building2 className="h-4 w-4" />,
          }
        ),
      ],
    })
  }

  // Add account information section
  sections.push({
    title: t("accountInformation"),
    icon: <Calendar className="h-5 w-5" />,
    fields: [
      createBadgeField(
        t("status"),
        userProfile.isActive ? t("active") : t("inactive"),
        userProfile.isActive ? "success" : "destructive"
      ),
      createField(
        t("createdAt"),
        new Date(userProfile.createdAt).toLocaleDateString("pt-BR", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        "date",
        { icon: <Calendar className="h-4 w-4" /> }
      ),
      createField(
        t("updatedAt"),
        new Date(userProfile.updatedAt).toLocaleDateString("pt-BR", {
          year: "numeric",
          month: "long",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        }),
        "date",
        { icon: <Calendar className="h-4 w-4" /> }
      ),
      createBadgeField(
        t("accountStatus"),
        userProfile.userId ? t("activated") : t("preRegistered"),
        userProfile.userId ? "success" : "secondary"
      ),
    ],
  })

  return (
    <EntityViewModal
      open={open}
      onOpenChange={onOpenChange}
      title={t("userDetails")}
      sections={sections}
      size="lg"
      onEdit={onEdit}
      editButtonText={tCommon("edit")}
      customHeader={avatarHeader}
    />
  )
}
