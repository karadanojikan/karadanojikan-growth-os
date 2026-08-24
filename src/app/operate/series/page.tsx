import { SeriesManager } from "@/components/series-manager";
import { getSeries } from "@/lib/phase1-data";
import { getAppMode } from "@/lib/runtime-config";
export default async function SeriesPage(){const series=await getSeries();return <div className="page"><header><p className="eyebrow">SERIES</p><h1 className="title">続きものを、続けられる形に。</h1><p className="lead mt-3">シリーズの進み具合を見ながら、次の投稿を決めます。</p></header><SeriesManager initialSeries={series} demo={getAppMode()==="demo"}/></div>}
