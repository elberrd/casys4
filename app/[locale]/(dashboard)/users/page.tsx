import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { UsersClient } from './users-client'

type Props = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Users' })

  return {
    title: t('title'),
    description: t('description'),
  }
}

export default function UsersPage() {
  return <UsersClient />
}
