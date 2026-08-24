import { BrandBrainEditor } from "@/components/brand-brain-editor";
import { getBrandBrain } from "@/lib/phase1-data";
import { getAppMode } from "@/lib/runtime-config";
export default async function BrandSettingsPage(){const brand=await getBrandBrain();return <div className="page"><header><p className="eyebrow">BRAND BRAIN</p><h1 className="title">ブランドの判断基準</h1><p className="lead mt-3">AIが創作せず、からだのじかんらしく判断するためのSource of Truthです。</p></header><BrandBrainEditor initialBrand={brand} demo={getAppMode()==="demo"}/></div>;}
