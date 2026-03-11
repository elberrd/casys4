import { Id } from "@/convex/_generated/dataModel"
import { IndividualProcessDetailClient } from "./individual-process-detail-client"

interface IndividualProcessDetailPageProps {
  params: Promise<{
    id: string
    locale: string
  }>
  searchParams: Promise<{
    collectiveProcessId?: string
    fromTask?: string
  }>
}

export default async function IndividualProcessDetailPage({ params, searchParams }: IndividualProcessDetailPageProps) {
  const resolvedParams = await params
  const resolvedSearchParams = await searchParams

  return (
    <IndividualProcessDetailClient
      processId={resolvedParams.id as Id<"individualProcesses">}
      locale={resolvedParams.locale}
      collectiveProcessId={resolvedSearchParams.collectiveProcessId as Id<"collectiveProcesses"> | undefined}
      fromTaskId={resolvedSearchParams.fromTask}
    />
  )
}
