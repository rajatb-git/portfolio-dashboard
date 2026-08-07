import { Skeleton, TableCell, TableRow } from '@mui/material';

/** Placeholder rows shaped like real rows, so the table does not jump in height
 *  when the data lands. */
export const TableSkeleton = ({ rows = 8 }: { rows?: number }) => (
  <>
    {Array.from({ length: rows }, (_, i) => (
      <TableRow key={`skeleton-${i}`} sx={{ '&:hover': { bgcolor: 'transparent' } }} aria-hidden>
        <TableCell colSpan={100}>
          <Skeleton variant="rounded" height={18} width={`${92 - (i % 4) * 7}%`} />
        </TableCell>
      </TableRow>
    ))}
  </>
);
