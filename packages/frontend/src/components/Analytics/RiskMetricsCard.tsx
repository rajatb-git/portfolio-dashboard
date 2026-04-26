import {
	Card,
	Chip,
	Divider,
	Grid,
	Skeleton,
	Stack,
	Typography,
} from "@mui/material";

import type { RiskMetrics } from "@/api/analytics";

function getSharpeColor(value: number): string {
	if (value >= 1) return "#22c55e";
	if (value >= 0.5) return "#f59e0b";
	return "#ef4444";
}

function getDrawdownColor(value: number): string {
	if (value <= 5) return "#22c55e";
	if (value <= 15) return "#f59e0b";
	return "#ef4444";
}

type MetricItemProps = {
	label: string;
	value: string;
	subtext?: string;
	color?: string;
};

function MetricItem({ label, value, subtext, color }: MetricItemProps) {
	return (
		<Stack spacing={0.25}>
			<Typography
				sx={{
					fontSize: "0.68rem",
					color: "text.secondary",
					textTransform: "uppercase",
					letterSpacing: "0.05em",
				}}
			>
				{label}
			</Typography>
			<Stack direction="row" sx={{ alignItems: 'center' }} spacing={0.75}>
				<Typography
					sx={{
						fontSize: "1.1rem",
						fontWeight: 700,
						color: color ?? "text.primary",
					}}
				>
					{value}
				</Typography>
				{subtext && (
					<Chip
						label={subtext}
						size="small"
						sx={{ height: 18, fontSize: "0.62rem", fontWeight: 600 }}
					/>
				)}
			</Stack>
		</Stack>
	);
}

type Props = {
	metrics: RiskMetrics | null;
	isLoading: boolean;
};

export default function RiskMetricsCard({ metrics, isLoading }: Props) {
	return (
		<Card variant="outlined">
			<Typography
				sx={{
					p: "10px 16px",
					color: "text.secondary",
					fontWeight: 700,
					fontSize: "0.72rem",
					letterSpacing: "0.06em",
					textTransform: "uppercase",
				}}
			>
				Risk Metrics
			</Typography>
			<Divider />

			{isLoading ? (
				<Skeleton
					variant="rectangular"
					height={100}
					sx={{ m: 2, borderRadius: 1 }}
				/>
			) : !metrics || metrics.totalDataDays < 2 ? (
				<Typography
					sx={{
						p: 3,
						textAlign: "center",
						color: "text.disabled",
						fontSize: "0.82rem",
					}}
				>
					Not enough data to calculate risk metrics. Load the Dashboard daily to
					build portfolio history.
				</Typography>
			) : (
				<Grid container spacing={2.5} sx={{ p: 2 }}>
					<Grid size={{ xs: 6, sm: 4, md: 2 }}>
						<MetricItem
							label="Annualized Return"
							value={`${metrics.annualizedReturn}%`}
							color={metrics.annualizedReturn >= 0 ? "#22c55e" : "#ef4444"}
						/>
					</Grid>
					<Grid size={{ xs: 6, sm: 4, md: 2 }}>
						<MetricItem
							label="Sharpe Ratio"
							value={`${metrics.sharpeRatio}`}
							color={getSharpeColor(metrics.sharpeRatio)}
							subtext={
								metrics.sharpeRatio >= 1
									? "Good"
									: metrics.sharpeRatio >= 0.5
										? "Fair"
										: "Poor"
							}
						/>
					</Grid>
					<Grid size={{ xs: 6, sm: 4, md: 2 }}>
						<MetricItem label="Volatility" value={`${metrics.volatility}%`} />
					</Grid>
					<Grid size={{ xs: 6, sm: 4, md: 2 }}>
						<MetricItem
							label="Max Drawdown"
							value={`-${metrics.maxDrawdown}%`}
							color={getDrawdownColor(metrics.maxDrawdown)}
							subtext={
								metrics.maxDrawdownPeriod.from && metrics.maxDrawdownPeriod.to
									? `${metrics.maxDrawdownPeriod.from} to ${metrics.maxDrawdownPeriod.to}`
									: undefined
							}
						/>
					</Grid>
					<Grid size={{ xs: 6, sm: 4, md: 2 }}>
						<MetricItem label="Beta vs S&P 500" value={`${metrics.beta}`} />
					</Grid>
					<Grid size={{ xs: 6, sm: 4, md: 2 }}>
						<Stack spacing={1}>
							<MetricItem
								label="Best Day"
								value={`+${metrics.bestDay.return}%`}
								color="#22c55e"
								subtext={metrics.bestDay.date}
							/>
							<MetricItem
								label="Worst Day"
								value={`${metrics.worstDay.return}%`}
								color="#ef4444"
								subtext={metrics.worstDay.date}
							/>
						</Stack>
					</Grid>
				</Grid>
			)}
		</Card>
	);
}
