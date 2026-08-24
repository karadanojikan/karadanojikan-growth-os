import { IdeasManager } from "@/components/ideas-manager";
import { getIdeas } from "@/lib/phase1-data";
import { getAppMode } from "@/lib/runtime-config";
export default async function IdeasPage() { const ideas=await getIdeas(); return <div className="page"><header><p className="eyebrow">IDEAS</p><h1 className="title">思いつきを、次の投稿へ。</h1><p className="lead mt-3">短いメモでも保存し、ReelsやCarouselの企画へつなげられます。</p></header><IdeasManager initialIdeas={ideas} demo={getAppMode()==="demo"}/></div>; }
