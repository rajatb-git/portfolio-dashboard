import * as React from 'react';

import { Alert } from '@mui/material';

import { getHoldingsData } from '@/api/holdings';
import { getUserData } from '@/api/user';
import DatabaseTable from '@/components/DatabaseTable/DBTable';
import { DBError } from 'db/DBError';

import { HoldingsDBModel, IHoldingsDBModel } from '../../../db/models/HoldingsDBModel';

const columns = [
  {
    id: 'userId',
    label: 'User',
  },
  {
    id: 'name',
    label: 'Name',
  },
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
    id: 'averagePrice',
    label: 'Average Price',
    align: 'right',
  },
  {
    id: 'targetPrice',
    label: 'Target Price',
    align: 'right',
  },
  {
    id: 'type',
    label: 'Type',
  },
  { id: 'actions', label: '' },
];

export default async function DataPage() {
  const [holdingsError, holdingsData] = await getHoldingsData();
  const [, usersData] = await getUserData();

  const deleteRecord = async (recordId: string) => {
    'use server';
    const holdingsModel = HoldingsDBModel();

    const deleteResponse = holdingsModel.deleteById(recordId);

    if (deleteResponse instanceof DBError) {
      console.error(deleteResponse.message);
    }
  };

  // const addNewHolding = (holding: IHoldingsDBModel) => {
  //   const holdingsModel = HoldingsDBModel();

  //   holdingsModel.findById
  // };

  const insertHoldingsData = async (newData: Array<IHoldingsDBModel>) => {
    'use server';
    const holdingsModel = HoldingsDBModel();

    holdingsModel.insertMany(newData);
  };

  return (
    <>
      {holdingsError && (
        <Alert variant="filled" color="error" sx={{ my: 2 }}>
          {holdingsError.message}
        </Alert>
      )}

      <DatabaseTable
        rows={holdingsData || []}
        columns={columns}
        handleDelete={deleteRecord}
        insertHoldingsData={insertHoldingsData}
        usersData={usersData || []}
      />
    </>
  );
}
