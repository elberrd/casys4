import { Id } from "@/convex/_generated/dataModel";
import { RequestDetailClient } from "./request-detail-client";

interface RequestDetailPageProps {
  params: Promise<{ id: string; locale: string }>;
}

export default async function RequestDetailPage({
  params,
}: RequestDetailPageProps) {
  const { id } = await params;
  return <RequestDetailClient requestId={id as Id<"individualProcesses">} />;
}
