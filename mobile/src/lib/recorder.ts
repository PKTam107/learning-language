import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import { saveRecording } from "./recordings";
import type { RecorderAdapter } from "@/hooks/useRecorder";
export function createRecorder(): RecorderAdapter {
  let generation = 0;
  let playbackRequest = 0;
  let recording: Audio.Recording | null = null;
  let sound: Audio.Sound | null = null;
  let uri: string | null = null;
  let saved: string | null = null;
  let cleanup: Promise<unknown> = Promise.resolve();
  let startup: Promise<void> = Promise.resolve();
  const stopPlayback = async () => { playbackRequest++; const current = sound; sound = null; if (current) await current.unloadAsync(); };
  const dispose = () => {
    generation++;
    const starting = startup;
    const current = recording; recording = null;
    const oldUri = uri; uri = null; saved = null;
    cleanup = cleanup.catch(() => {}).then(async () => {
      await starting.catch(() => {});
      await stopPlayback().catch(() => {});
      if (current) {
        await current.stopAndUnloadAsync().catch(() => {});
        const path = current.getURI();
        if (path) await FileSystem.deleteAsync(path, { idempotent: true }).catch(() => {});
      }
      if (oldUri) await FileSystem.deleteAsync(oldUri, { idempotent: true }).catch(() => {});
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false }).catch(() => {});
    });
  };
  return {
    start() {
      dispose(); const id = generation; const ready = cleanup;
      const task = (async () => {
      await ready;
      const permission = await Audio.requestPermissionsAsync();
      if (id !== generation) return;
      if (!permission.granted) throw new Error("Microphone denied");
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      if (id !== generation) { await Audio.setAudioModeAsync({ allowsRecordingIOS: false }); return; }
      const instance = new Audio.Recording();
      recording = instance;
      try {
        await instance.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
        if (id !== generation) { await instance.stopAndUnloadAsync().catch(() => {}); return; }
        await instance.startAsync();
      } catch (error) { await instance.stopAndUnloadAsync().catch(() => {}); await Audio.setAudioModeAsync({ allowsRecordingIOS: false }).catch(() => {}); throw error; }
      })();
      startup = task; return task;
    },
    async stop() {
      const id = generation;
      const instance = recording;
      if (!instance) throw new Error("No recording");
      try { await instance.stopAndUnloadAsync(); if (id !== generation) return; uri = instance.getURI(); recording = null; }
      finally { if (id === generation) await Audio.setAudioModeAsync({ allowsRecordingIOS: false }); }
      if (!uri) throw new Error("Empty recording");
      const info = await FileSystem.getInfoAsync(uri);
      if (!info.exists || !info.size) throw new Error("Empty recording");
    },
    async play(onEnd) {
      const id = generation; const stopping = stopPlayback(); const ticket = playbackRequest; await stopping;
      if (ticket !== playbackRequest) return;
      if (!uri) throw new Error("No recording");
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true });
      const { sound: player } = await Audio.Sound.createAsync({ uri }, { shouldPlay: false }, (status) => {
        if (id === generation && ((!status.isLoaded && status.error) || (status.isLoaded && status.didJustFinish))) onEnd();
      });
      if (id !== generation || ticket !== playbackRequest) { await player.unloadAsync(); return; }
      sound = player; await player.playAsync();
    },
    stopPlayback,
    async save() {
      if (!uri) throw new Error("No recording");
      if (!saved) saved = await saveRecording(uri);
      return "Đã lưu bản thu trên thiết bị. Mở Bản thu đã lưu trong màn Luyện nói để xuất hoặc xóa.";
    },
    dispose,
  };
}
