export const calculateLateMinutes = (clockIn: string | null) => {
  if (!clockIn) return 0;
  const actual = new Date(clockIn);

  const officeTime = new Date(clockIn);
  officeTime.setHours(8, 0, 0, 0);

  const diffMs = actual.getTime() - officeTime.getTime();

  return diffMs > 0 ? Math.floor(diffMs / (1000 * 60)) : 0;
};
