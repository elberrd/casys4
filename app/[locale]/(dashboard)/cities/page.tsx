import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { CitiesClient } from './cities-client'

type Props = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Cities' })

  return {
    title: t('title'),
    description: t('description'),
  }
}

export default function CitiesPage() {
  return <CitiesClient />
}
