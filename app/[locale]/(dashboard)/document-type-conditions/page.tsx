import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { DocumentTypeConditionsClient } from './document-type-conditions-client'

type Props = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'DocumentTypeConditions' })

  return {
    title: t('title'),
    description: t('description'),
  }
}

export default function DocumentTypeConditionsPage() {
  return <DocumentTypeConditionsClient />
}
