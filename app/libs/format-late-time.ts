import { calculateLateMinutes } from "./calculate-late-minute";

export const formatLateTime = (clockIn: string | null) => {
  if (!clockIn) return "-";

  const totalMinutes = calculateLateMinutes(clockIn);

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes} mnt`;
  }

  if (minutes === 0) {
    return `${hours} jam`;
  }

  return `${hours} jam ${minutes} mnt`;
};
