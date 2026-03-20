import { styled, Button, ButtonProps } from '@mui/material';

export const OverlayButton = styled(Button)<ButtonProps>(({ theme }) => ({
  color: 'black',
  backgroundColor: theme.palette.grey[300],
  '&:hover': {
    backgroundColor: theme.palette.grey[400],
  },
}));
