import { parseWallClockDate } from "./date-format";

const parseAttendanceDateTime = (datetimeStr: string) => {
  if (/[zZ]$/.test(datetimeStr) || /[+-]\d{2}:\d{2}$/.test(datetimeStr)) {
    const parsed = new Date(datetimeStr);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  return parseWallClockDate(datetimeStr);
};

export const calculateLateMinutes = (clockIn: string | null) => {
  if (!clockIn) return 0;
  const actual = parseAttendanceDateTime(clockIn);
  if (!actual) return 0;

  const officeTime = parseAttendanceDateTime(clockIn);
  if (!officeTime) return 0;
  officeTime.setHours(8, 0, 0, 0);

  const diffMs = actual.getTime() - officeTime.getTime();

  return diffMs > 0 ? Math.floor(diffMs / (1000 * 60)) : 0;
};
