import StateView from '@/components/ui/StateView';

type TableNoDataProps = {
  query: string;
  isFiltered?: boolean;
};

/** Rendered as a sibling of the table, not a row inside it — a colSpan cell
 *  inherits the table's min-width and scrolls off-screen on a phone. */
export default function TableNoData({ query, isFiltered = false }: TableNoDataProps) {
  if (!query && isFiltered) {
    return (
      <StateView
        state="empty"
        icon="tabler:filter-off"
        title="No holdings match these filters"
        message="Switch the type or account filter back to All to see every holding."
        minHeight={220}
      />
    );
  }
  return query ? (
    <StateView
      state="empty"
      icon="tabler:search-off"
      title={`No results for "${query}"`}
      message="Check for typos, or try the full company name instead of the ticker."
      minHeight={220}
    />
  ) : (
    <StateView
      state="empty"
      icon="tabler:wallet-off"
      title="No holdings yet"
      message="Add holdings under Database, or import them from a broker statement, and they will appear here with live prices."
      minHeight={220}
    />
  );
}
