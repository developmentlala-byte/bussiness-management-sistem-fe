export const formatNumber = (val: number) =>
  new Intl.NumberFormat("id-ID").format(val);
