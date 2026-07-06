import { useState } from 'react';

import DashTableRow from './DashTableRow';
import type { AlertState, ConsolidatedHolding } from './dashTableUtils';

type Props = {
  row: ConsolidatedHolding;
  onRowClick: (symbol: string) => void;
  getAlertState?: (symbol: string) => AlertState | undefined;
  onSetAlert?: (symbol: string, type: 'stock' | 'crypto', currentPrice?: number) => void;
};

export default function DashTableConsolidatedRow({ row, onRowClick, getAlertState, onSetAlert }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <DashTableRow
        row={row}
        onRowClick={onRowClick}
        accountLabel={`${row.accountCount} accounts`}
        expandControl={{ expanded, onToggle: () => setExpanded((prev) => !prev) }}
        alertState={getAlertState?.(row.symbol)}
        onSetAlert={onSetAlert}
      />
      {expanded &&
        row.subRows.map((sub) => (
          <DashTableRow
            key={`${sub.accountId}-${sub.symbol}`}
            row={sub}
            onRowClick={onRowClick}
            subRow
            alertState={getAlertState?.(sub.symbol)}
          />
        ))}
    </>
  );
}
