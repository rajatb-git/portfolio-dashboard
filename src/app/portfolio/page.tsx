import * as React from 'react';

import moment from 'moment';

import { getPriceForSymbol } from '@/api';
import Table from '@/components/Table/index';
import { HoldingsModel } from 'db/models/HoldingsModel';

export const getData = async () => {
  const holdings = HoldingsModel();
  const rows = holdings.getAllRecords();

  await Promise.all(
    rows.map((x) =>
      getPriceForSymbol(x.symbol).then((response) => {
        console.log(response);
        x.currentPrice = response.c;
        x.priceDate = moment(response.t * 1000).format('lll');
      })
    )
  );

  return rows;
};

export default async function PortfolioPage() {
  const rows = await getData();

  const columns = [
    {
      id: 'symbol',
      label: 'SYM',
    },
    {
      id: 'name',
      label: 'Name',
    },
    {
      id: 'qty',
      label: 'Quantity',
    },
    {
      id: 'averagePrice',
      label: 'Average Price',
    },
    {
      id: 'currentPrice',
      label: 'Current Price',
    },
    {
      id: 'priceDate',
      label: 'Price Date',
    },
  ];

  return <Table rows={rows} columns={columns} />;
}
