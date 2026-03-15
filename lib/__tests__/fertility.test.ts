import { describe, it, expect } from 'vitest';
import {
  findLastPeriodStart,
  findPeriodStartForDate,
  getDateFertilityInfo,
  getDateFertilityInfoFromLogs,
  getUpcomingFertilityForecast,
} from '../utils/fertility';
import { DailyLog } from '../types';

const buildLog = (overrides: Partial<DailyLog>): DailyLog => ({
  id: overrides.id ?? 'log',
  planId: overrides.planId ?? 'plan1',
  date: overrides.date ?? '2026-01-01',
  migraineOccurred: overrides.migraineOccurred ?? false,
  migraineIntensity: overrides.migraineIntensity ?? 0,
  symptoms: overrides.symptoms ?? [],
  mood: overrides.mood ?? null,
  sleepQuality: overrides.sleepQuality ?? null,
  stressLevel: overrides.stressLevel ?? null,
  notes: overrides.notes ?? '',
  periodStarted: overrides.periodStarted ?? false,
  periodEnded: overrides.periodEnded ?? false,
  flowLevel: overrides.flowLevel ?? null,
});

describe('Fertility Utilities', () => {
  describe('getDateFertilityInfo', () => {
    it('should calculate cycle day correctly', () => {
      const lastPeriodStart = '2026-01-01';
      const targetDate = '2026-01-15';
      
      const result = getDateFertilityInfo(targetDate, lastPeriodStart, 28, 5);
      
      expect(result?.cycleDay).toBe(15);
    });

    it('should identify period days correctly', () => {
      const lastPeriodStart = '2026-01-01';
      
      // Day 3 of cycle should be a period day (with 5-day period)
      const periodDay = getDateFertilityInfo('2026-01-03', lastPeriodStart, 28, 5);
      expect(periodDay?.isPeriodDay).toBe(true);
      
      // Day 7 should not be a period day
      const nonPeriodDay = getDateFertilityInfo('2026-01-07', lastPeriodStart, 28, 5);
      expect(nonPeriodDay?.isPeriodDay).toBe(false);
    });

    it('should identify ovulation day correctly', () => {
      const lastPeriodStart = '2026-01-01';
      
      // With 28-day cycle, ovulation is 28-14=14 days from period start, so Jan 15
      const ovulationDay = getDateFertilityInfo('2026-01-15', lastPeriodStart, 28, 5);
      expect(ovulationDay?.isOvulationDay).toBe(true);
      
      // Day 10 should not be ovulation
      const nonOvulationDay = getDateFertilityInfo('2026-01-10', lastPeriodStart, 28, 5);
      expect(nonOvulationDay?.isOvulationDay).toBe(false);
    });

    it('should identify fertile window correctly', () => {
      const lastPeriodStart = '2026-01-01';
      
      // Fertile window is typically days 10-16 for a 28-day cycle
      const fertileDay = getDateFertilityInfo('2026-01-12', lastPeriodStart, 28, 5);
      expect(fertileDay?.isFertileDay).toBe(true);
      
      // Day 5 should not be fertile
      const nonFertileDay = getDateFertilityInfo('2026-01-05', lastPeriodStart, 28, 5);
      expect(nonFertileDay?.isFertileDay).toBe(false);
    });

    it('should handle different cycle lengths', () => {
      const lastPeriodStart = '2026-01-01';
      
      // With 30-day cycle, ovulation is 30-14=16 days from period start, so Jan 17
      const result30 = getDateFertilityInfo('2026-01-17', lastPeriodStart, 30, 5);
      expect(result30?.isOvulationDay).toBe(true);
      
      // With 26-day cycle, ovulation is 26-14=12 days from period start, so Jan 13
      const result26 = getDateFertilityInfo('2026-01-13', lastPeriodStart, 26, 5);
      expect(result26?.isOvulationDay).toBe(true);
    });
  });

  describe('findLastPeriodStart', () => {
    it('should find the most recent period start', () => {
      const logs: DailyLog[] = [
        buildLog({ id: '1', date: '2026-01-01', periodStarted: true, flowLevel: 'medium' }),
        buildLog({ id: '2', date: '2026-01-15', periodStarted: true, flowLevel: 'light' }),
      ];
      
      const result = findLastPeriodStart(logs);
      expect(result).toBe('2026-01-15');
    });

    it('should return null if no period starts found', () => {
      const logs: DailyLog[] = [buildLog({ migraineOccurred: true, migraineIntensity: 5, symptoms: ['nausea'], mood: 'okay', sleepQuality: 6, stressLevel: 4 })];
      
      const result = findLastPeriodStart(logs);
      expect(result).toBeNull();
    });

    it('should return null for empty logs', () => {
      const result = findLastPeriodStart([]);
      expect(result).toBeNull();
    });
  });

  describe('log-driven fertility calculations', () => {
    const logs: DailyLog[] = [
      buildLog({ id: '1', date: '2026-01-01', periodStarted: true, flowLevel: 'medium' }),
      buildLog({ id: '2', date: '2026-01-29', periodStarted: true, flowLevel: 'light' }),
    ];

    it('should use the latest period start before the target date', () => {
      expect(findPeriodStartForDate('2026-01-15', logs)).toBe('2026-01-01');
      expect(findPeriodStartForDate('2026-02-02', logs)).toBe('2026-01-29');
    });

    it('should calculate fertility info from logs per date', () => {
      const janCycle = getDateFertilityInfoFromLogs('2026-01-15', logs, 28, 5);
      const febCycle = getDateFertilityInfoFromLogs('2026-02-12', logs, 28, 5);

      expect(janCycle?.periodStart).toBe('2026-01-01');
      expect(janCycle?.isOvulationDay).toBe(true);
      expect(febCycle?.periodStart).toBe('2026-01-29');
      expect(febCycle?.isOvulationDay).toBe(true);
    });

    it('should build an upcoming forecast from logged period starts', () => {
      const forecast = getUpcomingFertilityForecast(logs, 28, 5, '2026-02-01');

      expect(forecast).toMatchObject({
        anchorPeriodStart: '2026-01-29',
        nextPeriodStart: '2026-02-26',
        nextPeriodEnd: '2026-03-02',
        ovulationDate: '2026-02-12',
        fertilityWindowStart: '2026-02-07',
        fertilityWindowEnd: '2026-02-13',
      });
    });
  });
});
