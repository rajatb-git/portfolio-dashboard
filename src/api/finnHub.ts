import { FINN_HUB_API, FINN_HUB_API_KEY } from '@/config';

export const getPriceForSymbol = (symbol: string) =>
  fetch(FINN_HUB_API + symbol, {
    next: { tags: ['symbol'], revalidate: 120 },
    headers: { 'X-Finnhub-Token': FINN_HUB_API_KEY, 'Content-Type': 'application/json' },
  }).then((response) => {
    if (response.ok) {
      return response.json();
    }

    throw new Error(`Unknown error => ${response.status}: ${response.statusText}`);
  });
