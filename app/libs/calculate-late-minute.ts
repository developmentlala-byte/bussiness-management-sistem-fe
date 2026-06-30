import { parseWallClockDate } from "./date-format";

export const calculateLateMinutes = (clockIn: string | null) => {
  if (!clockIn) return 0;
  const actual = parseWallClockDate(clockIn);
  if (!actual) return 0;

  const officeTime = parseWallClockDate(clockIn);
  if (!officeTime) return 0;
  officeTime.setHours(8, 0, 0, 0);

  const diffMs = actual.getTime() - officeTime.getTime();

  return diffMs > 0 ? Math.floor(diffMs / (1000 * 60)) : 0;
};
