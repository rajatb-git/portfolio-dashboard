import * as React from 'react';

import { Alert, Grid } from '@mui/material';
import moment from 'moment';

import { getPriceForSymbol } from '@/api/finnHub';
import { getHoldingsData } from '@/api/holdings';
import { getUserData } from '@/api/user';
import DashboardTable from '@/components/DashboardTable/DashTable';
import TotalCard from '@/components/TotalCard';
import { IHoldingsModel } from '@/models/HoldingsModel';
import { IUserDBModel } from 'db/models/UserDBModel';

export type Total = {
  userId: string;
  totalGL: number;
  percentGL: number;
  totalInvestment: number;
};

type Data = {
  rows: Array<IHoldingsModel>;
  totals: Array<Total>;
  users: Array<IUserDBModel>;
};

const getData = async (): Promise<[Error | null, Data | null]> => {
  const [holdingsError, holdingsData] = await getHoldingsData();
  const [usersError, usersData] = await getUserData();

  if (holdingsError || usersError) {
    return [holdingsError || usersError, null];
  }

  let totals: Array<Total> = [];

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

    const tempMap: { [key: string]: Total } = {};
    holdingsData.forEach((x: IHoldingsModel) => {
      if (!tempMap[x.userId]) {
        tempMap[x.userId] = { userId: x.userId, totalGL: 0, percentGL: 0, totalInvestment: 0 };
      }

      tempMap[x.userId].totalGL += x.totalGL || 0;
      tempMap[x.userId].totalInvestment += x.originalValue || 0;
    });

    totals = Object.values(tempMap);
    totals.forEach((x) => {
      x.percentGL = x.totalGL / x.totalInvestment;
    });
  } catch (err: any) {
    return [err as Error, null];
  }

  return [null, { rows: holdingsData, totals, users: usersData }];
};

export default async function DashboardPage() {
  const [error, data]: [Error | null, Data | null] = await getData();

  const columns = [
    {
      id: 'symbol',
      label: 'SYM',
    },
    { id: 'userId', label: 'Owner' },
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
  ];

  return (
    <>
      {error && (
        <Alert variant="filled" color="error" sx={{ my: 2 }}>
          {error.message}
        </Alert>
      )}

      {data && (
        <>
          <Grid container spacing={3} sx={{ mb: 3 }}>
            {data.totals.map((total) => (
              <Grid key={total.userId} item xs={12} sm={6} lg={4} xl={3}>
                <TotalCard total={total} />
              </Grid>
            ))}
          </Grid>

          <DashboardTable rows={data.rows} users={data.users} columns={columns} />
        </>
      )}
    </>
  );
}
