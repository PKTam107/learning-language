import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { supabase } from "./supabase";
const validName = /^linguacards-\d+\.m4a$/;
async function directory() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session || !FileSystem.documentDirectory) throw new Error("Chưa đăng nhập");
  return `${FileSystem.documentDirectory}recordings/${session.user.id}/`;
}
export async function saveRecording(source: string) {
  const folder = await directory();
  await FileSystem.makeDirectoryAsync(folder, { intermediates: true });
  const name = `linguacards-${Date.now()}.m4a`;
  try { await FileSystem.copyAsync({ from: source, to: folder + name }); }
  catch (error) { await FileSystem.deleteAsync(folder + name, { idempotent: true }).catch(() => {}); throw error; }
  return name;
}
export async function listRecordings() {
  const folder = await directory();
  if (!(await FileSystem.getInfoAsync(folder)).exists) return [];
  return (await FileSystem.readDirectoryAsync(folder)).filter((name) => validName.test(name)).sort().reverse();
}
export async function removeRecording(name: string) {
  if (!validName.test(name)) throw new Error("Tên bản thu không hợp lệ");
  await FileSystem.deleteAsync((await directory()) + name, { idempotent: true });
}
export async function shareRecording(name: string) {
  if (!validName.test(name)) throw new Error("Tên bản thu không hợp lệ");
  if (!(await Sharing.isAvailableAsync())) throw new Error("Thiết bị chưa hỗ trợ chia sẻ tập tin");
  await Sharing.shareAsync((await directory()) + name, { mimeType: "audio/mp4", UTI: "public.mpeg-4-audio", dialogTitle: "Lưu hoặc chia sẻ bản thu" });
}
