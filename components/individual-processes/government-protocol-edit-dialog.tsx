"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { DOUSectionForm } from "./dou-section-form";
import { AppointmentSchedulingForm } from "./appointment-scheduling-form";

interface GovernmentProtocolEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
  onSuccess?: () => void;
}

export function GovernmentProtocolEditDialog({
  open,
  onOpenChange,
  individualProcess,
  onSuccess,
}: GovernmentProtocolEditDialogProps) {
  const t = useTranslations('IndividualProcesses');
  const tCommon = useTranslations('Common');

  const [formData, setFormData] = useState({
    mreOfficeNumber: individualProcess.mreOfficeNumber || "",
    douNumber: individualProcess.douNumber || "",
    douSection: individualProcess.douSection || "",
    douPage: individualProcess.douPage || "",
    douDate: individualProcess.douDate || "",
    verificationLink: "",
    protocolNumber: individualProcess.protocolNumber || "",
    rnmNumber: individualProcess.rnmNumber || "",
    rnmDeadline: individualProcess.rnmDeadline || "",
    appointmentDateTime: individualProcess.appointmentDateTime || "",
    appointmentLocation: "",
    appointmentNotes: "",
  });

  const updateProcess = useMutation(api.individualProcesses.update);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await updateProcess({
        id: individualProcess._id,
        mreOfficeNumber: formData.mreOfficeNumber || undefined,
        douNumber: formData.douNumber || undefined,
        douSection: formData.douSection || undefined,
        douPage: formData.douPage || undefined,
        douDate: formData.douDate || undefined,
        protocolNumber: formData.protocolNumber || undefined,
        rnmNumber: formData.rnmNumber || undefined,
        rnmDeadline: formData.rnmDeadline || undefined,
        appointmentDateTime: formData.appointmentDateTime || undefined,
      });

      toast.success(t('governmentProtocolUpdated'));
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating government protocol:", error);
      toast.error(t('governmentProtocolUpdateError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t('editGovernmentProtocol')}</DialogTitle>
          <DialogDescription>{t('editGovernmentProtocolDescription')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* MRE Office Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">{t('mreOffice')}</h3>
            <div className="space-y-2">
              <Label htmlFor="mreOfficeNumber">{t('mreOfficeNumber')}</Label>
              <Input
                id="mreOfficeNumber"
                value={formData.mreOfficeNumber}
                onChange={(e) => handleChange('mreOfficeNumber', e.target.value)}
                placeholder={t('mreOfficeNumberPlaceholder')}
              />
            </div>
          </div>

          {/* DOU Section */}
          <DOUSectionForm
            douNumber={formData.douNumber}
            douSection={formData.douSection}
            douPage={formData.douPage}
            douDate={formData.douDate}
            verificationLink={formData.verificationLink}
            onChange={handleChange}
            disabled={isSubmitting}
            defaultOpen={true}
          />

          {/* Protocol Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">{t('protocolSubmission')}</h3>
            <div className="space-y-2">
              <Label htmlFor="protocolNumber">{t('protocolNumber')}</Label>
              <Input
                id="protocolNumber"
                value={formData.protocolNumber}
                onChange={(e) => handleChange('protocolNumber', e.target.value)}
                placeholder={t('protocolNumberPlaceholder')}
              />
            </div>
          </div>

          {/* RNM Section */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium">{t('rnmInformation')}</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="rnmNumber">{t('rnmNumber')}</Label>
                <Input
                  id="rnmNumber"
                  value={formData.rnmNumber}
                  onChange={(e) => handleChange('rnmNumber', e.target.value)}
                  placeholder={t('rnmNumberPlaceholder')}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rnmDeadline">{t('rnmDeadline')}</Label>
                <Input
                  id="rnmDeadline"
                  type="date"
                  value={formData.rnmDeadline}
                  onChange={(e) => handleChange('rnmDeadline', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Appointment Section */}
          <AppointmentSchedulingForm
            appointmentDateTime={formData.appointmentDateTime}
            appointmentLocation={formData.appointmentLocation}
            appointmentNotes={formData.appointmentNotes}
            onChange={handleChange}
            disabled={isSubmitting}
            defaultOpen={true}
            showCountdown={false}
          />

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {tCommon('cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {tCommon('save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
