export const WEB_ADMIN_EMAIL = "vuongtuannghia585@gmail.com";

export function isWebAdmin(email: string | null | undefined) {
  return Boolean(email && email.trim().toLowerCase() === WEB_ADMIN_EMAIL);
}

export function normalizeMeetUrl(value: unknown): string {
  if (typeof value !== "string") throw new Error("Link Google Meet không hợp lệ.");
  const url = new URL(value.trim());
  if (url.protocol !== "https:" || url.hostname !== "meet.google.com" || !url.pathname || url.pathname === "/") {
    throw new Error("Chỉ chấp nhận link Google Meet dạng https://meet.google.com/...");
  }
  return url.toString();
}
