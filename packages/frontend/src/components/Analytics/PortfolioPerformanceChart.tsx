import {
  Card,
  CardContent,
  MenuItem,
  Select,
  Skeleton,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';

import type { ApexOptions } from 'apexcharts';
import moment from 'moment';
import React from 'react';
import { toast } from 'react-toastify';

import apis from '@/api';
import type { PerformancePoint } from '@/api/dashboard';
import type { Range } from '@/api/live';
import { useThemeMode } from '@/components/ThemeRegistry/ThemeModeContext';
import { SERIES, TEXT } from '@/components/ThemeRegistry/tokens';
import { fnCurrency } from '@/utils/formatNumber';

const ReactApexChart = React.lazy(() => import('react-apexcharts'));

type RangeKey = '1M' | '3M' | '6M' | '1Y' | 'All';

const RANGE_OPTIONS: RangeKey[] = ['1M', '3M', '6M', '1Y', 'All'];

const RANGE_DAYS: Record<RangeKey, number> = {
  '1M': 30,
  '3M': 90,
  '6M': 180,
  '1Y': 365,
  All: 99999,
};

// Benchmark history ranges the backend serves; 'All' takes the longest.
const SPY_RANGE: Record<RangeKey, Range> = {
  '1M': '1M',
  '3M': '3M',
  '6M': '6M',
  '1Y': '1y',
  All: '3y',
};

type Props = {
  points: PerformancePoint[];
  isLoading: boolean;
};

const BENCHMARKS: Record<string, string> = {
  SPY: 'S&P 500 (SPY)',
  QQQ: 'Nasdaq 100 (QQQ)',
  DIA: 'Dow Jones (DIA)',
  None: 'None',
};

const fmtPct = (val: number) => `${val > 0 ? '+' : ''}${val.toFixed(2)}%`;

export default function PortfolioPerformanceChart({ points, isLoading }: Props) {
  const { resolvedMode: mode } = useThemeMode();
  const [range, setRange] = React.useState<RangeKey>('6M');
  const [benchmark, setBenchmark] = React.useState<string>('SPY');
  const [spyRaw, setSpyRaw] = React.useState<any[]>([]);
  const [isSpyLoading, setIsSpyLoading] = React.useState(false);

  React.useEffect(() => {
    if (benchmark === 'None') {
      setSpyRaw([]);
      setIsSpyLoading(false);
      return;
    }
    setIsSpyLoading(true);
    apis.live
      .getPriceHistory(benchmark, SPY_RANGE[range])
      .then((data) => setSpyRaw(data ?? []))
      .catch((err) => {
        setSpyRaw([]);
        toast.error(err.message || `Failed to load ${benchmark} benchmark data`);
      })
      .finally(() => setIsSpyLoading(false));
  }, [range, benchmark]);

  const cutoff = range === 'All' ? '' : moment().subtract(RANGE_DAYS[range], 'days').format('YYYY-MM-DD');
  const inRange = points.filter((p) => p.date >= cutoff);
  const baseIndex = inRange[0]?.index ?? 1;

  // Both lines start at 0% on the range's first day: the portfolio from its
  // time-weighted index, so buys and sells don't move it.
  const portfolioSeries = inRange.map((p) => ({
    x: moment(p.date).valueOf(),
    y: +((p.index / baseIndex - 1) * 100).toFixed(2),
  }));

  // The benchmark is sampled on the portfolio's own dates (last close on or
  // before each) so the two lines share x values and one tooltip shows both.
  const buildBenchmarkSeries = (): { x: number; y: number }[] => {
    if (!spyRaw.length || !inRange.length) return [];
    // Backend serializes each point's `x` as an ISO date string (Date → JSON),
    // so coerce to a numeric timestamp — downstream sort/filter do numeric math.
    const toTs = (v: unknown): number => (typeof v === 'number' ? v : moment(v as string).valueOf());
    const closes: { date: string; close: number }[] = [];
    for (const d of spyRaw) {
      let ts: number;
      let close: number | undefined;
      if (Array.isArray(d)) {
        ts = toTs(d[0]);
        close = d[4] ?? d[3] ?? d[1];
      } else if (d && typeof d === 'object') {
        ts = toTs(d.x);
        close = Array.isArray(d.y) ? d.y[3] : d.y;
      } else {
        continue;
      }
      if (!Number.isNaN(ts) && close != null) closes.push({ date: moment(ts).format('YYYY-MM-DD'), close });
    }
    closes.sort((a, b) => a.date.localeCompare(b.date));

    const closeOn = (date: string) => {
      let found: number | undefined;
      for (const c of closes) {
        if (c.date > date) break;
        found = c.close;
      }
      return found;
    };
    const base = closeOn(inRange[0].date);
    if (!base) return [];
    return inRange.flatMap((p) => {
      const close = closeOn(p.date);
      return close ? [{ x: moment(p.date).valueOf(), y: +((close / base - 1) * 100).toFixed(2) }] : [];
    });
  };

  const benchmarkSeries = buildBenchmarkSeries();

  const series = [
    { name: 'Portfolio', data: portfolioSeries, type: 'area' },
    ...(benchmarkSeries.length ? [{ name: BENCHMARKS[benchmark], data: benchmarkSeries, type: 'area' }] : []),
  ];

  const portfolioReturn = portfolioSeries.at(-1)?.y;
  const benchmarkReturn = benchmarkSeries.at(-1)?.y;

  const axisColor = mode === 'light' ? TEXT.light.secondary : TEXT.dark.secondary;
  const gridColor = mode === 'light' ? 'rgba(15,23,42,0.12)' : 'rgba(148,163,184,0.16)';

  const options: ApexOptions = {
    theme: { mode: mode as 'dark' | 'light' },
    chart: {
      type: 'area',
      background: 'transparent',
      toolbar: { show: false },
      zoom: { enabled: false },
      animations: { enabled: false },
    },
    dataLabels: { enabled: false },
    stroke: { curve: 'smooth', width: [2, 2] },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.25,
        opacityTo: 0.0,
        stops: [0, 90, 100],
      },
    },
    // Portfolio first, benchmark second — the benchmark is a reference line,
    // so it gets the quieter hue.
    colors: [SERIES[0], SERIES[1]],
    xaxis: {
      type: 'datetime',
      labels: { datetimeUTC: false, style: { colors: axisColor, fontSize: '11px' } },
      axisBorder: { color: gridColor },
      axisTicks: { color: gridColor },
    },
    yaxis: {
      labels: {
        formatter: (val) => `${+val.toFixed(1)}%`,
        style: { colors: axisColor, fontSize: '11px' },
      },
      opposite: true,
    },
    tooltip: {
      theme: mode,
      shared: true,
      intersect: false,
      x: { format: 'MMM dd, yyyy' },
      y: {
        formatter: (val, opts) =>
          opts?.seriesIndex === 0 && inRange[opts.dataPointIndex]
            ? `${fmtPct(val)} · ${fnCurrency(inRange[opts.dataPointIndex].value)}`
            : fmtPct(val),
      },
    },
    legend: { show: true, position: 'top', horizontalAlign: 'left', labels: { colors: axisColor } },
    grid: {
      show: true,
      borderColor: mode === 'light' ? 'rgba(15,23,42,0.08)' : 'rgba(148,163,184,0.12)',
      strokeDashArray: 3,
    },
  };

  const isEmpty = inRange.length < 2;

  return (
    <Card variant="outlined">
      <Stack
        direction="row"
        sx={{
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1,
          px: 2,
          pt: 1.5,
          pb: 1,
        }}
      >
        <Stack>
          <Typography
            sx={{
              fontWeight: 700,
              fontSize: '0.72rem',
              color: 'text.secondary',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
            }}
          >
            Portfolio Performance
          </Typography>
          {!isLoading && !isEmpty && portfolioReturn !== undefined && (
            <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
              {range === 'All' ? 'Since first snapshot' : range}: portfolio {fmtPct(portfolioReturn)}
              {benchmarkReturn !== undefined && ` · ${BENCHMARKS[benchmark]} ${fmtPct(benchmarkReturn)}`}
              {' · time-weighted, holdings only'}
            </Typography>
          )}
        </Stack>
        <Stack direction="row" sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
          <Select
            size="small"
            value={benchmark}
            onChange={(e) => setBenchmark(e.target.value)}
            sx={{ fontSize: '0.72rem', height: 30 }}
          >
            {Object.entries(BENCHMARKS).map(([value, label]) => (
              <MenuItem key={value} value={value} sx={{ fontSize: '0.78rem' }}>
                {label}
              </MenuItem>
            ))}
          </Select>
          <ToggleButtonGroup size="small" value={range} exclusive onChange={(_, v) => v && setRange(v)}>
            {RANGE_OPTIONS.map((r) => (
              <ToggleButton key={r} value={r} sx={{ px: 1.5, fontSize: '0.72rem' }}>
                {r}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Stack>
      </Stack>

      <CardContent sx={{ pt: 0 }}>
        {isLoading || isSpyLoading ? (
          <Skeleton variant="rectangular" height={320} sx={{ borderRadius: 1 }} />
        ) : isEmpty ? (
          <Stack sx={{ alignItems: 'center', justifyContent: 'center', height: 320 }}>
            <Typography
              sx={{
                color: 'text.disabled',
                fontSize: '0.85rem',
                textAlign: 'center',
              }}
            >
              Not enough data for this range.
              <br />
              Load the Dashboard to start building portfolio history.
            </Typography>
          </Stack>
        ) : (
          <React.Suspense fallback={<Skeleton variant="rectangular" height={320} sx={{ borderRadius: 1 }} />}>
            <ReactApexChart options={options} series={series} type="area" height={320} width="100%" />
          </React.Suspense>
        )}
      </CardContent>
    </Card>
  );
}
