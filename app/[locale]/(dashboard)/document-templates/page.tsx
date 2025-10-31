import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { DocumentTemplatesClient } from './document-templates-client'

type Props = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'DocumentTemplates' })

  return {
    title: t('title'),
    description: t('description'),
  }
}

export default function DocumentTemplatesPage() {
  return <DocumentTemplatesClient />
}
