import {
	Card,
	CardContent,
	Skeleton,
	Stack,
	ToggleButton,
	ToggleButtonGroup,
	Typography,
} from "@mui/material";

import type { ApexOptions } from "apexcharts";
import moment from "moment";
import React from "react";
import { toast } from "react-toastify";

import apis from "@/api";
import type { PortfolioSnapshot } from "@/api/dashboard";
import { useThemeMode } from "@/components/ThemeRegistry/ThemeModeContext";
import { fnCurrency } from "@/utils/formatNumber";

const ReactApexChart = React.lazy(() => import("react-apexcharts"));

type RangeKey = "1M" | "3M" | "6M" | "1Y" | "All";

const RANGE_OPTIONS: RangeKey[] = ["1M", "3M", "6M", "1Y", "All"];

const RANGE_DAYS: Record<RangeKey, number> = {
	"1M": 30,
	"3M": 90,
	"6M": 180,
	"1Y": 365,
	All: 99999,
};

// Map to backend-supported range values
const SPY_RANGE: Record<RangeKey, string> = {
	"1M": "1M",
	"3M": "3M",
	"6M": "6M",
	"1Y": "1y",
	All: "2y",
};

type Props = {
	snapshots: PortfolioSnapshot[];
};

export default function PortfolioPerformanceChart({ snapshots }: Props) {
	const { mode } = useThemeMode();
	const [range, setRange] = React.useState<RangeKey>("6M");
	const [spyRaw, setSpyRaw] = React.useState<any[]>([]);
	const [isSpyLoading, setIsSpyLoading] = React.useState(false);

	React.useEffect(() => {
		setIsSpyLoading(true);
		apis.live
			.getPriceHistory("SPY", SPY_RANGE[range] as any)
			.then((data) => setSpyRaw(data ?? []))
			.catch((err) => {
				setSpyRaw([]);
				toast.error(err.message || "Failed to load SPY benchmark data");
			})
			.finally(() => setIsSpyLoading(false));
	}, [range]);

	// Filter snapshots to selected range
	const cutoffMs =
		range === "All"
			? 0
			: moment().subtract(RANGE_DAYS[range], "days").valueOf();
	const filteredSnapshots = snapshots.filter(
		(s) => moment(s.date).valueOf() >= cutoffMs,
	);

	// Portfolio series: [{x: timestamp_ms, y: totalValue}]
	const portfolioSeries = filteredSnapshots.map((s) => ({
		x: moment(s.date).valueOf(),
		y: s.totalValue,
	}));

	// SPY series: normalize to portfolio start value so lines are on same scale
	const buildSpySeries = (): { x: number; y: number }[] => {
		if (!spyRaw.length || filteredSnapshots.length < 1) return [];
		const portfolioStartValue = filteredSnapshots[0].totalValue;
		const portfolioStartTs = moment(filteredSnapshots[0].date).valueOf();

		// Parse OHLCV candlestick data — format can be [ts, o, h, l, c] arrays
		// or {x: ts, y: [o, h, l, c]} objects
		const spyPoints: { ts: number; close: number }[] = [];
		for (const d of spyRaw) {
			if (Array.isArray(d)) {
				const ts = d[0];
				const close = d[4] ?? d[3] ?? d[1];
				if (ts != null && close != null) spyPoints.push({ ts, close });
			} else if (d && typeof d === "object") {
				const ts = d.x;
				const close = Array.isArray(d.y) ? d.y[3] : d.y;
				if (ts != null && close != null) spyPoints.push({ ts, close });
			}
		}
		if (!spyPoints.length) return [];

		const sorted = [...spyPoints].sort((a, b) => a.ts - b.ts);

		// Find SPY price at the portfolio's start date (±7 days)
		const spyNearStart =
			sorted.find((p) => p.ts >= portfolioStartTs - 7 * 86400000) ?? sorted[0];
		const spyStartClose = spyNearStart?.close;
		if (!spyStartClose) return [];

		const ratio = portfolioStartValue / spyStartClose;

		return sorted
			.filter((p) => p.ts >= portfolioStartTs - 86400000)
			.map((p) => ({ x: p.ts, y: +(p.close * ratio).toFixed(2) }));
	};

	const spySeries = buildSpySeries();

	const series = [
		{ name: "Portfolio", data: portfolioSeries, type: "area" },
		...(spySeries.length
			? [{ name: "S&P 500 (SPY)", data: spySeries, type: "area" }]
			: []),
	];

	const options: ApexOptions = {
		theme: { mode: mode as "dark" | "light" },
		chart: {
			type: "area",
			background: "transparent",
			toolbar: { show: false },
			zoom: { enabled: false },
			animations: { enabled: false },
		},
		dataLabels: { enabled: false },
		stroke: { curve: "smooth", width: [2, 2] },
		fill: {
			type: "gradient",
			gradient: {
				shadeIntensity: 1,
				opacityFrom: 0.25,
				opacityTo: 0.0,
				stops: [0, 90, 100],
			},
		},
		colors: ["#3b82f6", "#f59e0b"],
		xaxis: {
			type: "datetime",
			labels: { datetimeUTC: false },
		},
		yaxis: {
			labels: {
				formatter: (val) => fnCurrency(val),
			},
			opposite: true,
		},
		tooltip: {
			x: { format: "MMM dd, yyyy" },
			y: { formatter: (val) => fnCurrency(val) },
		},
		legend: { show: true, position: "top", horizontalAlign: "left" },
		grid: {
			show: true,
			borderColor:
				mode === "light" ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.07)",
		},
	};

	const isEmpty = filteredSnapshots.length < 2;

	return (
		<Card variant="outlined">
			<Stack
				direction="row"
				alignItems="center"
				justifyContent="space-between"
				sx={{ px: 2, pt: 1.5, pb: 1 }}
			>
				<Typography
					sx={{
						fontWeight: 700,
						fontSize: "0.72rem",
						color: "text.secondary",
						letterSpacing: "0.06em",
						textTransform: "uppercase",
					}}
				>
					Portfolio Performance
				</Typography>
				<ToggleButtonGroup
					size="small"
					value={range}
					exclusive
					onChange={(_, v) => v && setRange(v)}
				>
					{RANGE_OPTIONS.map((r) => (
						<ToggleButton
							key={r}
							value={r}
							sx={{ px: 1.5, fontSize: "0.72rem" }}
						>
							{r}
						</ToggleButton>
					))}
				</ToggleButtonGroup>
			</Stack>

			<CardContent sx={{ pt: 0 }}>
				{isSpyLoading || snapshots.length === 0 ? (
					<Skeleton
						variant="rectangular"
						height={320}
						sx={{ borderRadius: 1 }}
					/>
				) : isEmpty ? (
					<Stack
						alignItems="center"
						justifyContent="center"
						sx={{ height: 320 }}
					>
						<Typography
							sx={{
								color: "text.disabled",
								fontSize: "0.85rem",
								textAlign: "center",
							}}
						>
							Not enough data for this range.
							<br />
							Load the Dashboard to start building portfolio history.
						</Typography>
					</Stack>
				) : (
					<React.Suspense
						fallback={
							<Skeleton
								variant="rectangular"
								height={320}
								sx={{ borderRadius: 1 }}
							/>
						}
					>
						<ReactApexChart
							options={options}
							series={series}
							type="area"
							height={320}
							width="100%"
						/>
					</React.Suspense>
				)}
			</CardContent>
		</Card>
	);
}
