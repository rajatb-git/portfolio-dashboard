import { Icon } from '@iconify/react';
import Box from '@mui/material/Box';

type IconifyProps = {
  icon: string;
  width?: number;
  sx?: any;
};

export const Iconify = ({ icon, width = 20, sx, ...other }: IconifyProps) => (
  <Box component={Icon} className="component-iconify" icon={icon} sx={{ width, height: width, ...sx }} {...other} />
);
