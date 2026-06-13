export type ComboPricingSeed = {
  productId: number;
  quantity: number;
  productPrice: number;
};

export type ComboLinePrice = {
  productId: number;
  quantity: number;
  baseLineTotal: number;
  lineTotal: number;
  unitPrice: number;
};

function roundMoney(value: number) {
  return Math.round(Number(value) || 0);
}

export function allocateComboPrice(comboPrice: number, seeds: ComboPricingSeed[]): ComboLinePrice[] {
  const safeComboPrice = Math.max(0, roundMoney(comboPrice));
  const normalizedSeeds = seeds
    .map((seed) => ({
      productId: seed.productId,
      quantity: Math.max(1, roundMoney(seed.quantity)),
      productPrice: Math.max(0, Number(seed.productPrice) || 0),
    }))
    .filter((seed) => seed.productId > 0);

  if (!normalizedSeeds.length) return [];

  const baseTotals = normalizedSeeds.map((seed) => ({
    ...seed,
    baseLineTotal: roundMoney(seed.quantity * seed.productPrice),
  }));
  const totalBase = baseTotals.reduce((sum, seed) => sum + seed.baseLineTotal, 0);

  if (totalBase <= 0) {
    const equalShare = Math.floor(safeComboPrice / baseTotals.length);
    let remainder = safeComboPrice - equalShare * baseTotals.length;
    return baseTotals.map((seed) => {
      const lineTotal = equalShare + (remainder > 0 ? 1 : 0);
      if (remainder > 0) remainder -= 1;
      return {
        productId: seed.productId,
        quantity: seed.quantity,
        baseLineTotal: seed.baseLineTotal,
        lineTotal,
        unitPrice: seed.quantity > 0 ? lineTotal / seed.quantity : lineTotal,
      };
    });
  }

  const allocated: ComboLinePrice[] = [];
  let assigned = 0;

  baseTotals.forEach((seed, index) => {
    const isLast = index === baseTotals.length - 1;
    const lineTotal = isLast
      ? Math.max(0, safeComboPrice - assigned)
      : roundMoney((safeComboPrice * seed.baseLineTotal) / totalBase);
    assigned += lineTotal;
    allocated.push({
      productId: seed.productId,
      quantity: seed.quantity,
      baseLineTotal: seed.baseLineTotal,
      lineTotal,
      unitPrice: seed.quantity > 0 ? lineTotal / seed.quantity : lineTotal,
    });
  });

  return allocated;
}
