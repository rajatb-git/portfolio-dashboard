import { Box, Card, Divider, Skeleton, Stack, Typography } from "@mui/material";
import { PieChart } from "@mui/x-charts/PieChart";

import type { SectorAllocation } from "@/api/analytics";
import { fnCurrency } from "@/utils/formatNumber";

const COLORS = [
	"#3b82f6",
	"#22c55e",
	"#f59e0b",
	"#ef4444",
	"#8b5cf6",
	"#06b6d4",
	"#f97316",
	"#ec4899",
	"#84cc16",
	"#14b8a6",
	"#6366f1",
	"#d946ef",
];

type Props = {
	sectors: SectorAllocation[];
	isLoading: boolean;
};

export default function SectorAllocationChart({ sectors, isLoading }: Props) {
	const total = sectors.reduce((s, d) => s + d.marketValue, 0);

	return (
		<Card variant="outlined" sx={{ height: "100%" }}>
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
				By Sector
			</Typography>
			<Divider />

			{isLoading ? (
				<Skeleton
					variant="rectangular"
					height={240}
					sx={{ m: 2, borderRadius: 1 }}
				/>
			) : sectors.length === 0 ? (
				<Box sx={{ p: 3, textAlign: "center" }}>
					<Typography sx={{ color: "text.disabled", fontSize: "0.82rem" }}>
						No sector data available
					</Typography>
				</Box>
			) : (
				<Box sx={{ p: 1 }}>
					<PieChart
						height={180}
						colors={COLORS}
						series={[
							{
								data: sectors.map((d, i) => ({
									label: d.sector,
									value: d.marketValue,
									color: COLORS[i % COLORS.length],
								})),
								innerRadius: 46,
								outerRadius: 74,
								arcLabel: (params) =>
									params.value / total > 0.08
										? `${Math.round((params.value / total) * 100)}%`
										: "",
								arcLabelMinAngle: 20,
								valueFormatter: (item) => fnCurrency(item.value),
							},
						]}
						skipAnimation={false}
						slots={{ legend: () => null }}
					/>

					<Stack spacing={0.5} sx={{ px: 1.5, pb: 1.5 }}>
						{sectors.map((item, i) => (
							<Stack
								key={item.sector}
								direction="row"
								sx={{ alignItems: 'center', justifyContent: 'space-between' }}
							>
								<Stack direction="row" sx={{ alignItems: 'center' }} spacing={1}>
									<Box
										sx={{
											width: 8,
											height: 8,
											borderRadius: "50%",
											bgcolor: COLORS[i % COLORS.length],
											flexShrink: 0,
										}}
									/>
									<Typography
										sx={{ fontSize: "0.75rem", color: "text.secondary" }}
									>
										{item.sector}
									</Typography>
								</Stack>
								<Stack direction="row" sx={{ alignItems: 'center' }} spacing={1}>
									<Typography
										sx={{
											fontSize: "0.75rem",
											fontWeight: 600,
											color: "text.primary",
										}}
									>
										{fnCurrency(item.marketValue)}
									</Typography>
									<Typography
										sx={{
											fontSize: "0.7rem",
											color: "text.disabled",
											minWidth: 34,
											textAlign: "right",
										}}
									>
										{item.percentage}%
									</Typography>
								</Stack>
							</Stack>
						))}
					</Stack>
				</Box>
			)}
		</Card>
	);
}
