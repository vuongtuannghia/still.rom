import { db } from "@/db";
import { accounts, focusSessions } from "@/db/schema";
import { and, eq, gte, isNotNull } from "drizzle-orm";
import { apiError, getWorkspace, json } from "@/lib/server-api";

export const dynamic = "force-dynamic";

type Mode = "day" | "week" | "month";

function vietnamNowParts(date = new Date()) {
  const shifted = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    weekday: shifted.getUTCDay(),
  };
}

function utcFromVietnamParts(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month - 1, day, -7, 0, 0, 0));
}

function periodStart(mode: Mode, now = new Date()) {
  const p = vietnamNowParts(now);
  if (mode === "month") return utcFromVietnamParts(p.year, p.month, 1);
  if (mode === "day") return utcFromVietnamParts(p.year, p.month, p.day);
  const mondayOffset = (p.weekday + 6) % 7;
  const localDay = new Date(Date.UTC(p.year, p.month - 1, p.day - mondayOffset, 12, 0, 0));
  return utcFromVietnamParts(localDay.getUTCFullYear(), localDay.getUTCMonth() + 1, localDay.getUTCDate());
}

function formatMinutes(seconds: number) {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return minutes + " phút";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours + " giờ" + (rest ? " " + rest + " phút" : "");
}

export async function GET(request: Request) {
  try {
    const workspace = await getWorkspace(request, true);
    const now = new Date();
    const starts = {
      day: periodStart("day", now),
      week: periodStart("week", now),
      month: periodStart("month", now),
    };
    const earliest = starts.month;

    const rows = await db.select({
      accountId: accounts.id,
      name: accounts.name,
      picture: accounts.customPicture,
      googlePicture: accounts.picture,
      endedAt: focusSessions.endedAt,
      durationSeconds: focusSessions.durationSeconds,
      durationMinutes: focusSessions.durationMinutes,
    })
      .from(focusSessions)
      .innerJoin(accounts, eq(accounts.workspaceId, focusSessions.workspaceId))
      .where(and(
        isNotNull(focusSessions.endedAt),
        gte(focusSessions.endedAt, earliest),
      ));

    const people = new Map<string, { id: string; name: string; picture: string | null }>();
    const totals: Record<Mode, Map<string, number>> = {
      day: new Map(),
      week: new Map(),
      month: new Map(),
    };

    for (const row of rows) {
      if (!row.endedAt) continue;
      const seconds = row.durationSeconds ?? row.durationMinutes * 60;
      people.set(row.accountId, {
        id: row.accountId,
        name: row.name,
        picture: row.picture || row.googlePicture || null,
      });
      const ts = row.endedAt.getTime();
      for (const mode of ["day", "week", "month"] as const) {
        if (ts >= starts[mode].getTime()) {
          totals[mode].set(row.accountId, (totals[mode].get(row.accountId) ?? 0) + seconds);
        }
      }
    }

    const owner = await db.select({ id: accounts.id })
      .from(accounts)
      .where(eq(accounts.workspaceId, workspace.id))
      .limit(1);
    const currentId = owner[0]?.id ?? null;

    const result = {} as Record<Mode, unknown>;
    for (const mode of ["day", "week", "month"] as const) {
      const ranked = [...totals[mode].entries()]
        .map(([id, seconds]) => ({ person: people.get(id)!, seconds }))
        .filter(row => row.person)
        .sort((a, b) => b.seconds - a.seconds || a.person.name.localeCompare(b.person.name, "vi"));

      const top = ranked.slice(0, 10).map((row, index) => ({
        rank: index + 1,
        id: row.person.id,
        name: row.person.name,
        picture: row.person.picture,
        seconds: row.seconds,
        label: formatMinutes(row.seconds),
        me: row.person.id === currentId,
      }));

      const meIndex = ranked.findIndex(row => row.person.id === currentId);
      result[mode] = {
        rows: top,
        me: meIndex >= 10 ? {
          rank: meIndex + 1,
          id: ranked[meIndex].person.id,
          name: ranked[meIndex].person.name,
          picture: ranked[meIndex].person.picture,
          seconds: ranked[meIndex].seconds,
          label: formatMinutes(ranked[meIndex].seconds),
          me: true,
        } : null,
        totalAccounts: ranked.length,
      };
    }

    return json(result);
  } catch (error) {
    return apiError(error);
  }
}
