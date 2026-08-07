import CircularProgress from '@mui/material/CircularProgress';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import type { SxProps, Theme } from '@mui/material/styles';

import { Iconify } from '@/components/Iconify';

type ToolbarButtonProps = {
  icon: string;
  /** Doubles as the tooltip and the accessible name — always required. */
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  /** Spins the icon; use for refresh actions where a skeleton would be jarring. */
  busy?: boolean;
  color?: string;
  size?: number;
  sx?: SxProps<Theme>;
};

/** Icon-only action with a mandatory accessible name. */
export default function ToolbarButton({
  icon,
  label,
  onClick,
  disabled,
  busy,
  color = 'text.secondary',
  size = 18,
  sx,
}: ToolbarButtonProps) {
  return (
    <Tooltip title={label}>
      <span>
        <IconButton
          size="small"
          onClick={onClick}
          disabled={disabled || busy}
          aria-label={label}
          sx={{ color, ...sx }}
        >
          {busy ? (
            <CircularProgress size={size - 2} thickness={5} sx={{ color: 'inherit' }} />
          ) : (
            <Iconify icon={icon} width={size} />
          )}
        </IconButton>
      </span>
    </Tooltip>
  );
}
