import { CarouselFlow } from "@/components/carousel-flow";
export default async function CarouselPage({ searchParams }: { searchParams: Promise<{ topic?: string }> }) { const params=await searchParams; return <CarouselFlow topic={params.topic} />; }
