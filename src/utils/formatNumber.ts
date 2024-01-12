import numeral from 'numeral';

export const fnCurrency = (value?: number) => numeral(value || 0).format('$0,0.00');
