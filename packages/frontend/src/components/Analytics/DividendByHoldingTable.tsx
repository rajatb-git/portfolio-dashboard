import {
	Card,
	Divider,
	Skeleton,
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Typography,
} from "@mui/material";

import type { DividendHoldingSummary } from "@/api/dividends";
import { fnCurrency } from "@/utils/formatNumber";

type Props = {
	holdings: DividendHoldingSummary[];
	isLoading: boolean;
};

export default function DividendByHoldingTable({ holdings, isLoading }: Props) {
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
				Dividends by Holding
			</Typography>
			<Divider />

			{isLoading ? (
				<Skeleton
					variant="rectangular"
					height={160}
					sx={{ m: 2, borderRadius: 1 }}
				/>
			) : holdings.length === 0 ? (
				<Typography
					sx={{
						p: 3,
						textAlign: "center",
						color: "text.disabled",
						fontSize: "0.82rem",
					}}
				>
					No dividend-paying holdings found
				</Typography>
			) : (
				<TableContainer>
					<Table size="small">
						<TableHead>
							<TableRow>
								<TableCell sx={{ fontWeight: 700, fontSize: "0.72rem" }}>
									Symbol
								</TableCell>
								<TableCell
									align="right"
									sx={{ fontWeight: 700, fontSize: "0.72rem" }}
								>
									Annual Dividend
								</TableCell>
								<TableCell
									align="right"
									sx={{ fontWeight: 700, fontSize: "0.72rem" }}
								>
									Yield
								</TableCell>
								<TableCell
									align="right"
									sx={{ fontWeight: 700, fontSize: "0.72rem" }}
								>
									Price
								</TableCell>
								<TableCell
									align="right"
									sx={{ fontWeight: 700, fontSize: "0.72rem" }}
								>
									Last Pay Date
								</TableCell>
							</TableRow>
						</TableHead>
						<TableBody>
							{holdings.map((h) => (
								<TableRow key={h.symbol}>
									<TableCell sx={{ fontWeight: 600, fontSize: "0.8rem" }}>
										{h.symbol}
									</TableCell>
									<TableCell
										align="right"
										sx={{ fontSize: "0.8rem", color: "#22c55e" }}
									>
										{fnCurrency(h.annualDividend)}
									</TableCell>
									<TableCell align="right" sx={{ fontSize: "0.8rem" }}>
										{h.yield}%
									</TableCell>
									<TableCell align="right" sx={{ fontSize: "0.8rem" }}>
										{fnCurrency(h.currentPrice)}
									</TableCell>
									<TableCell
										align="right"
										sx={{ fontSize: "0.8rem", color: "text.secondary" }}
									>
										{h.lastPayDate || "—"}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				</TableContainer>
			)}
		</Card>
	);
}
