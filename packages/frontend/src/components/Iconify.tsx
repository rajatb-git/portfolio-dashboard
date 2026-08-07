import { Icon } from '@iconify/react';
import Box from '@mui/material/Box';
import type { SxProps, Theme } from '@mui/material/styles';

type Props = {
  icon: string;
  width?: number;
  sx?: SxProps<Theme>;
} & React.AriaAttributes &
  Pick<React.HTMLAttributes<HTMLElement>, 'role' | 'id' | 'className'>;

/**
 * Icons are decorative by default. Pass `aria-hidden` when the adjacent text
 * already names the thing, or `role="img"` plus `aria-label` when the icon is
 * the only carrier of meaning.
 */
export const Iconify = ({ icon, width = 20, sx, ...other }: Props) => (
  <Box
    component={Icon}
    className="component-iconify"
    icon={icon}
    sx={{ width, height: width, flexShrink: 0, ...sx }}
    {...other}
  />
);
