import { supabase } from "../supabaseClient";

export type LinkKind = "share" | "calendar";

export async function createPathLink(kind: LinkKind): Promise<string> {
  const { data, error } = await supabase.rpc("create_path_link", { p_kind: kind });
  if (error || typeof data !== "string") throw new Error("Could not create the link. Try again.");
  return data;
}

export async function revokePathLink(kind: LinkKind): Promise<void> {
  const { error } = await supabase.rpc("revoke_path_link", { p_kind: kind });
  if (error) throw new Error("Could not turn the link off. Try again.");
}

export async function activeLinkKinds(): Promise<LinkKind[]> {
  const { data, error } = await supabase.rpc("get_path_link_status");
  if (error || !Array.isArray(data)) return [];
  return data.map((row: { kind: string }) => row.kind).filter((k): k is LinkKind => k === "share" || k === "calendar");
}

export interface SharedPath {
  first_name: string | null;
  grade: number | null;
  plans: { opportunity_id: string; status: string; steps: { id: string; title: string; kind: string; due?: string; done: boolean }[] }[];
  saved_ids: string[];
}

export async function fetchSharedPath(token: string): Promise<SharedPath | null> {
  const { data, error } = await supabase.rpc("get_shared_path", { p_token: token });
  if (error || !data) return null;
  return data as SharedPath;
}

export function shareUrl(token: string): string {
  return `${window.location.origin}/shared#${token}`;
}

/** webcal:// makes calendar apps subscribe instead of importing once. */
export function calendarFeedUrl(token: string): string {
  const base = (import.meta.env.VITE_SUPABASE_URL as string).replace(/\/$/, "");
  return `${base}/functions/v1/calendar-feed?t=${token}`;
}
