"use client";

import { Player } from "@remotion/player";
import { KaradaReel } from "@/remotion/karada-reel";
import type { VideoEdl } from "@/lib/video-domain";

export function VideoPreview({ sourceUrl, edl }: { sourceUrl: string; edl: VideoEdl }) {
  const durationSeconds = edl.clips.reduce((sum, clip) => sum + (clip.sourceEnd - clip.sourceStart) / clip.playbackRate, 0);
  return <div className="overflow-hidden rounded-[1.6rem] border border-white/20 bg-[#202420] shadow-2xl">
    <Player
      component={KaradaReel}
      inputProps={{ sourceUrl, edl }}
      durationInFrames={Math.max(1, Math.ceil(durationSeconds * edl.fps))}
      compositionWidth={1080}
      compositionHeight={1920}
      fps={edl.fps}
      controls
      showVolumeControls
      acknowledgeRemotionLicense
      style={{ width: "100%", aspectRatio: "9 / 16" }}
    />
  </div>;
}
