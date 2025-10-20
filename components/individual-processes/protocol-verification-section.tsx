"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  FileCheck,
  ShieldCheck,
  ShieldAlert,
  Info,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ProtocolVerificationSectionProps {
  protocolNumber?: string;
  verifiedStatus?: boolean;
  verifiedBy?: string;
  verifiedAt?: string;
  onVerificationToggle?: (verified: boolean) => void;
  isAdmin?: boolean;
}

export function ProtocolVerificationSection({
  protocolNumber,
  verifiedStatus = false,
  verifiedBy,
  verifiedAt,
  onVerificationToggle,
  isAdmin = false,
}: ProtocolVerificationSectionProps) {
  const t = useTranslations('IndividualProcesses');
  const tCommon = useTranslations('Common');
  const [instructionsOpen, setInstructionsOpen] = useState(false);

  // If no protocol number, don't show this section
  if (!protocolNumber) {
    return null;
  }

  const handleVerifyToggle = () => {
    if (onVerificationToggle) {
      onVerificationToggle(!verifiedStatus);
    }
  };

  const handleOpenInstructions = () => {
    setInstructionsOpen(true);
  };

  // Government portal URLs (placeholder - actual URLs may vary)
  const GOVERNMENT_PORTALS = [
    {
      name: "Portal de Imigração",
      url: "https://portaldeimigracao.mj.gov.br/",
    },
    {
      name: "Sistema Nacional de Registro de Estrangeiros",
      url: "https://www.gov.br/pf/pt-br/assuntos/imigracao",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-muted-foreground" />
            <CardTitle>{t('protocolVerification')}</CardTitle>
            {verifiedStatus ? (
              <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                {t('verified')}
              </Badge>
            ) : (
              <Badge variant="outline">
                <AlertCircle className="mr-1 h-3 w-3" />
                {t('unverified')}
              </Badge>
            )}
          </div>
          {isAdmin && (
            <Button
              variant={verifiedStatus ? "outline" : "default"}
              size="sm"
              onClick={handleVerifyToggle}
            >
              {verifiedStatus ? (
                <>
                  <ShieldAlert className="mr-2 h-4 w-4" />
                  {t('markAsUnverified')}
                </>
              ) : (
                <>
                  <ShieldCheck className="mr-2 h-4 w-4" />
                  {t('markAsVerified')}
                </>
              )}
            </Button>
          )}
        </div>
        <CardDescription>{t('protocolVerificationDescription')}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Protocol Number Display */}
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{t('protocolNumber')}</p>
            <p className="text-lg font-mono font-semibold">{protocolNumber}</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleOpenInstructions}>
            <Info className="mr-2 h-4 w-4" />
            {t('verifyProtocol')}
          </Button>
        </div>

        {/* Verification Status Details */}
        {verifiedStatus && verifiedBy && verifiedAt && (
          <div className={cn(
            "flex items-start gap-3 p-3 rounded-lg border",
            "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800"
          )}>
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
            <div className="flex-1 text-sm">
              <p className="font-medium text-green-700 dark:text-green-300">
                {t('verifiedBy', { name: verifiedBy })}
              </p>
              <p className="text-green-600 dark:text-green-400">
                {new Date(verifiedAt).toLocaleString()}
              </p>
            </div>
          </div>
        )}

        {/* Manual Verification Notice */}
        {!verifiedStatus && (
          <div className={cn(
            "flex items-start gap-3 p-3 rounded-lg border",
            "bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800"
          )}>
            <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
            <div className="flex-1 text-sm">
              <p className="font-medium text-yellow-700 dark:text-yellow-300">
                {t('manualVerificationRequired')}
              </p>
              <p className="text-yellow-600 dark:text-yellow-400">
                {t('manualVerificationNotice')}
              </p>
            </div>
          </div>
        )}

        {/* API Integration Placeholder */}
        {/*
          TODO: Future API Integration
          When government API becomes available, replace manual verification with:
          1. Automatic protocol status checking via API
          2. Real-time updates on protocol progress
          3. Automatic status synchronization

          API Endpoint Structure (placeholder):
          - GET /api/protocol/{protocolNumber}/status
          - Response: { status: "pending" | "approved" | "rejected", lastUpdate: timestamp }
        */}
      </CardContent>

      {/* Verification Instructions Modal */}
      <Dialog open={instructionsOpen} onOpenChange={setInstructionsOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{t('protocolVerificationInstructions')}</DialogTitle>
            <DialogDescription>{t('protocolVerificationInstructionsDesc')}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Step-by-step instructions */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm">{t('verificationSteps')}</h4>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>{t('verificationStep1')}</li>
                <li>{t('verificationStep2')}</li>
                <li>{t('verificationStep3')}</li>
                <li>{t('verificationStep4')}</li>
                <li>{t('verificationStep5')}</li>
              </ol>
            </div>

            {/* Government portal links */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm">{t('governmentPortals')}</h4>
              <div className="space-y-2">
                {GOVERNMENT_PORTALS.map((portal, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    className="w-full justify-between"
                    onClick={() => window.open(portal.url, '_blank', 'noopener,noreferrer')}
                  >
                    <span>{portal.name}</span>
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                ))}
              </div>
            </div>

            {/* Protocol number for easy copying */}
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">{t('yourProtocolNumber')}</p>
              <p className="font-mono font-semibold">{protocolNumber}</p>
            </div>

            {/* Note about manual verification */}
            <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg text-sm">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <p className="text-blue-700 dark:text-blue-300">
                {t('verificationNote')}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
