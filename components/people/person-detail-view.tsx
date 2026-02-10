"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useTranslations, useLocale } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PassportsSubtable } from "./passports-subtable";
import { Button } from "@/components/ui/button";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Globe2,
  Calendar,
  FileText,
  Building2,
  Edit,
} from "lucide-react";
import { formatDate } from "@/lib/format-field-value";
import { getFullName } from "@/lib/utils/person-names";

interface PersonDetailViewProps {
  personId: Id<"people">;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: () => void;
}

export function PersonDetailView({
  personId,
  open,
  onOpenChange,
  onEdit,
}: PersonDetailViewProps) {
  const t = useTranslations("People");
  const tCommon = useTranslations("Common");
  const locale = useLocale();

  const person = useQuery(api.people.get, { id: personId });
  const currentCompany = useQuery(api.peopleCompanies.getCurrentByPerson, {
    personId,
  });

  if (!person) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{t("personDetails")}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <p className="text-muted-foreground">{tCommon("loading")}</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[90vh] p-0 w-[95vw]">
        <DialogHeader className="px-6 pt-6 pb-2 pr-14 flex flex-row items-center justify-between space-y-0">
          <DialogTitle className="text-xl font-semibold">
            {t("personDetails")}
          </DialogTitle>
          {onEdit && (
            <Button
              onClick={() => {
                onEdit();
                onOpenChange(false);
              }}
              size="sm"
              className="ml-auto mr-2"
            >
              <Edit className="h-4 w-4 mr-2" />
              {tCommon("edit")}
            </Button>
          )}
        </DialogHeader>

        <ScrollArea className="max-h-[calc(90vh-100px)] px-6 pb-6">
          <div className="space-y-6">
            {/* Photo */}
            {person.photoUrl && (
              <div className="flex justify-center">
                <img
                  src={person.photoUrl}
                  alt={getFullName(person)}
                  className="w-32 h-32 rounded-full object-cover border-4 border-border"
                />
              </div>
            )}

            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {t("basicInformation")}
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    {t("fullName")}
                  </p>
                  <p className="text-base mt-1">{getFullName(person)}</p>
                </div>
                {person.email && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      {t("email")}
                    </p>
                    <p className="text-base mt-1">{person.email}</p>
                  </div>
                )}
                {person.cpf && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      {t("cpf")}
                    </p>
                    <p className="text-base mt-1 font-mono">{person.cpf}</p>
                  </div>
                )}
                {person.phoneNumber && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      {t("phone")}
                    </p>
                    <p className="text-base mt-1">{person.phoneNumber}</p>
                  </div>
                )}
                {person.birthDate && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {t("birthDate")}
                    </p>
                    <p className="text-base mt-1">
                      {formatDate(person.birthDate, locale)}
                    </p>
                  </div>
                )}
                {person.nationality && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                      <Globe2 className="h-4 w-4" />
                      {t("nationality")}
                    </p>
                    <p className="text-base mt-1">{person.nationality.name}</p>
                  </div>
                )}
                {person.maritalStatus && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {t("maritalStatus")}
                    </p>
                    <p className="text-base mt-1">{person.maritalStatus}</p>
                  </div>
                )}
                {person.motherName && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {t("motherName")}
                    </p>
                    <p className="text-base mt-1">{person.motherName}</p>
                  </div>
                )}
                {person.fatherName && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">
                      {t("fatherName")}
                    </p>
                    <p className="text-base mt-1">{person.fatherName}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Birth Information */}
            {(person.birthCity || person.birthState) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    {t("birthInformation")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {person.birthCity && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        {t("birthCity")}
                      </p>
                      <p className="text-base mt-1">{person.birthCity.name}</p>
                    </div>
                  )}
                  {person.birthState && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        {t("birthState")}
                      </p>
                      <p className="text-base mt-1">{person.birthState.name}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Current Address */}
            {(person.address || person.currentCity) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    {t("currentAddress")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {person.address && (
                    <div className="md:col-span-2">
                      <p className="text-sm font-medium text-muted-foreground">
                        {t("address")}
                      </p>
                      <p className="text-base mt-1">{person.address}</p>
                    </div>
                  )}
                  {person.currentCity && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        {t("currentCity")}
                      </p>
                      <p className="text-base mt-1">
                        {person.currentCity.name}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Professional Information */}
            {(person.profession || person.cargo || currentCompany?.company) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    {t("professionalInformation")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {person.profession && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        {t("profession")}
                      </p>
                      <p className="text-base mt-1">{person.profession}</p>
                    </div>
                  )}
                  {person.cargo && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        {t("cargo")}
                      </p>
                      <p className="text-base mt-1">{person.cargo}</p>
                    </div>
                  )}
                  {currentCompany?.company && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        {t("company")}
                      </p>
                      <p className="text-base mt-1">
                        {currentCompany.company.name}
                      </p>
                    </div>
                  )}
                  {currentCompany?.role && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">
                        {t("companyRole")}
                      </p>
                      <p className="text-base mt-1">{currentCompany.role}</p>
                    </div>
                  )}
                  {currentCompany?.startDate && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {t("startDate")}
                      </p>
                      <p className="text-base mt-1">
                        {formatDate(currentCompany.startDate, locale)}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Additional Information */}
            {person.notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t("notes")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {person.notes}
                  </p>
                </CardContent>
              </Card>
            )}

            <Separator />

            {/* Passports Section */}
            <PassportsSubtable personId={personId} readonly={false} />
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
