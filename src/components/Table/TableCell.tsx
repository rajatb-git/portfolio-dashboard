import { Theme, styled } from '@mui/material';
import MuiTableCell from '@mui/material/TableCell';

export const TableCell = styled(MuiTableCell)(({ theme }: { theme: Theme }) => ({
  borderBottom: `1px solid ${theme.palette.divider}`,
}));
