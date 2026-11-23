import type { RecorderAdapter } from "@/hooks/useRecorder";
/** Browser recording stays in memory until the user explicitly downloads it. */
export function createRecorder(): RecorderAdapter {
  let generation = 0;
  let playbackRequest = 0;
  let stream: MediaStream | null = null;
  let recorder: MediaRecorder | null = null;
  let recordingDone: Promise<void> | null = null;
  let clip: Blob | null = null;
  let url: string | null = null;
  let audio: HTMLAudioElement | null = null;
  const stopTracks = () => { stream?.getTracks().forEach((track) => track.stop()); stream = null; };
  const stopPlayback = async () => { playbackRequest++; if (audio) { audio.pause(); audio.src = ""; audio = null; } };
  const dispose = () => {
    generation++; void stopPlayback();
    try { if (recorder?.state === "recording") recorder.stop(); } catch { /* Device may already have stopped recording. */ }
    recorder = null; stopTracks(); clip = null;
    if (url) URL.revokeObjectURL(url);
    url = null;
  };
  return {
    async start() {
      dispose(); const id = generation;
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") throw new Error("Recording unavailable");
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (id !== generation) { media.getTracks().forEach((track) => track.stop()); return; }
      stream = media;
      try {
        const mimeType = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find((type) => MediaRecorder.isTypeSupported(type));
        const instance = new MediaRecorder(media, mimeType ? { mimeType } : undefined);
        recorder = instance;
        const chunks: BlobPart[] = [];
        recordingDone = new Promise<void>((resolve, reject) => {
          instance.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
          instance.onstop = () => {
            media.getTracks().forEach((track) => track.stop());
            if (id === generation) {
              clip = new Blob(chunks, { type: instance.mimeType || "audio/webm" });
              if (clip.size) url = URL.createObjectURL(clip);
            }
            resolve();
          };
          instance.onerror = () => { media.getTracks().forEach((track) => track.stop()); reject(new Error("Recording failed")); };
        });
        // Avoid an unhandled rejection if a device error happens before Stop is pressed.
        void recordingDone.catch(() => {});
        instance.start();
      } catch (error) { stopTracks(); throw error; }
    },
    async stop() {
      if (recorder?.state === "recording") recorder.stop();
      await recordingDone; stopTracks();
      if (!url || !clip?.size) throw new Error("Empty recording");
    },
    async play(onEnd) {
      const stopping = stopPlayback(); const ticket = playbackRequest; await stopping;
      if (ticket !== playbackRequest) return;
      if (!url) throw new Error("No recording");
      const player = new Audio(url); audio = player;
      player.onended = onEnd; player.onerror = onEnd;
      await player.play();
    },
    stopPlayback,
    async save() {
      if (!url || !clip) throw new Error("No recording");
      const anchor = document.createElement("a");
      anchor.href = url; anchor.download = `linguacards-${Date.now()}.${clip.type.includes("mp4") ? "m4a" : "webm"}`;
      document.body.appendChild(anchor); anchor.click(); anchor.remove();
      return "Đã yêu cầu tải bản thu xuống thiết bị.";
    },
    dispose,
  };
}
