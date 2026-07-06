import numeral from 'numeral';

export const fnCurrency = (value = 0) => numeral(value).format('$0,0.00');

export const fnShortenCurrency = (value = 0) => numeral(value).format('$0,0.00a');

export const fnPercent = (value = 0) => numeral(value).format('0.00%');

export const fnBytes = (value = 0) => {
  if (!+value) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(value) / Math.log(k));

  return `${parseFloat((value / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

export const fnShortenNumber = (value = 0) => numeral(value).format('0.00a');

/**
 * @param {number} value - number in millions
 */
export const fnFormatCap = (value: number) => {
  const normalizedValue = value * Math.pow(10, 6);
  let cap: 'Mega' | 'Big' | 'Mid' | 'Small' | 'Micro' | 'Nano' = 'Nano';

  // Nano-cap: <$50m
  // Micro-cap: $50m - $250m
  if (normalizedValue >= 50 * Math.pow(10, 6) && normalizedValue < 250 * Math.pow(10, 6)) {
    cap = 'Micro';
    // Small-cap: $250m - $2b
  } else if (normalizedValue >= 250 * Math.pow(10, 6) && normalizedValue < 2 * Math.pow(10, 9)) {
    cap = 'Small';
    // Mid-cap: $2b - $10b
  } else if (normalizedValue >= 2 * Math.pow(10, 9) && normalizedValue < 10 * Math.pow(10, 9)) {
    cap = 'Mid';
    // Big-cap: $10b - $200b
  } else if (normalizedValue >= 10 * Math.pow(10, 9) && normalizedValue < 200 * Math.pow(10, 9)) {
    cap = 'Big';
    // Mega-cap: > $200b
  } else if (normalizedValue >= 200 * Math.pow(10, 9)) {
    cap = 'Mega';
  }

  return `${cap} Cap (${fnShortenCurrency(normalizedValue)})`;
};
