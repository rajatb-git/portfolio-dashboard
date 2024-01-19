import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';

type TableEmptyRowsProps = {
  emptyRows: number;
  height: number;
};

export default function TableEmptyRows({ emptyRows, height }: TableEmptyRowsProps) {
  if (!emptyRows) {
    return null;
  }

  return (
    <TableRow
      sx={{
        ...(height && {
          height: height * emptyRows,
        }),
      }}
    >
      <TableCell colSpan={9} />
    </TableRow>
  );
}
