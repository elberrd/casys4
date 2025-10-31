import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { MainProcessesClient } from './main-processes-client'

type Props = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'MainProcesses' })

  return {
    title: t('title'),
    description: t('description'),
  }
}

export default function MainProcessesPage() {
  return <MainProcessesClient />
}
