import { Composition } from "remotion";
import { KaradaReel } from "./karada-reel";
import { createInitialEdl, scriptToTranscript, type VideoMetadata } from "../lib/video-domain";

const fixtureMetadata: VideoMetadata = {
  width: 1080, height: 1920, durationSeconds: 12, fps: 30, codec: "h264", hasAudio: true,
  byteSize: 0, orientation: "PORTRAIT", container: "mp4", probeProvider: "FIXTURE", integrity: "OK",
};
const fixtureEdl = createInitialEdl({
  assetId: "fixture",
  metadata: fixtureMetadata,
  transcript: scriptToTranscript("今日の体調に合わせて、ゆっくり動きましょう。", 12),
  style: "EDUCATIONAL",
  hook: "肩の力を、ふっと抜く",
});

export function RemotionRoot() {
  return <Composition
    id="KaradaReel"
    component={KaradaReel}
    durationInFrames={360}
    fps={30}
    width={1080}
    height={1920}
    defaultProps={{ sourceUrl: "", edl: fixtureEdl }}
    calculateMetadata={({ props }) => ({
      durationInFrames: Math.max(1, Math.ceil(props.edl.clips.reduce((sum, clip) => sum + (clip.sourceEnd - clip.sourceStart) / clip.playbackRate, 0) * props.edl.fps)),
      fps: props.edl.fps,
      width: props.edl.width,
      height: props.edl.height,
    })}
  />;
}
