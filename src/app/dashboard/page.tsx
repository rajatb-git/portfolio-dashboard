import * as React from 'react';

import { Alert } from '@mui/material';
import moment from 'moment';

import { getPriceForSymbol } from '@/api';
import Table from '@/components/Table/index';
import { HoldingsModel, IHoldingsModel } from 'db/models/HoldingsModel';

const getData = async (): Promise<[Error | null, Array<IHoldingsModel> | null]> => {
  const holdings = HoldingsModel();
  const rows = holdings.getAllRecords();

  try {
    await Promise.all(
      rows.map((x) =>
        getPriceForSymbol(x.symbol).then((response) => {
          const priceDate = moment(response.t * 1000);

          x.currentPrice = response.c;
          x.priceDate = priceDate.isValid() ? priceDate.format('lll') : '';
          x.percentChange = response.dp;
          x.dayHigh = response.h;
          x.dayLow = response.l;

          const currentValue = x.qty * response.c;
          const originalValue = x.qty * x.averagePrice;

          x.totalGL = currentValue - originalValue;
          x.totalGLPercent = (x.totalGL / originalValue) * 100;
          x.marketValue = x.qty * response.c;
        })
      )
    );
  } catch (err: any) {
    return [err as Error, null];
  }

  return [null, rows];
};

export default async function DashboardPage() {
  const [error, rows] = await getData();

  const columns = [
    {
      id: 'symbol',
      label: 'SYM',
    },
    {
      id: 'qty',
      label: 'Quantity',
      align: 'right',
    },
    {
      id: 'currentPrice',
      label: 'Current Price',
      align: 'right',
    },
    {
      id: 'percentChange',
      label: 'Change',
      align: 'right',
    },
    {
      id: 'totalGLPercent',
      label: 'Total G/L',
      align: 'right',
    },
    { id: 'moreMenu', label: '' },
  ];

  return (
    <>
      {error && (
        <Alert variant="filled" color="error" sx={{ my: 2 }}>
          {error.message}
        </Alert>
      )}

      <Table rows={rows || []} columns={columns} />
    </>
  );
}
