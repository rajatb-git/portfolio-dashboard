import { Alert, Stack, Typography } from '@mui/material';
import moment from 'moment';
import * as React from 'react';

import AlertDialog, { type DraftAlert, EMPTY_DRAFT } from '@/components/Alerts/AlertDialog';
import ReportedEarningsCard from '@/components/Dashboard/ReportedEarningsCard';
import UpcomingEarningsCard from '@/components/Dashboard/UpcomingEarningsCard';
import DashboardTable from '@/components/DashboardTable/DashTable';
import GetStartedCard from '@/components/Import/GetStartedCard';
import PageHeader from '@/components/ui/PageHeader';
import ToolbarButton from '@/components/ui/ToolbarButton';
import { useDashboardData } from '@/contexts/DashboardDataContext';
import type { Column } from '@/types';

export default function Dashboard() {
  const {
    isLoading,
    isEarningsLoading,
    dashboardData,
    accounts,
    earnings,
    earningsResults,
    alertStatuses,
    lastUpdated,
    connectionError,
    refresh,
    revalidate,
    loadAlerts,
  } = useDashboardData();
  const [alertDialogOpen, setAlertDialogOpen] = React.useState(false);
  const [alertDraft, setAlertDraft] = React.useState<DraftAlert>(EMPTY_DRAFT);

  // Cached data survives navigation, so pick up accounts/holdings edited on other pages right away.
  React.useEffect(() => {
    revalidate();
  }, [revalidate]);

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
    { id: 'originalValue', label: 'Cost Basis', align: 'right' },
    { id: 'accountPercent', label: '% of Account', align: 'right' },
    { id: 'accountId', label: 'Account' },
    { id: '', label: 'Recommendation' },
  ];

  const isEmptyPortfolio = !isLoading && !connectionError && dashboardData.length === 0;

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
      <PageHeader
        title="Dashboard"
        subtitle="Every holding across every account, with live prices"
        actions={
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            {lastUpdated && (
              <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                Updated {moment(lastUpdated).format('h:mm a')}
              </Typography>
            )}
            <ToolbarButton
              icon="tabler:refresh"
              label="Refresh holdings and prices"
              onClick={refresh}
              busy={isLoading}
              color="primary.main"
            />
          </Stack>
        }
      />

      {connectionError && lastUpdated && (
        <Alert severity="warning" sx={{ mb: 2, py: 0.5 }}>
          Can't reach the backend ({connectionError}) — showing data from {moment(lastUpdated).format('h:mm a')}.
          Retrying automatically.
        </Alert>
      )}

      {isEmptyPortfolio ? (
        <GetStartedCard hasAccounts={accounts.length > 0} />
      ) : (
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
          <ReportedEarningsCard results={earningsResults} isLoading={isEarningsLoading} />
        </>
      )}

      <AlertDialog
        open={alertDialogOpen}
        initial={alertDraft}
        onClose={() => setAlertDialogOpen(false)}
        onSaved={() => loadAlerts()}
      />
    </>
  );
}
