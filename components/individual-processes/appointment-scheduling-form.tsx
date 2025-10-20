"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from "@/components/ui/collapsible";
import {
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  CalendarClock
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AppointmentSchedulingFormProps {
  appointmentDateTime: string;
  appointmentLocation?: string;
  appointmentNotes?: string;
  onChange: (field: string, value: string) => void;
  disabled?: boolean;
  defaultOpen?: boolean;
  showCountdown?: boolean;
}

type AppointmentStatus = "scheduled" | "today" | "completed" | "missed";

export function AppointmentSchedulingForm({
  appointmentDateTime,
  appointmentLocation = "",
  appointmentNotes = "",
  onChange,
  disabled = false,
  defaultOpen = false,
  showCountdown = true,
}: AppointmentSchedulingFormProps) {
  const t = useTranslations('IndividualProcesses');
  const tCommon = useTranslations('Common');
  const [isOpen, setIsOpen] = useState(defaultOpen || Boolean(appointmentDateTime));
  const [countdown, setCountdown] = useState<string>("");

  // Calculate appointment status
  const getAppointmentStatus = (): AppointmentStatus | null => {
    if (!appointmentDateTime) return null;

    const now = new Date();
    const appointmentDate = new Date(appointmentDateTime);

    // Check if date is in the past (more than 24 hours ago)
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    if (appointmentDate < oneDayAgo) {
      return "missed"; // Or "completed" - we'll treat past as missed for now
    }

    // Check if today
    const isToday =
      appointmentDate.getDate() === now.getDate() &&
      appointmentDate.getMonth() === now.getMonth() &&
      appointmentDate.getFullYear() === now.getFullYear();

    if (isToday) {
      return "today";
    }

    // Future appointment
    return "scheduled";
  };

  // Calculate countdown text
  const calculateCountdown = (): string => {
    if (!appointmentDateTime) return "";

    const now = new Date();
    const appointmentDate = new Date(appointmentDateTime);
    const diff = appointmentDate.getTime() - now.getTime();

    // If in the past
    if (diff < 0) {
      return t('appointmentPassed');
    }

    // If today
    const isToday =
      appointmentDate.getDate() === now.getDate() &&
      appointmentDate.getMonth() === now.getMonth() &&
      appointmentDate.getFullYear() === now.getFullYear();

    if (isToday) {
      const hours = appointmentDate.getHours().toString().padStart(2, '0');
      const minutes = appointmentDate.getMinutes().toString().padStart(2, '0');
      return t('appointmentToday', { time: `${hours}:${minutes}` });
    }

    // Calculate days
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      const hours = Math.floor(diff / (1000 * 60 * 60));
      return t('appointmentInHours', { hours });
    } else if (days === 1) {
      return t('appointmentTomorrow');
    } else {
      return t('appointmentInDays', { days });
    }
  };

  // Update countdown every minute
  useEffect(() => {
    if (!showCountdown || !appointmentDateTime) return;

    const updateCountdown = () => {
      setCountdown(calculateCountdown());
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [appointmentDateTime, showCountdown]);

  const appointmentStatus = getAppointmentStatus();
  const hasAppointment = Boolean(appointmentDateTime);

  // Get status badge config
  const getStatusBadgeConfig = () => {
    switch (appointmentStatus) {
      case "today":
        return {
          variant: "default" as const,
          className: "bg-orange-500 hover:bg-orange-600",
          icon: AlertCircle,
          label: t('appointmentToday', { time: "" }).split(" ")[0] // Get "Today" part
        };
      case "scheduled":
        return {
          variant: "secondary" as const,
          className: "",
          icon: CalendarClock,
          label: t('appointmentScheduled')
        };
      case "missed":
        return {
          variant: "destructive" as const,
          className: "",
          icon: AlertCircle,
          label: t('appointmentMissed')
        };
      case "completed":
        return {
          variant: "default" as const,
          className: "bg-green-500 hover:bg-green-600",
          icon: CheckCircle2,
          label: t('appointmentCompleted')
        };
      default:
        return null;
    }
  };

  const statusConfig = getStatusBadgeConfig();

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-3">
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between cursor-pointer hover:opacity-80 transition-opacity">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">{t('appointment')}</h3>
            {statusConfig && (
              <Badge variant={statusConfig.variant} className={statusConfig.className}>
                <statusConfig.icon className="mr-1 h-3 w-3" />
                {statusConfig.label}
              </Badge>
            )}
          </div>
          {isOpen ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-4">
        {/* Countdown display */}
        {showCountdown && hasAppointment && countdown && (
          <div className={cn(
            "flex items-center gap-3 p-4 rounded-lg border",
            appointmentStatus === "today"
              ? "bg-orange-50 border-orange-200 dark:bg-orange-950 dark:border-orange-800"
              : appointmentStatus === "scheduled"
              ? "bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800"
              : "bg-gray-50 border-gray-200 dark:bg-gray-950 dark:border-gray-800"
          )}>
            <Clock className={cn(
              "h-5 w-5",
              appointmentStatus === "today"
                ? "text-orange-600 dark:text-orange-400"
                : appointmentStatus === "scheduled"
                ? "text-blue-600 dark:text-blue-400"
                : "text-gray-600 dark:text-gray-400"
            )} />
            <div className="flex-1">
              <p className={cn(
                "text-sm font-medium",
                appointmentStatus === "today"
                  ? "text-orange-700 dark:text-orange-300"
                  : appointmentStatus === "scheduled"
                  ? "text-blue-700 dark:text-blue-300"
                  : "text-gray-700 dark:text-gray-300"
              )}>
                {countdown}
              </p>
              {appointmentLocation && (
                <p className="text-xs text-muted-foreground mt-1">
                  <MapPin className="inline h-3 w-3 mr-1" />
                  {appointmentLocation}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Form fields */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="appointmentDateTime">
              {t('appointmentDateTime')}
              <span className="text-muted-foreground ml-1 text-xs">
                ({tCommon('optional')})
              </span>
            </Label>
            <Input
              id="appointmentDateTime"
              type="datetime-local"
              value={appointmentDateTime}
              onChange={(e) => onChange('appointmentDateTime', e.target.value)}
              disabled={disabled}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="appointmentLocation">
              {t('appointmentLocation')}
              <span className="text-muted-foreground ml-1 text-xs">
                ({tCommon('optional')})
              </span>
            </Label>
            <Input
              id="appointmentLocation"
              value={appointmentLocation}
              onChange={(e) => onChange('appointmentLocation', e.target.value)}
              placeholder={t('appointmentLocationPlaceholder')}
              disabled={disabled}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="appointmentNotes">
              {t('appointmentNotes')}
              <span className="text-muted-foreground ml-1 text-xs">
                ({tCommon('optional')})
              </span>
            </Label>
            <Textarea
              id="appointmentNotes"
              value={appointmentNotes}
              onChange={(e) => onChange('appointmentNotes', e.target.value)}
              placeholder={t('appointmentNotesPlaceholder')}
              disabled={disabled}
              rows={3}
            />
          </div>
        </div>

        {/* Help text */}
        {!hasAppointment && (
          <p className="text-sm text-muted-foreground">
            {t('appointmentHelpText')}
          </p>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}
