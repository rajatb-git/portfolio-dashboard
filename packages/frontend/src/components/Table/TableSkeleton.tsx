import { Skeleton, TableCell, TableRow } from '@mui/material';

export const TableSkeleton = () => {
  return (
    <TableRow>
      <TableCell colSpan={100}>
        <Skeleton variant="text" height={64} />
      </TableCell>
    </TableRow>
  );
};
