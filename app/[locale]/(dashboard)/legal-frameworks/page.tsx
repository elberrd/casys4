import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { LegalFrameworksClient } from './legal-frameworks-client'

type Props = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'LegalFrameworks' })

  return {
    title: t('title'),
    description: t('description'),
  }
}

export default function LegalFrameworksPage() {
  return <LegalFrameworksClient />
}
