export const formatLateTime = (lateMinutes: number | null | undefined) => {
  if (!lateMinutes || lateMinutes <= 0) return "-";

  const hours = Math.floor(lateMinutes / 60);
  const minutes = lateMinutes % 60;

  if (hours === 0) {
    return `${minutes} mnt`;
  }

  if (minutes === 0) {
    return `${hours} jam`;
  }

  return `${hours} jam ${minutes} mnt`;
};
