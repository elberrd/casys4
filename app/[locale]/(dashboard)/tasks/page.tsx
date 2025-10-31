import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'
import { TasksClient } from './tasks-client'

type Props = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Tasks' })

  return {
    title: t('title'),
    description: t('description'),
  }
}

export default function TasksPage() {
  return <TasksClient />
}
