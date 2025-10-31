import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { PassportsClient } from './passports-client'

type Props = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Passports' })

  return {
    title: t('title'),
    description: t('description'),
  }
}

export default function PassportsPage() {
  return <PassportsClient />
}
