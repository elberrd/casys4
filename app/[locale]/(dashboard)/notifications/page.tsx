import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { NotificationsClient } from './notifications-client'

type Props = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Notifications' })

  return {
    title: t('notifications'),
    description: t('description'),
  }
}

export default function NotificationsPage() {
  return <NotificationsClient />
}
