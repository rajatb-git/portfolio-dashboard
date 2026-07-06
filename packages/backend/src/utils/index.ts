export const calulateAveragePriceBuy = (
  qty1: number,
  avgPrice1: number,
  qty2: number,
  avgPrice2: number
): { qty: number; averagePrice: number } => {
  let totalQty = 0,
    averagePrice = 0;

  totalQty = qty1 + qty2;

  const totalInvestment = qty1 * avgPrice1 + qty2 * avgPrice2;

  averagePrice = totalInvestment / totalQty;

  return { qty: totalQty, averagePrice };
};
