import * as React from 'react';

import { Alert } from '@mui/material';
import moment from 'moment';

import { getPriceForSymbol, getPriceForSymbolRevalidate } from '@/api/finnHub';
import { getHoldingsData } from '@/api/holdings';
import { getUserData } from '@/api/user';
import DashboardTable from '@/components/DashboardTable/DashTable';
import { IHoldingsModel } from '@/models/HoldingsModel';
import { IUserDBModel } from 'db/models/UserDBModel';

type Data = {
  rows: Array<IHoldingsModel>;
  users: Array<IUserDBModel>;
};

const getData = async (): Promise<[Error | null, Data | null]> => {
  const [holdingsError, holdingsData] = await getHoldingsData();
  const [usersError, usersData] = await getUserData();

  if (holdingsError || usersError) {
    return [holdingsError || usersError, null];
  }

  try {
    await Promise.all(
      holdingsData.map((x: any) =>
        getPriceForSymbol(x.symbol).then((response) => {
          const priceDate = moment.unix(response.t);

          x.currentPrice = response.c;
          x.priceDate = priceDate.isValid() ? priceDate.format('MMM DD, hh:mma') : '';
          x.percentChange = response.dp;
          x.dayHigh = response.h;
          x.dayLow = response.l;

          const currentValue = x.qty * response.c;
          x.originalValue = x.qty * x.averagePrice;

          x.totalGL = currentValue - x.originalValue;
          x.totalGLPercent = (x.totalGL / x.originalValue) * 100;
          x.marketValue = x.qty * response.c;
        })
      )
    );
  } catch (err: any) {
    return [err as Error, null];
  }

  return [null, { rows: holdingsData, users: usersData }];
};

export default async function DashboardPage() {
  const [error, data]: [Error | null, Data | null] = await getData();

  const columns = [
    {
      id: 'symbol',
      label: 'SYM',
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
    {
      id: 'currentPrice',
      label: 'Current Price',
      align: 'right',
    },

    { id: 'userId', label: 'Owner' },
  ];

  const refreshSymbolData = async () => {
    'use server';
    await getPriceForSymbolRevalidate();
  };

  return (
    <>
      {error && (
        <Alert variant="filled" color="error" sx={{ my: 2 }}>
          {error.message}
        </Alert>
      )}

      {data && (
        <DashboardTable refreshSymbolData={refreshSymbolData} rows={data.rows} users={data.users} columns={columns} />
      )}
    </>
  );
}
