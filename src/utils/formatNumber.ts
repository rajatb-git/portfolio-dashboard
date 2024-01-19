import numeral from 'numeral';

export const fnCurrency = (value = 0) => numeral(value).format('$0,0.00');

export const fnPercent = (value = 0) => numeral(value).format('0.00%');

export const fnBytes = (value = 0) => {
  if (!+value) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];

  const i = Math.floor(Math.log(value) / Math.log(k));

  return `${parseFloat((value / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};
