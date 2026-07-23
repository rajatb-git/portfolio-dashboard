import moment from 'moment';
import { getPortfolioGoalConfig } from '../models/PortfolioGoalConfigModel';
import { IPortfolioSnapshotModel, PortfolioSnapshotDBModel } from '../models/PortfolioSnapshotModel';

export type GoalProgress = {
  label: string;
  targetValue: number;
  targetDate: string | null;
  currentValue: number;
  progressPercent: number;
  remaining: number;
  monthlyGrowthRate: number | null; // percent/month from historical snapshots
  projectedDate: string | null; // when current value compounds up to the target
  monthsToProjected: number | null;
  onTrack: boolean | null; // vs targetDate, when one is set
  requiredMonthlyReturn: number | null; // to hit the target by targetDate
};

const lastValuePerDay = (snapshots: IPortfolioSnapshotModel[]): Array<{ date: string; value: number }> => {
  const byDay = new Map<string, IPortfolioSnapshotModel>();
  for (const s of snapshots) {
    const existing = byDay.get(s.date);
    if (!existing || (s.timestamp ?? s.date) > (existing.timestamp ?? existing.date)) byDay.set(s.date, s);
  }
  return [...byDay.values()]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((s) => ({ date: s.date, value: s.totalValue }));
};

export const getGoalProgress = async (): Promise<GoalProgress> => {
  const config = await getPortfolioGoalConfig();
  const snapshotModel = await PortfolioSnapshotDBModel().initialize();
  const daily = lastValuePerDay(snapshotModel.getAllRecords());

  const currentValue = daily.length ? daily[daily.length - 1].value : 0;
  const target = config.targetValue;

  const base: GoalProgress = {
    label: config.label,
    targetValue: target,
    targetDate: config.targetDate,
    currentValue: +currentValue.toFixed(2),
    progressPercent: target > 0 ? +Math.min(100, (currentValue / target) * 100).toFixed(1) : 0,
    remaining: +Math.max(0, target - currentValue).toFixed(2),
    monthlyGrowthRate: null,
    projectedDate: null,
    monthsToProjected: null,
    onTrack: null,
    requiredMonthlyReturn: null,
  };

  // Historical monthly growth rate — geometric mean of the daily snapshot series.
  if (daily.length >= 2) {
    const first = daily[0];
    const last = daily[daily.length - 1];
    const spanDays = moment(last.date).diff(moment(first.date), 'days');
    if (spanDays > 0 && first.value > 0) {
      const dailyRate = (last.value / first.value) ** (1 / spanDays) - 1;
      const monthlyRate = (1 + dailyRate) ** 30 - 1;
      base.monthlyGrowthRate = +(monthlyRate * 100).toFixed(2);

      if (target > currentValue && currentValue > 0 && monthlyRate > 0) {
        const months = Math.log(target / currentValue) / Math.log(1 + monthlyRate);
        base.monthsToProjected = +months.toFixed(1);
        base.projectedDate = moment().add(months, 'months').format('YYYY-MM-DD');
      }
    }
  }

  // Deadline math: what monthly return is needed, and are we on pace?
  if (config.targetDate && target > currentValue && currentValue > 0) {
    const monthsToTarget = moment(config.targetDate).diff(moment(), 'months', true);
    if (monthsToTarget > 0) {
      const required = (target / currentValue) ** (1 / monthsToTarget) - 1;
      base.requiredMonthlyReturn = +(required * 100).toFixed(2);
      if (base.projectedDate) {
        base.onTrack = moment(base.projectedDate).isSameOrBefore(moment(config.targetDate));
      }
    } else {
      base.onTrack = false;
    }
  } else if (target > 0 && currentValue >= target) {
    base.onTrack = true;
  }

  return base;
};
