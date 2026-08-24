import { AbsoluteFill, Html5Video, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import type { VideoEdl } from "../lib/video-domain";

export type KaradaReelProps = {
  sourceUrl: string;
  edl: VideoEdl;
};

const palette = {
  ink: "#2f342f",
  paper: "#faf8f3",
  sage: "#52604f",
  cream: "rgba(250, 248, 243, 0.94)",
};

export function KaradaReel({ sourceUrl, edl }: KaradaReelProps) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const seconds = frame / fps;
  const resolvedSourceUrl = sourceUrl.startsWith("public:") ? staticFile(sourceUrl.slice("public:".length)) : sourceUrl;
  const caption = edl.subtitles.find((cue) => seconds >= cue.startSeconds && seconds < cue.endSeconds);

  return <AbsoluteFill style={{ backgroundColor: palette.ink, fontFamily: '"Hiragino Sans", "Yu Gothic", sans-serif' }}>
    {sourceUrl ? edl.clips.map((clip) => {
      const from = Math.round(clip.timelineStart * fps);
      const durationInFrames = Math.max(1, Math.round(((clip.sourceEnd - clip.sourceStart) / clip.playbackRate) * fps));
      const clipDurationSeconds = durationInFrames / fps;
      return <Sequence key={clip.id} from={from} durationInFrames={durationInFrames}>
        <Html5Video
          src={resolvedSourceUrl}
          trimBefore={Math.round(clip.sourceStart * fps)}
          trimAfter={Math.round(clip.sourceEnd * fps)}
          playbackRate={clip.playbackRate}
          volume={(localFrame) => {
            const localSeconds = localFrame / fps;
            const fadeIn = edl.audio.fadeInSeconds > 0 ? Math.min(1, localSeconds / edl.audio.fadeInSeconds) : 1;
            const remaining = clipDurationSeconds - localSeconds;
            const fadeOut = edl.audio.fadeOutSeconds > 0 ? Math.min(1, remaining / edl.audio.fadeOutSeconds) : 1;
            return clip.volume * Math.max(0, Math.min(fadeIn, fadeOut));
          }}
          style={{ width: "100%", height: "100%", objectFit: clip.crop === "FIT" ? "contain" : "cover", transform: `scale(${clip.zoom})` }}
        />
      </Sequence>;
    }) : <AbsoluteFill style={{ background: "linear-gradient(150deg, #71806d 0%, #52604f 48%, #d6a57f 140%)" }}><div style={{ margin: "auto", color: "rgba(255,255,255,.32)", fontSize: 38, fontWeight: 800 }}>PHASE 2 RENDER FIXTURE</div></AbsoluteFill>}
    {edl.hook && seconds < 2.6 && <div style={{ position: "absolute", top: 150, left: 76, right: 76, padding: "24px 28px", borderRadius: 28, color: "white", background: "rgba(47,52,47,.75)", fontSize: 52, fontWeight: 800, lineHeight: 1.25, textAlign: "center" }}>{edl.hook}</div>}
    {caption && <div style={{ position: "absolute", left: 72, right: 72, bottom: 330, display: "flex", justifyContent: "center" }}>
      <div style={{ maxWidth: 900, padding: "18px 28px", borderRadius: 22, background: palette.cream, color: palette.ink, fontSize: 48, fontWeight: 800, lineHeight: 1.35, textAlign: "center", boxShadow: "0 12px 34px rgba(0,0,0,.18)" }}>
        {caption.lines.map((line) => <div key={line}>{line}</div>)}
      </div>
    </div>}
    <div style={{ position: "absolute", left: 50, top: 54, padding: "10px 18px", borderRadius: 999, color: "white", background: palette.sage, fontSize: 22, fontWeight: 800, letterSpacing: 1 }}>KARADA NO JIKAN</div>
    <div style={{ position: "absolute", left: 70, right: 70, bottom: 180, height: 2, background: "rgba(255,255,255,.26)" }} />
    <div style={{ position: "absolute", left: 70, bottom: 142, color: "rgba(255,255,255,.72)", fontSize: 20 }}>UI・アイコンと重ならないセーフエリア</div>
  </AbsoluteFill>;
}
