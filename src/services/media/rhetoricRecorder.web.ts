/**
 * Recording for the rhetoric module — desktop implementation.
 *
 * The interesting part is that ONE camera+microphone stream feeds TWO
 * recorders:
 *
 *   getUserMedia({ video, audio })
 *          |
 *          ├── MediaRecorder #1  (video + audio)  ->  stays on this machine,
 *          |                                          the speaker watches it
 *          |
 *          └── MediaRecorder #2  (audio track only) ->  uploaded for analysis
 *
 * Why not record once and strip the audio later? Because that would mean either
 * uploading the whole video (large, expensive, and the backend only accepts
 * mp4 while Chromium writes WebM) or decoding a video container in the page to
 * extract its audio. Running a second recorder over `stream.getAudioTracks()`
 * costs nothing and hands us a clean audio file the existing WAV converter
 * already knows how to prepare.
 *
 * If the camera is unavailable or refused, this falls back to audio only rather
 * than failing — a speech practice without video is still a speech practice.
 */
import { getMimeType, persistRecording } from "@/services/media/mediaStorage";
import { RhetoricRecording } from "@/types/rhetoric";

export interface RhetoricRecorderHandle {
  stop(durationSeconds: number): Promise<RhetoricRecording>;
  cancel(): Promise<void>;
  previewStream: unknown | null;
}

export function isVideoRecordingSupported(): boolean {
  // `mediaDevices` is undefined outside a secure context, which is exactly the
  // case this guards against; its `getUserMedia` member is typed as always
  // present, so only the object itself is worth checking.
  return (
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices) &&
    typeof MediaRecorder !== "undefined"
  );
}

/** Picks a container the browser will actually record, preferring WebM. */
function chooseMimeType(candidates: string[]): string | undefined {
  if (typeof MediaRecorder === "undefined" || !MediaRecorder.isTypeSupported) {
    return undefined;
  }
  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate));
}

interface ChunkRecorder {
  recorder: MediaRecorder;
  chunks: Blob[];
  stopped: Promise<Blob>;
}

function createChunkRecorder(stream: MediaStream, mimeType: string | undefined): ChunkRecorder {
  const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
  const chunks: Blob[] = [];

  recorder.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) {
      chunks.push(event.data);
    }
  };

  const stopped = new Promise<Blob>((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: recorder.mimeType || mimeType || "" }));
  });

  // A timeslice makes the recorder flush periodically instead of holding the
  // whole five minutes in one buffer, which keeps memory flat and means a
  // crash mid-session does not lose everything recorded so far.
  recorder.start(1000);

  return { recorder, chunks, stopped };
}

/**
 * `audioOnly` skips the camera entirely rather than asking for it and coping
 * with a refusal. The micro-drills use it: they are meant to be started five
 * times a day, and a camera permission prompt (or a camera light coming on) is
 * enough friction to stop someone doing the third one.
 */
export async function startRhetoricRecording(
  options: { audioOnly?: boolean } = {}
): Promise<RhetoricRecorderHandle> {
  if (!isVideoRecordingSupported()) {
    throw new Error("Bu ortamda kayıt desteklenmiyor.");
  }

  let stream: MediaStream;
  let hasVideo = !options.audioOnly;

  try {
    if (options.audioOnly) {
      throw new Error("audio-only");
    }
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
      audio: true
    });
  } catch {
    // Camera refused or missing. Audio alone is still a full practice, so the
    // session continues instead of stopping with an error.
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      hasVideo = false;
    } catch {
      throw new Error("Mikrofona erişilemedi. Windows gizlilik ayarlarından mikrofon iznini kontrol et.");
    }
  }

  const audioTracks = stream.getAudioTracks();
  if (audioTracks.length === 0) {
    stream.getTracks().forEach((track) => track.stop());
    throw new Error("Mikrofon bulunamadı. Ses olmadan analiz yapılamaz.");
  }

  const audioMimeType = chooseMimeType(["audio/webm;codecs=opus", "audio/webm", "audio/mp4"]);
  const videoMimeType = chooseMimeType(["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"]);

  const audioOnlyStream = new MediaStream(audioTracks);
  const audioRecorder = createChunkRecorder(audioOnlyStream, audioMimeType);
  const videoRecorder = hasVideo ? createChunkRecorder(stream, videoMimeType) : null;

  let finished = false;

  function releaseStream(): void {
    stream.getTracks().forEach((track) => track.stop());
  }

  return {
    previewStream: hasVideo ? stream : null,

    async stop(durationSeconds: number): Promise<RhetoricRecording> {
      finished = true;

      if (videoRecorder && videoRecorder.recorder.state !== "inactive") {
        videoRecorder.recorder.stop();
      }
      if (audioRecorder.recorder.state !== "inactive") {
        audioRecorder.recorder.stop();
      }

      const [audioBlob, videoBlob] = await Promise.all([
        audioRecorder.stopped,
        videoRecorder ? videoRecorder.stopped : Promise.resolve(null)
      ]);

      releaseStream();

      if (audioBlob.size === 0) {
        throw new Error("Kayıttan ses alınamadı. Mikrofonun çalıştığından emin ol.");
      }

      // Both files are written to disk so history still plays after a restart;
      // a blob: URL only lives as long as the page.
      const audioUri = await persistRecording(URL.createObjectURL(audioBlob), "audio");
      const videoUri =
        videoBlob && videoBlob.size > 0
          ? await persistRecording(URL.createObjectURL(videoBlob), "video")
          : audioUri;

      return {
        uri: videoUri,
        audioUri,
        hasVideo: videoUri !== audioUri,
        durationSeconds,
        mimeType: audioBlob.type || getMimeType("audio")
      };
    },

    async cancel(): Promise<void> {
      if (finished) {
        return;
      }
      finished = true;
      try {
        if (videoRecorder && videoRecorder.recorder.state !== "inactive") {
          videoRecorder.recorder.stop();
        }
        if (audioRecorder.recorder.state !== "inactive") {
          audioRecorder.recorder.stop();
        }
      } finally {
        releaseStream();
      }
    }
  };
}
