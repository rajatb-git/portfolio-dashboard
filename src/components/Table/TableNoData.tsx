import Paper from '@mui/material/Paper';
import TableCell from '@mui/material/TableCell';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import theme from '../ThemeRegistry/theme';

type TableNoDataProps = {
  query: string;
};

export default function TableNoData({ query }: TableNoDataProps) {
  return (
    <TableRow>
      <TableCell align="center" colSpan={100} sx={{ py: 2 }}>
        <Paper
          sx={{
            textAlign: 'center',
            p: 1
          }}
        >
          {query ? (
            <>
              <Typography variant="h6">
                Not found
              </Typography>

              <Typography variant="body2">
                No results found for &nbsp;
                <strong>&quot;{query}&quot;</strong>.
                <br /> Try checking for typos or using complete words.
              </Typography>
            </>
          ) : (
            <Typography variant="subtitle2" color="disabled">
              No data
            </Typography>
          )}
        </Paper>
      </TableCell>
    </TableRow>
  );
}
