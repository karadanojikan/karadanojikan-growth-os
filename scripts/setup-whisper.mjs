import path from "node:path";
import { downloadWhisperModel, installWhisperCpp } from "@remotion/install-whisper-cpp";

const whisperPath = path.resolve(".cache/whisper.cpp");
const version = "1.5.5";
const model = "base";

console.log(`Installing Whisper.cpp ${version} into ${whisperPath}`);
await installWhisperCpp({ version, to: whisperPath, printOutput: true });
console.log(`Downloading multilingual ${model} model`);
await downloadWhisperModel({ model, folder: whisperPath, printOutput: true });
console.log(JSON.stringify({ status: "READY", provider: "LOCAL_WHISPER", version, model, language: "ja", path: whisperPath }, null, 2));
