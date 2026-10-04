import { boundedInteger, isRecord, isUuid } from "./focus-domain";

export type YouTubeScene = { id: string; title: string; videoId: string; startSeconds: number; playlistId?: string };
export type RoomSettings = { selectedId: string; scenes: YouTubeScene[]; loop: boolean; youtubeMuted: boolean; stillMonochrome: boolean; videoView: "ambient" | "edge" | "studio"; ambientBlur: number; ambientDim: number; dockSide: "left" | "right"; pageBackdrop: boolean };
export const BUILTIN_SCENES = [
  { id: "quiet-window", title: "Cửa sổ trong rừng", detail: "Một khoảng sáng giữa ngày", image: "/scenes/reference-forest.jpg", position: "50% 50%" },
  { id: "slow-morning", title: "Sáng chậm bên bàn", detail: "Sách, trà và một nhịp yên", image: "/scenes/reference-forest.jpg", position: "50% 50%" },
] as const;
export const DEFAULT_ROOM: RoomSettings = { selectedId: "quiet-window", scenes: [], loop: true, youtubeMuted: false, stillMonochrome: false, videoView: "ambient", ambientBlur: 36, ambientDim: 35, dockSide: "left", pageBackdrop: true };
export function isVideoId(value: unknown): value is string { return typeof value === "string" && /^[A-Za-z0-9_-]{11}$/.test(value); }
export function isPlaylistId(value: unknown): value is string { return typeof value === "string" && /^(?:PL|UU|FL|LL|RD|OLAK5uy_)[A-Za-z0-9_-]{8,100}$/.test(value); }
export function isYouTubeMedia(value: { videoId?: unknown; playlistId?: unknown }) { return isVideoId(value.videoId) || (value.videoId === "" && isPlaylistId(value.playlistId)); }
function parseTime(value: string | null) {
  if (!value) return 0;
  if (/^\d+$/.test(value)) return Math.min(86400, Number(value));
  const match = value.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  return match ? Math.min(86400, Number(match[1] ?? 0) * 3600 + Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0)) : 0;
}
export function parseYouTubeLink(input: string): { videoId: string; startSeconds: number; playlistId?: string } {
  let raw = input.trim().replaceAll("&amp;", "&");
  if (/^[A-Za-z0-9_-]{11}$/.test(raw)) return { videoId: raw, startSeconds: 0 };
  // Accept a share message or a pasted official embed snippet, not arbitrary iframe HTML.
  const embedded = raw.match(/(?:src|href)\s*=\s*["'](https?:\/\/[^"']+)["']/i);
  const shared = raw.match(/https?:\/\/[^\s<>"']+/i);
  if (embedded) raw = embedded[1]; else if (shared) raw = shared[0].replace(/[),.;]+$/, "");
  let url: URL;
  try { url = new URL(/^(?:www\.|m\.|music\.)?(?:youtube\.com|youtu\.be|youtube-nocookie\.com)\//i.test(raw) ? `https://${raw}` : raw); }
  catch { throw new Error("Chưa thấy link YouTube. Hãy dán URL từ nút Chia sẻ hoặc mã video 11 ký tự."); }
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password || url.port) throw new Error("Đường dẫn YouTube không hợp lệ.");
  const host = url.hostname.toLowerCase();
  const path = url.pathname.split("/").filter(Boolean);
  let videoId: string | null = null;
  let playlistId: string | undefined;
  if (host === "youtu.be" || host === "www.youtu.be") videoId = path[0] ?? null;
  else if (["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com", "www.youtube-nocookie.com", "youtube-nocookie.com"].includes(host)) {
    if (path[0] === "watch") videoId = url.searchParams.get("v");
    else if (path[0] === "playlist" || (path[0] === "embed" && path[1] === "videoseries")) {
      const list = url.searchParams.get("list");
      if (isPlaylistId(list)) playlistId = list;
    } else if (["embed", "shorts", "live", "v"].includes(path[0])) videoId = path[1] ?? null;
    else if (path[0] === "attribution_link") {
      const inner = url.searchParams.get("u");
      if (inner?.startsWith("/watch?")) videoId = new URL(inner, "https://www.youtube.com").searchParams.get("v");
    }
  } else throw new Error("Chỉ nhận video từ youtube.com hoặc youtu.be, không nhận trang khác.");
  if (!isVideoId(videoId) && !playlistId) throw new Error("Link này chưa có video hoặc playlist. Hãy dùng link Chia sẻ của video, không phải link trang kênh.");
  return { videoId: isVideoId(videoId) ? videoId : "", startSeconds: parseTime(url.searchParams.get("t") ?? url.searchParams.get("start") ?? url.hash.replace(/^#t=/, "")), ...(playlistId ? { playlistId } : {}) };
}
export function normalizeRoom(value: unknown): RoomSettings {
  const v = isRecord(value) ? value : {};
  const scenes: YouTubeScene[] = [];
  if (Array.isArray(v.scenes)) for (const entry of v.scenes.slice(0, 12)) {
    if (!isRecord(entry) || !isUuid(entry.id) || !isYouTubeMedia(entry) || scenes.some((scene) => scene.id === entry.id)) continue;
    scenes.push({ id: entry.id, videoId: String(entry.videoId), title: typeof entry.title === "string" && entry.title.trim() ? entry.title.trim().slice(0, 80) : "Quang cảnh của bạn", startSeconds: typeof entry.startSeconds === "number" && Number.isInteger(entry.startSeconds) && entry.startSeconds >= 0 && entry.startSeconds <= 86400 ? entry.startSeconds : 0, ...(isPlaylistId(entry.playlistId) && !entry.videoId ? { playlistId: entry.playlistId } : {}) });
  }
  const selectedId = typeof v.selectedId === "string" && (BUILTIN_SCENES.some((scene) => scene.id === v.selectedId) || scenes.some((scene) => scene.id === v.selectedId)) ? v.selectedId : "quiet-window";
  return { selectedId, scenes, loop: v.loop !== false, youtubeMuted: v.youtubeMuted !== false, stillMonochrome: v.stillMonochrome === true, videoView: v.videoView === "studio" ? "studio" : "ambient", ambientBlur: boundedInteger(v.ambientBlur, 12, 64, 36), ambientDim: boundedInteger(v.ambientDim, 15, 75, 35), dockSide: v.dockSide === "right" ? "right" : "left", pageBackdrop: v.pageBackdrop !== false };
}
export function youtubeWatchUrl(scene: YouTubeScene) {
  return scene.videoId ? `https://www.youtube.com/watch?v=${scene.videoId}${scene.startSeconds ? `&t=${scene.startSeconds}` : ""}` : `https://www.youtube.com/playlist?list=${scene.playlistId}`;
}
export function buildYouTubeEmbed(scene: YouTubeScene, origin: string, loop: boolean, muted = true, standardHost = false) {
  const url = new URL(`https://${standardHost ? "www.youtube.com" : "www.youtube-nocookie.com"}/embed/${scene.videoId || "videoseries"}`);
  const params: Record<string, string> = { enablejsapi: "1", origin, autoplay: "1", mute: muted ? "1" : "0", playsinline: "1", controls: "1", rel: "0", hl: "vi", start: String(scene.startSeconds), loop: loop ? "1" : "0" };
  if (!scene.videoId && scene.playlistId) { params.list = scene.playlistId; params.listType = "playlist"; }
  else if (loop) params.playlist = scene.videoId;
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return url.toString();
}
