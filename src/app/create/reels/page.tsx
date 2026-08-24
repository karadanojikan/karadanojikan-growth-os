import { ReelsFlow } from "@/components/reels-flow";
export default async function ReelsPage({ searchParams }: { searchParams: Promise<{ topic?: string }> }) { const params=await searchParams; return <ReelsFlow topic={params.topic} />; }
