import axios from 'axios';

import { FINN_HUB_API, FINN_HUB_API_KEY } from '@/config';

export const getPriceForSymbol = (symbol: string) =>
  axios
    .get(FINN_HUB_API + symbol, {
      headers: { 'X-Finnhub-Token': FINN_HUB_API_KEY },
    })
    .then((response) => response.data);
