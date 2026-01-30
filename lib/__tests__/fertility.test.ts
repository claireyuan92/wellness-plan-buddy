import { describe, it, expect } from 'vitest';
import { getDateFertilityInfo, findLastPeriodStart } from '../utils/fertility';
import { DailyLog } from '../types';

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
        {
          id: '1',
          planId: 'plan1',
          date: '2026-01-01',
          migraineOccurred: false,
          migraineIntensity: 0,
          symptoms: [],
          mood: null,
          sleepQuality: null,
          stressLevel: null,
          notes: '',
          periodStarted: true,
          periodEnded: false,
          flowLevel: 'medium',
        },
        {
          id: '2',
          planId: 'plan1',
          date: '2026-01-15',
          migraineOccurred: false,
          migraineIntensity: 0,
          symptoms: [],
          mood: null,
          sleepQuality: null,
          stressLevel: null,
          notes: '',
          periodStarted: true,
          periodEnded: false,
          flowLevel: 'light',
        },
      ];
      
      const result = findLastPeriodStart(logs);
      expect(result).toBe('2026-01-15');
    });

    it('should return null if no period starts found', () => {
      const logs: DailyLog[] = [
        {
          id: '1',
          planId: 'plan1',
          date: '2026-01-01',
          migraineOccurred: true,
          migraineIntensity: 5,
          symptoms: ['nausea'],
          mood: 'okay',
          sleepQuality: 6,
          stressLevel: 4,
          notes: '',
          periodStarted: false,
          periodEnded: false,
          flowLevel: null,
        },
      ];
      
      const result = findLastPeriodStart(logs);
      expect(result).toBeNull();
    });

    it('should return null for empty logs', () => {
      const result = findLastPeriodStart([]);
      expect(result).toBeNull();
    });
  });
});
