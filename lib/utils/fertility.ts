import { DailyLog } from '../types';

const DAY_IN_MS = 1000 * 60 * 60 * 24;

function toDateOnlyString(date: Date): string {
  return date.toISOString().split('T')[0];
}

function addDays(dateString: string, days: number): string {
  const date = new Date(dateString);
  date.setDate(date.getDate() + days);
  return toDateOnlyString(date);
}

export function getPeriodStartDates(logs: DailyLog[]): string[] {
  return [...new Set(logs.filter((log) => log.periodStarted).map((log) => log.date))]
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
}

// Calculate predicted period dates based on last period and cycle length
export function getPredictedPeriodDates(
  lastPeriodStart: string,
  cycleLength: number,
  periodLength: number,
  monthsAhead: number = 3
): { start: string; end: string }[] {
  const periods: { start: string; end: string }[] = [];
  const startDate = new Date(lastPeriodStart);

  for (let i = 0; i <= monthsAhead; i++) {
    const periodStart = new Date(startDate);
    periodStart.setDate(periodStart.getDate() + i * cycleLength);

    const periodEnd = new Date(periodStart);
    periodEnd.setDate(periodEnd.getDate() + periodLength - 1);

    periods.push({
      start: toDateOnlyString(periodStart),
      end: toDateOnlyString(periodEnd),
    });
  }

  return periods;
}

// Calculate predicted ovulation date (typically 14 days before next period)
export function getPredictedOvulationDate(
  lastPeriodStart: string,
  cycleLength: number
): string {
  const startDate = new Date(lastPeriodStart);
  const ovulationDate = new Date(startDate);
  // Ovulation typically occurs 14 days before the next period
  ovulationDate.setDate(ovulationDate.getDate() + cycleLength - 14);
  return toDateOnlyString(ovulationDate);
}

// Calculate fertility window (5 days before ovulation + ovulation day)
export function getFertilityWindow(
  lastPeriodStart: string,
  cycleLength: number
): { start: string; end: string; ovulation: string } {
  const ovulationDate = getPredictedOvulationDate(lastPeriodStart, cycleLength);
  const ovulation = new Date(ovulationDate);

  const windowStart = new Date(ovulation);
  windowStart.setDate(windowStart.getDate() - 5);

  const windowEnd = new Date(ovulation);
  windowEnd.setDate(windowEnd.getDate() + 1);

  return {
    start: toDateOnlyString(windowStart),
    end: toDateOnlyString(windowEnd),
    ovulation: ovulationDate,
  };
}

// Find the most recent period start from daily logs
export function findLastPeriodStart(logs: DailyLog[]): string | null {
  const periodLogs = getPeriodStartDates(logs);

  return periodLogs.length > 0 ? periodLogs[periodLogs.length - 1] : null;
}

export function findPeriodStartForDate(date: string, logs: DailyLog[]): string | null {
  const periodStarts = getPeriodStartDates(logs);

  for (let i = periodStarts.length - 1; i >= 0; i -= 1) {
    if (periodStarts[i] <= date) {
      return periodStarts[i];
    }
  }

  return periodStarts[0] ?? null;
}

// Check if a date falls within a period
export function isDateInPeriod(
  date: string,
  lastPeriodStart: string,
  cycleLength: number,
  periodLength: number
): boolean {
  const periods = getPredictedPeriodDates(lastPeriodStart, cycleLength, periodLength, 6);
  const checkDate = new Date(date).getTime();

  return periods.some((period) => {
    const start = new Date(period.start).getTime();
    const end = new Date(period.end).getTime();
    return checkDate >= start && checkDate <= end;
  });
}

// Check if a date is the ovulation day
export function isOvulationDay(
  date: string,
  lastPeriodStart: string,
  cycleLength: number
): boolean {
  const ovulationDate = getPredictedOvulationDate(lastPeriodStart, cycleLength);
  return date === ovulationDate;
}

// Check if a date is in the fertility window
export function isInFertilityWindow(
  date: string,
  lastPeriodStart: string,
  cycleLength: number
): boolean {
  const window = getFertilityWindow(lastPeriodStart, cycleLength);
  const checkDate = new Date(date).getTime();
  const start = new Date(window.start).getTime();
  const end = new Date(window.end).getTime();
  return checkDate >= start && checkDate <= end;
}

// Get cycle day number (day 1 = first day of period)
export function getCycleDay(
  date: string,
  lastPeriodStart: string,
  cycleLength: number
): number {
  const checkDate = new Date(date);
  const periodStart = new Date(lastPeriodStart);
  const diffTime = checkDate.getTime() - periodStart.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return (diffDays % cycleLength) + 1;
}

// Get all fertility-related info for a specific date
export interface DateFertilityInfo {
  isPeriodDay: boolean;
  isOvulationDay: boolean;
  isFertileDay: boolean;
  cycleDay: number;
  periodStart: string;
}

export function getDateFertilityInfo(
  date: string,
  lastPeriodStart: string | null,
  cycleLength: number,
  periodLength: number
): DateFertilityInfo | null {
  if (!lastPeriodStart) {
    return null;
  }

  return {
    isPeriodDay: isDateInPeriod(date, lastPeriodStart, cycleLength, periodLength),
    isOvulationDay: isOvulationDay(date, lastPeriodStart, cycleLength),
    isFertileDay: isInFertilityWindow(date, lastPeriodStart, cycleLength),
    cycleDay: getCycleDay(date, lastPeriodStart, cycleLength),
    periodStart: lastPeriodStart,
  };
}

export function getDateFertilityInfoFromLogs(
  date: string,
  logs: DailyLog[],
  cycleLength: number,
  periodLength: number
): DateFertilityInfo | null {
  const referencePeriodStart = findPeriodStartForDate(date, logs);
  return getDateFertilityInfo(date, referencePeriodStart, cycleLength, periodLength);
}

export interface FertilityForecast {
  anchorPeriodStart: string;
  nextPeriodStart: string;
  nextPeriodEnd: string;
  ovulationDate: string;
  fertilityWindowStart: string;
  fertilityWindowEnd: string;
}

export function getUpcomingFertilityForecast(
  logs: DailyLog[],
  cycleLength: number,
  periodLength: number,
  fromDate: string
): FertilityForecast | null {
  const anchorPeriodStart = findPeriodStartForDate(fromDate, logs) ?? findLastPeriodStart(logs);
  if (!anchorPeriodStart) {
    return null;
  }

  const daysSinceAnchor = Math.floor(
    (new Date(fromDate).getTime() - new Date(anchorPeriodStart).getTime()) / DAY_IN_MS
  );
  const cycleOffset = daysSinceAnchor >= 0 ? Math.floor(daysSinceAnchor / cycleLength) : 0;
  const currentCycleStart = addDays(anchorPeriodStart, cycleOffset * cycleLength);
  const nextPeriodStart =
    currentCycleStart > fromDate ? currentCycleStart : addDays(currentCycleStart, cycleLength);
  const nextPeriodEnd = addDays(nextPeriodStart, periodLength - 1);
  const ovulationDate = addDays(nextPeriodStart, -14);
  const fertilityWindowStart = addDays(ovulationDate, -5);
  const fertilityWindowEnd = addDays(ovulationDate, 1);

  return {
    anchorPeriodStart,
    nextPeriodStart,
    nextPeriodEnd,
    ovulationDate,
    fertilityWindowStart,
    fertilityWindowEnd,
  };
}
