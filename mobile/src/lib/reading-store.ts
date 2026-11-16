import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";
import { parseLibrary, type ReadingStore } from "./reading-library";
async function key() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not signed in");
  return `linguacards.reading.v1.${session.user.id}`;
}
export function createReadingStore(): ReadingStore {
 let owner: Promise<string> | null = null;
 const accountKey = () => owner ??= key();
 return {
  async load() { return parseLibrary(await AsyncStorage.getItem(await accountKey())); },
  async save(items) { await AsyncStorage.setItem(await accountKey(), JSON.stringify(items)); },
 };
}
