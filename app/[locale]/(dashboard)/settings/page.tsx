import { getTranslations } from 'next-intl/server';
import type { Metadata } from 'next';
import { LanguageSwitcher } from '@/components/language-switcher';
import { DashboardPageHeader } from "@/components/dashboard-page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

type Props = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Settings' })

  return {
    title: t('title'),
    description: t('description'),
  }
}

export default async function SettingsPage() {
  const t = await getTranslations('Settings');
  const tBreadcrumbs = await getTranslations('Breadcrumbs');

  const breadcrumbs = [
    { label: tBreadcrumbs('dashboard'), href: "/dashboard" },
    { label: tBreadcrumbs('settings') }
  ];

  return (
    <>
      <DashboardPageHeader breadcrumbs={breadcrumbs} />
      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t('title')}</h1>
            <p className="text-sm text-muted-foreground">
              {t('description')}
            </p>
          </div>
        </div>

        <Separator className="my-4" />

        <div className="grid gap-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('languagePreferences')}</CardTitle>
              <CardDescription>
                {t('languageDescription')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    {t('currentLanguage')}
                  </label>
                  <LanguageSwitcher />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
