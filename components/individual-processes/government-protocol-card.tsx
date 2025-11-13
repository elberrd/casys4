"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Id } from "@/convex/_generated/dataModel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, FileText, Calendar, MapPin, Newspaper } from "lucide-react";
import { formatDate } from "@/lib/format-field-value";
import { GovernmentProtocolEditDialog } from "./government-protocol-edit-dialog";
import { GovernmentStatusBadge } from "./government-status-badge";
import { GovernmentProgressIndicator } from "./government-progress-indicator";

interface GovernmentProtocolCardProps {
  individualProcess: {
    _id: Id<"individualProcesses">;
    mreOfficeNumber?: string;
    douNumber?: string;
    douSection?: string;
    douPage?: string;
    douDate?: string;
    protocolNumber?: string;
    rnmNumber?: string;
    rnmDeadline?: string;
    appointmentDateTime?: string;
  };
  onEdit?: () => void;
  isAdmin?: boolean;
}

export function GovernmentProtocolCard({
  individualProcess,
  onEdit,
  isAdmin = false
}: GovernmentProtocolCardProps) {
  const t = useTranslations('IndividualProcesses');
  const tCommon = useTranslations('Common');
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  const handleEdit = () => {
    if (onEdit) {
      onEdit();
    } else {
      setEditDialogOpen(true);
    }
  };

  // Check if any government field is filled
  const hasGovernmentData =
    individualProcess.mreOfficeNumber ||
    individualProcess.douNumber ||
    individualProcess.douSection ||
    individualProcess.douPage ||
    individualProcess.douDate ||
    individualProcess.protocolNumber ||
    individualProcess.rnmNumber ||
    individualProcess.rnmDeadline ||
    individualProcess.appointmentDateTime;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {t('governmentProtocol')}
              </CardTitle>
              {hasGovernmentData && (
                <GovernmentStatusBadge individualProcess={individualProcess} />
              )}
            </div>
            <CardDescription>{t('governmentProtocolDescription')}</CardDescription>
          </div>
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={handleEdit}>
              <Edit className="mr-2 h-4 w-4" />
              {tCommon('edit')}
            </Button>
          )}
        </div>
        {hasGovernmentData && (
          <div className="mt-4">
            <GovernmentProgressIndicator individualProcess={individualProcess} />
          </div>
        )}
      </CardHeader>
      <CardContent>
        {!hasGovernmentData ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>{t('noGovernmentDataYet')}</p>
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={handleEdit} className="mt-4">
                <Edit className="mr-2 h-4 w-4" />
                {t('addGovernmentData')}
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* MRE Office Section */}
            {individualProcess.mreOfficeNumber && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{t('mreOffice')}</span>
                </div>
                <div className="pl-6">
                  <div className="grid grid-cols-[140px_1fr] gap-2 text-sm">
                    <span className="text-muted-foreground">{t('mreOfficeNumber')}</span>
                    <span className="font-mono">{individualProcess.mreOfficeNumber}</span>
                  </div>
                </div>
              </div>
            )}

            {/* DOU Section */}
            {(individualProcess.douNumber ||
              individualProcess.douSection ||
              individualProcess.douPage ||
              individualProcess.douDate) && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Newspaper className="h-4 w-4 text-muted-foreground" />
                  <span>{t('douPublication')}</span>
                  {individualProcess.douDate && (
                    <Badge variant="secondary" className="ml-auto">
                      {t('published')}
                    </Badge>
                  )}
                </div>
                <div className="pl-6">
                  <div className="grid grid-cols-[140px_1fr] gap-2 text-sm">
                    {individualProcess.douNumber && (
                      <>
                        <span className="text-muted-foreground">{t('douNumber')}</span>
                        <span className="font-mono">{individualProcess.douNumber}</span>
                      </>
                    )}
                    {individualProcess.douSection && (
                      <>
                        <span className="text-muted-foreground">{t('douSection')}</span>
                        <span>{individualProcess.douSection}</span>
                      </>
                    )}
                    {individualProcess.douPage && (
                      <>
                        <span className="text-muted-foreground">{t('douPage')}</span>
                        <span>{individualProcess.douPage}</span>
                      </>
                    )}
                    {individualProcess.douDate && (
                      <>
                        <span className="text-muted-foreground">{t('douDate')}</span>
                        <span>{formatDate(individualProcess.douDate)}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Protocol Number Section */}
            {individualProcess.protocolNumber && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span>{t('protocolSubmission')}</span>
                  <Badge variant="default" className="ml-auto">
                    {t('submitted')}
                  </Badge>
                </div>
                <div className="pl-6">
                  <div className="grid grid-cols-[140px_1fr] gap-2 text-sm">
                    <span className="text-muted-foreground">{t('protocolNumber')}</span>
                    <span className="font-mono">{individualProcess.protocolNumber}</span>
                  </div>
                </div>
              </div>
            )}

            {/* RNM Section */}
            {(individualProcess.rnmNumber || individualProcess.rnmDeadline) && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span>{t('rnmInformation')}</span>
                  {individualProcess.rnmNumber && (
                    <Badge variant="default" className="ml-auto bg-green-500">
                      {t('approved')}
                    </Badge>
                  )}
                </div>
                <div className="pl-6">
                  <div className="grid grid-cols-[140px_1fr] gap-2 text-sm">
                    {individualProcess.rnmNumber && (
                      <>
                        <span className="text-muted-foreground">{t('rnmNumber')}</span>
                        <span className="font-mono">{individualProcess.rnmNumber}</span>
                      </>
                    )}
                    {individualProcess.rnmDeadline && (
                      <>
                        <span className="text-muted-foreground">{t('rnmDeadline')}</span>
                        <span>{formatDate(individualProcess.rnmDeadline)}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Appointment Section */}
            {individualProcess.appointmentDateTime && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{t('appointmentScheduled')}</span>
                </div>
                <div className="pl-6">
                  <div className="grid grid-cols-[140px_1fr] gap-2 text-sm">
                    <span className="text-muted-foreground">{t('appointmentDateTime')}</span>
                    <span>{new Date(individualProcess.appointmentDateTime).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>

      <GovernmentProtocolEditDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        individualProcess={individualProcess}
      />
    </Card>
  );
}
