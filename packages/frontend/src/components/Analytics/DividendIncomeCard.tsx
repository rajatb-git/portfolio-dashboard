import {
	Card,
	Divider,
	Grid,
	Skeleton,
	Stack,
	Typography,
} from "@mui/material";

import type { DividendSummary } from "@/api/dividends";
import { fnCurrency } from "@/utils/formatNumber";

type StatBoxProps = {
	label: string;
	value: string;
	color?: string;
};

function StatBox({ label, value, color }: StatBoxProps) {
	return (
		<Stack spacing={0.5} sx={{ textAlign: "center" }}>
			<Typography
				sx={{
					fontSize: "0.7rem",
					color: "text.secondary",
					textTransform: "uppercase",
					letterSpacing: "0.05em",
				}}
			>
				{label}
			</Typography>
			<Typography
				sx={{
					fontSize: "1.25rem",
					fontWeight: 700,
					color: color ?? "text.primary",
				}}
			>
				{value}
			</Typography>
		</Stack>
	);
}

type Props = {
	summary: DividendSummary | null;
	isLoading: boolean;
};

export default function DividendIncomeCard({ summary, isLoading }: Props) {
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
				Dividend Income
			</Typography>
			<Divider />

			{isLoading ? (
				<Skeleton
					variant="rectangular"
					height={80}
					sx={{ m: 2, borderRadius: 1 }}
				/>
			) : !summary ? (
				<Typography
					sx={{
						p: 3,
						textAlign: "center",
						color: "text.disabled",
						fontSize: "0.82rem",
					}}
				>
					No dividend data available
				</Typography>
			) : (
				<Grid container spacing={2} sx={{ p: 2 }}>
					<Grid size={{ xs: 6, sm: 3 }}>
						<StatBox
							label="YTD Income"
							value={fnCurrency(summary.ytdIncome)}
							color="#22c55e"
						/>
					</Grid>
					<Grid size={{ xs: 6, sm: 3 }}>
						<StatBox
							label="Projected Annual"
							value={fnCurrency(summary.projectedAnnualIncome)}
							color="#3b82f6"
						/>
					</Grid>
					<Grid size={{ xs: 6, sm: 3 }}>
						<StatBox
							label="Monthly Income"
							value={fnCurrency(summary.monthlyIncome)}
						/>
					</Grid>
					<Grid size={{ xs: 6, sm: 3 }}>
						<StatBox
							label="Portfolio Yield"
							value={`${summary.portfolioYield}%`}
							color="#f59e0b"
						/>
					</Grid>
				</Grid>
			)}
		</Card>
	);
}
