import type { TFunction } from "i18next";

/**
 * Date-sectioning shared by every session list (the sidebar "Sessions" mode and the
 * /sessions history page). Kept apart from the components so both render the same
 * day headings from the same rules.
 */
export type DateSectionKey = "today" | "yesterday" | "thisWeek" | "thisMonth" | "older";

export const DATE_SECTION_ORDER = [
  "today",
  "yesterday",
  "thisWeek",
  "thisMonth",
  "older",
] as const satisfies readonly DateSectionKey[];

export function deriveDateSectionKey(lastActivityAt: Date): DateSectionKey {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 24 * 60 * 60 * 1000);
  const activityStart = new Date(
    lastActivityAt.getFullYear(),
    lastActivityAt.getMonth(),
    lastActivityAt.getDate(),
  );

  if (activityStart.getTime() >= todayStart.getTime()) {
    return "today";
  }
  if (activityStart.getTime() >= yesterdayStart.getTime()) {
    return "yesterday";
  }

  const diffTime = todayStart.getTime() - activityStart.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  if (diffDays <= 7) {
    return "thisWeek";
  }
  if (diffDays <= 30) {
    return "thisMonth";
  }
  return "older";
}

export function formatDateSectionLabel(t: TFunction, section: DateSectionKey): string {
  switch (section) {
    case "today":
      return t("agentList.dateSections.today");
    case "yesterday":
      return t("agentList.dateSections.yesterday");
    case "thisWeek":
      return t("agentList.dateSections.thisWeek");
    case "thisMonth":
      return t("agentList.dateSections.thisMonth");
    case "older":
      return t("agentList.dateSections.older");
  }
}
