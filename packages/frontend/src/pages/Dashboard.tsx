import * as React from 'react';

import AlertDialog, { type DraftAlert, EMPTY_DRAFT } from '@/components/Alerts/AlertDialog';
import DashboardTable from '@/components/DashboardTable/DashTable';
import UpcomingEarningsCard from '@/components/Dashboard/UpcomingEarningsCard';
import { useDashboardData } from '@/contexts/DashboardDataContext';
import type { Column } from '@/types';

export default function Dashboard() {
  const { isLoading, isEarningsLoading, dashboardData, accounts, earnings, alertStatuses, refresh, loadAlerts } =
    useDashboardData();
  const [alertDialogOpen, setAlertDialogOpen] = React.useState(false);
  const [alertDraft, setAlertDraft] = React.useState<DraftAlert>(EMPTY_DRAFT);

  const columns: Array<Column> = [
    {
      id: 'symbol',
      label: 'SYM',
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

    { id: 'marketValue', label: 'Market Value', align: 'right' },
    { id: 'costBasis', label: 'Cost Basis', align: 'right' },
    { id: 'accountPercent', label: '% of Account', align: 'right' },
    { id: 'accountId', label: 'Account' },
    { id: '', label: 'Recommendation' },
  ];

  const handleSetAlert = (symbol: string, type: 'stock' | 'crypto', currentPrice?: number) => {
    setAlertDraft({
      ...EMPTY_DRAFT,
      symbol,
      type,
      targetPrice: currentPrice != null ? String(currentPrice) : '',
    });
    setAlertDialogOpen(true);
  };

  return (
    <>
      <DashboardTable
        isLoading={isLoading}
        refreshData={refresh}
        rows={dashboardData}
        accounts={accounts}
        columns={columns}
        alertStatuses={alertStatuses}
        onSetAlert={handleSetAlert}
      />
      <UpcomingEarningsCard earnings={earnings} isLoading={isEarningsLoading} />

      <AlertDialog
        open={alertDialogOpen}
        initial={alertDraft}
        onClose={() => setAlertDialogOpen(false)}
        onSaved={loadAlerts}
      />
    </>
  );
}
