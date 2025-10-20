"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Newspaper,
  ChevronDown,
  ChevronUp,
  Info,
  Copy,
  CheckCircle2,
  ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface DOUSectionFormProps {
  douNumber: string;
  douSection: string;
  douPage: string;
  douDate: string;
  verificationLink?: string;
  onChange: (field: string, value: string) => void;
  disabled?: boolean;
  defaultOpen?: boolean;
}

export function DOUSectionForm({
  douNumber,
  douSection,
  douPage,
  douDate,
  verificationLink = "",
  onChange,
  disabled = false,
  defaultOpen = false,
}: DOUSectionFormProps) {
  const t = useTranslations('IndividualProcesses');
  const tCommon = useTranslations('Common');
  const [isOpen, setIsOpen] = useState(defaultOpen || Boolean(douNumber || douSection || douPage || douDate));
  const [copied, setCopied] = useState(false);

  // Determine publication status
  const isPublished = Boolean(douDate);
  const hasAnyDouData = Boolean(douNumber || douSection || douPage || douDate);

  // Generate verification text for copy
  const getVerificationText = () => {
    const parts = [];
    if (douNumber) parts.push(`${t('douNumber')}: ${douNumber}`);
    if (douSection) parts.push(`${t('douSection')}: ${douSection}`);
    if (douPage) parts.push(`${t('douPage')}: ${douPage}`);
    if (douDate) {
      const formattedDate = new Date(douDate).toLocaleDateString();
      parts.push(`${t('douDate')}: ${formattedDate}`);
    }
    return parts.join('\n');
  };

  // Handle copy to clipboard
  const handleCopyDetails = async () => {
    const text = getVerificationText();
    if (!text) {
      toast.error(t('noDouDataToCopy'));
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success(t('douDetailsCopied'));
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      toast.error(t('copyFailed'));
    }
  };

  // DOU official website URL
  const DOU_WEBSITE_URL = "https://www.in.gov.br/consulta";

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-3">
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity">
          <div className="flex items-center gap-2">
            <Newspaper className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">{t('douPublication')}</h3>
            {isPublished && (
              <Badge variant="secondary" className="ml-2">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                {t('published')}
              </Badge>
            )}
            {!isPublished && hasAnyDouData && (
              <Badge variant="outline" className="ml-2">
                {t('notPublished')}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {hasAnyDouData && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyDetails();
                      }}
                      disabled={disabled || !hasAnyDouData}
                      className="h-8 w-8 p-0"
                    >
                      {copied ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t('copyDouDetails')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            {isOpen ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-4">
        {/* Information tooltip */}
        <div className="flex items-start gap-2 p-3 bg-muted/50 rounded-lg text-sm">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <p className="text-muted-foreground">
              {t('douVerificationInstructions')}
            </p>
            <Button
              type="button"
              variant="link"
              size="sm"
              className="h-auto p-0 text-primary"
              onClick={() => window.open(DOU_WEBSITE_URL, '_blank', 'noopener,noreferrer')}
            >
              {t('openDouWebsite')}
              <ExternalLink className="ml-1 h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Form fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="douNumber">
              {t('douNumber')}
              <span className="text-muted-foreground ml-1 text-xs">
                ({tCommon('optional')})
              </span>
            </Label>
            <Input
              id="douNumber"
              value={douNumber}
              onChange={(e) => onChange('douNumber', e.target.value)}
              placeholder={t('douNumberPlaceholder')}
              disabled={disabled}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="douSection">
              {t('douSection')}
              <span className="text-muted-foreground ml-1 text-xs">
                ({tCommon('optional')})
              </span>
            </Label>
            <Input
              id="douSection"
              value={douSection}
              onChange={(e) => onChange('douSection', e.target.value)}
              placeholder="1, 2, ou 3"
              disabled={disabled}
              maxLength={1}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="douPage">
              {t('douPage')}
              <span className="text-muted-foreground ml-1 text-xs">
                ({tCommon('optional')})
              </span>
            </Label>
            <Input
              id="douPage"
              value={douPage}
              onChange={(e) => onChange('douPage', e.target.value)}
              placeholder={t('douPagePlaceholder')}
              disabled={disabled}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="douDate">
              {t('douDate')}
              <span className="text-muted-foreground ml-1 text-xs">
                ({tCommon('optional')})
              </span>
            </Label>
            <Input
              id="douDate"
              type="date"
              value={douDate}
              onChange={(e) => onChange('douDate', e.target.value)}
              disabled={disabled}
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="verificationLink">
              {t('douVerificationLink')}
              <span className="text-muted-foreground ml-1 text-xs">
                ({tCommon('optional')})
              </span>
            </Label>
            <Input
              id="verificationLink"
              type="url"
              value={verificationLink}
              onChange={(e) => onChange('verificationLink', e.target.value)}
              placeholder={t('douVerificationLinkPlaceholder')}
              disabled={disabled}
            />
          </div>
        </div>

        {/* Publication status indicator */}
        {hasAnyDouData && (
          <div className={cn(
            "flex items-center gap-2 p-3 rounded-lg border",
            isPublished
              ? "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800"
              : "bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800"
          )}>
            {isPublished ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                <span className="text-sm text-green-700 dark:text-green-300">
                  {t('douPublishedOn', {
                    date: new Date(douDate).toLocaleDateString()
                  })}
                </span>
              </>
            ) : (
              <>
                <Info className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                <span className="text-sm text-yellow-700 dark:text-yellow-300">
                  {t('douAwaitingPublicationDate')}
                </span>
              </>
            )}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
