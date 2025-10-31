import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { CountriesClient } from './countries-client'

type Props = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Countries' })

  return {
    title: t('title'),
    description: t('description'),
  }
}

export default function CountriesPage() {
  return <CountriesClient />
}
