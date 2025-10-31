import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { DashboardClient } from './dashboard-client'

type Props = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Dashboard' })

  return {
    title: t('dashboard'),
    description: t('description'),
  }
}

export default function DashboardPage() {
  return <DashboardClient />
}
