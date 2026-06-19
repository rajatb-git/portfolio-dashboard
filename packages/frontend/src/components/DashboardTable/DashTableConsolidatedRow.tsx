import { useState } from 'react';

import DashTableRow from './DashTableRow';
import type { ConsolidatedHolding } from './dashTableUtils';

type Props = {
  row: ConsolidatedHolding;
  onRowClick: (symbol: string) => void;
};

export default function DashTableConsolidatedRow({ row, onRowClick }: Props) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <DashTableRow
        row={row}
        onRowClick={onRowClick}
        accountLabel={`${row.accountCount} accounts`}
        expandControl={{ expanded, onToggle: () => setExpanded((prev) => !prev) }}
      />
      {expanded &&
        row.subRows.map((sub) => (
          <DashTableRow key={`${sub.accountId}-${sub.symbol}`} row={sub} onRowClick={onRowClick} subRow />
        ))}
    </>
  );
}
