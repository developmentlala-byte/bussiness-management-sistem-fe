import { parseWallClockDate } from "./date-format";

const parseAttendanceDateTime = (datetimeStr: string) => {
  if (/[zZ]$/.test(datetimeStr) || /[+-]\d{2}:\d{2}$/.test(datetimeStr)) {
    const parsed = new Date(datetimeStr);
    return isNaN(parsed.getTime()) ? null : parsed;
  }
  return parseWallClockDate(datetimeStr);
};

// We need to update this to accept shift start time, but let's keep it for now since backend handles the status
export const calculateLateMinutes = (clockIn: string | null, shiftStartTime?: string) => {
  if (!clockIn) return 0;
  const actual = parseAttendanceDateTime(clockIn);
  if (!actual) return 0;

  let officeTime: Date | null;
  if (shiftStartTime) {
    // Parse shift start time (e.g., "10:00")
    const [hours, minutes] = shiftStartTime.split(':').map(Number);
    officeTime = parseAttendanceDateTime(clockIn);
    if (officeTime) {
      officeTime.setHours(hours, minutes, 0, 0);
    }
  } else {
    // Fallback to 8am
    officeTime = parseAttendanceDateTime(clockIn);
    if (officeTime) {
      officeTime.setHours(8, 0, 0, 0);
    }
  }
  if (!officeTime) return 0;

  // Add 15 minutes grace period
  const gracePeriodEnd = new Date(officeTime.getTime() + 15 * 60 * 1000);
  
  const diffMs = actual.getTime() - gracePeriodEnd.getTime();

  return diffMs > 0 ? Math.floor(diffMs / (1000 * 60)) : 0;
};
