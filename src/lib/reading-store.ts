"use client";
import { createClient } from "@/lib/supabase/client";
import { parseLibrary, type ReadingStore } from "./reading-library";
async function key() {
  const { data: { session } } = await createClient().auth.getSession();
  if (!session) throw new Error("Not signed in");
  return `linguacards.reading.v1.${session.user.id}`;
}
export function createReadingStore(): ReadingStore {
 let owner: Promise<string> | null = null;
 const accountKey = () => owner ??= key();
 return {
  async load() { return parseLibrary(localStorage.getItem(await accountKey())); },
  async save(items) { localStorage.setItem(await accountKey(), JSON.stringify(items)); },
 };
}
