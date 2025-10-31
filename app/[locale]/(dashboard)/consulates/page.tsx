import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { ConsulatesClient } from './consulates-client'

type Props = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Consulates' })

  return {
    title: t('title'),
    description: t('description'),
  }
}

export default function ConsulatesPage() {
  return <ConsulatesClient />
}
