import { useState, useMemo, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform, LayoutAnimation, UIManager } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { usePlans, useAppStore, useDailyLogs, useMedications, useAppointments } from '@/lib/store/app-store';
import { DailyLog, generateId } from '@/lib/types';
import { getDateFertilityInfoFromLogs, getUpcomingFertilityForecast } from '@/lib/utils/fertility';
import * as Haptics from 'expo-haptics';
import DayDetailSheet from '@/components/day-detail-sheet';
import SettingsModal from '@/components/settings-modal';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function CalendarScreen() {
  const colors = useColors();
  const { activePlan, setActivePlan } = usePlans();
  const { state } = useAppStore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const planId = activePlan?.id || '';
  const { logs, upsertDailyLog, getDailyLog } = useDailyLogs(planId);
  const { medications, upsertMedicationLog, getMedicationLog, addMedication, deleteMedication } = useMedications(planId);
  const { appointments, getAppointmentsForDate, addAppointment, deleteAppointment } = useAppointments(planId);
  const medicationLogsForPlan = useMemo(() => {
    const medicationIds = new Set(medications.map((medication) => medication.id));
    return state.medicationLogs.filter((log) => medicationIds.has(log.medicationId));
  }, [medications, state.medicationLogs]);
  const forecast = useMemo(() => {
    if (!state.profile?.cycleTrackingEnabled) return null;
    const today = new Date().toISOString().split('T')[0];
    return getUpcomingFertilityForecast(
      logs,
      state.profile.averageCycleLength,
      state.profile.periodLength,
      today
    );
  }, [logs, state.profile]);

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  // Get calendar data for current month
  const calendarData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();
    const totalDays = lastDay.getDate();

    const days: { date: string; day: number; isCurrentMonth: boolean }[] = [];

    // Previous month padding
    const prevMonth = new Date(year, month, 0);
    for (let i = startPadding - 1; i >= 0; i--) {
      const day = prevMonth.getDate() - i;
      const date = new Date(year, month - 1, day).toISOString().split('T')[0];
      days.push({ date, day, isCurrentMonth: false });
    }

    // Current month days
    for (let day = 1; day <= totalDays; day++) {
      const date = new Date(year, month, day).toISOString().split('T')[0];
      days.push({ date, day, isCurrentMonth: true });
    }

    // Next month padding
    const remaining = 42 - days.length;
    for (let day = 1; day <= remaining; day++) {
      const date = new Date(year, month + 1, day).toISOString().split('T')[0];
      days.push({ date, day, isCurrentMonth: false });
    }

    return days;
  }, [currentDate]);

  const getDayIndicators = useCallback((date: string) => {
    const log = logs.find(l => l.date === date);
    const dayAppointments = appointments.filter(a => a.startTime.split('T')[0] === date);
    const dayMedLogs = medicationLogsForPlan.filter(ml => ml.date === date);
    
    const hasMigraine = log?.migraineOccurred;
    const hasSymptoms = log && (log.mood || log.sleepQuality || log.stressLevel);
    const hasMedsTaken = dayMedLogs.some(ml => ml.status === 'taken');
    const hasMedsSkipped = dayMedLogs.some(ml => ml.status === 'skipped');
    const hasAppointment = dayAppointments.length > 0;

    // Fertility info
    let fertilityInfo = null;
    if (state.profile?.cycleTrackingEnabled) {
      fertilityInfo = getDateFertilityInfoFromLogs(
        date,
        logs,
        state.profile.averageCycleLength,
        state.profile.periodLength
      );
    }

    // Check if period was logged for this date
    const isPeriodLogged = log?.periodStarted || (log?.flowLevel && !log?.periodEnded);

    return {
      hasMigraine,
      hasSymptoms,
      hasMedsTaken,
      hasMedsSkipped,
      hasAppointment,
      fertilityInfo,
      isPeriodLogged,
    };
  }, [appointments, logs, medicationLogsForPlan, state.profile]);

  const handlePrevMonth = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleDayPress = (date: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedDate(date);
  };

  const handleMarkPeriodStart = useCallback(async (date: string) => {
    if (!state.profile?.cycleTrackingEnabled) return;

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    const existingLog = getDailyLog(planId, date);
    const nextLog: DailyLog = existingLog
      ? {
          ...existingLog,
          periodStarted: true,
          periodEnded: false,
          flowLevel: existingLog.flowLevel ?? 'medium',
        }
      : {
          id: generateId(),
          planId,
          date,
          migraineOccurred: false,
          migraineIntensity: 5,
          symptoms: [],
          mood: null,
          sleepQuality: null,
          stressLevel: null,
          notes: '',
          periodStarted: true,
          periodEnded: false,
          flowLevel: 'medium',
        };

    await upsertDailyLog(nextLog);
  }, [getDailyLog, planId, state.profile?.cycleTrackingEnabled, upsertDailyLog]);

  const upsertCycleFields = useCallback(async (date: string, fields: Partial<DailyLog>) => {
    const existingLog = getDailyLog(planId, date);
    const nextLog: DailyLog = existingLog
      ? { ...existingLog, ...fields }
      : {
          id: generateId(),
          planId,
          date,
          migraineOccurred: false,
          migraineIntensity: 5,
          symptoms: [],
          mood: null,
          sleepQuality: null,
          stressLevel: null,
          notes: '',
          periodStarted: false,
          periodEnded: false,
          flowLevel: null,
          ...fields,
        };

    await upsertDailyLog(nextLog);
  }, [getDailyLog, planId, upsertDailyLog]);

  const handleClearCycleData = useCallback(async () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    for (const log of logs) {
      if (!log.periodStarted && !log.periodEnded && !log.flowLevel) continue;
      await upsertDailyLog({
        ...log,
        periodStarted: false,
        periodEnded: false,
        flowLevel: null,
      });
    }
  }, [logs, upsertDailyLog]);

  const handleSeedCycleData = useCallback(async () => {
    const offsetDate = (days: number) => {
      const value = new Date();
      value.setDate(value.getDate() + days);
      return value.toISOString().split('T')[0];
    };

    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    await handleClearCycleData();
    await upsertCycleFields(offsetDate(-42), {
      periodStarted: true,
      periodEnded: false,
      flowLevel: 'medium',
      notes: 'Debug seed: previous period start',
    });
    await upsertCycleFields(offsetDate(-41), {
      periodStarted: false,
      periodEnded: false,
      flowLevel: 'heavy',
    });
    await upsertCycleFields(offsetDate(-38), {
      periodStarted: false,
      periodEnded: true,
      flowLevel: 'light',
    });
    await upsertCycleFields(offsetDate(-14), {
      periodStarted: true,
      periodEnded: false,
      flowLevel: 'medium',
      notes: 'Debug seed: current period start',
    });
    await upsertCycleFields(offsetDate(-13), {
      periodStarted: false,
      periodEnded: false,
      flowLevel: 'heavy',
    });
    await upsertCycleFields(offsetDate(-10), {
      periodStarted: false,
      periodEnded: true,
      flowLevel: 'light',
    });
  }, [handleClearCycleData, upsertCycleFields]);

  const handleBackToPlans = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await setActivePlan(null);
    router.replace('/plans');
  };

  const todayString = new Date().toISOString().split('T')[0];
  const formatMonthDay = (value: string) =>
    new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  if (!activePlan) {
    return (
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        style={styles.gradient}
      >
        <ScreenContainer className="flex-1 items-center justify-center px-6">
          <Text className="text-2xl font-bold text-foreground mb-2">No active plan</Text>
          <Text className="text-sm text-muted text-center mb-6">
            Select or create a treatment plan before logging symptoms, medications, and appointments.
          </Text>
          <TouchableOpacity
            onPress={() => router.replace('/plans')}
            style={[styles.emptyStateButton, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
          >
            <Text style={styles.emptyStateButtonText}>Go to Plans</Text>
          </TouchableOpacity>
        </ScreenContainer>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={[colors.gradientStart, colors.gradientEnd]}
      style={styles.gradient}
    >
      <ScreenContainer className="flex-1" edges={['top', 'left', 'right']}>
        {/* Header */}
        <View className="flex-row justify-between items-center px-4 py-3">
          <TouchableOpacity onPress={handleBackToPlans} style={styles.headerButton}>
            <Text style={[styles.headerButtonText, { color: colors.primary }]}>← Plans</Text>
          </TouchableOpacity>
          <Text className="text-lg font-semibold text-foreground" numberOfLines={1}>
            {activePlan.name}
          </Text>
          <TouchableOpacity 
            onPress={() => {
              if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
              setShowSettings(true);
            }} 
            style={styles.headerButton}
          >
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>

        {/* Month Navigation */}
        <View className="flex-row justify-between items-center px-6 py-4">
          <TouchableOpacity onPress={handlePrevMonth} style={styles.navButton}>
            <Text style={[styles.navButtonText, { color: colors.primary }]}>‹</Text>
          </TouchableOpacity>
          <Text className="text-xl font-bold text-foreground">
            {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
          </Text>
          <TouchableOpacity onPress={handleNextMonth} style={styles.navButton}>
            <Text style={[styles.navButtonText, { color: colors.primary }]}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Calendar Legend */}
        {state.profile?.cycleTrackingEnabled && (
          <>
            <View className="flex-row justify-center gap-4 px-4 pb-2">
              <View className="flex-row items-center">
                <View style={[styles.legendDot, { backgroundColor: colors.period }]} />
                <Text className="text-xs text-muted ml-1">Period</Text>
              </View>
              <View className="flex-row items-center">
                <View style={[styles.legendDot, { backgroundColor: colors.ovulation }]} />
                <Text className="text-xs text-muted ml-1">Ovulation</Text>
              </View>
              <View className="flex-row items-center">
                <View style={[styles.legendDot, { backgroundColor: colors.fertility }]} />
                <Text className="text-xs text-muted ml-1">Fertile</Text>
              </View>
            </View>

            <View style={[styles.forecastCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View className="flex-row justify-between items-start gap-3">
                <View style={styles.forecastCopy}>
                  <Text className="text-sm font-semibold text-foreground">Cycle forecast</Text>
                  <Text className="text-xs text-muted mt-1">
                    Long press a day in the calendar to mark a period start and refresh predictions.
                  </Text>
                </View>
                {forecast && (
                  <View style={[styles.anchorBadge, { backgroundColor: `${colors.period}20`, borderColor: colors.period }]}>
                    <Text style={[styles.anchorBadgeText, { color: colors.period }]}>
                      Start {formatMonthDay(forecast.anchorPeriodStart)}
                    </Text>
                  </View>
                )}
              </View>

              {forecast ? (
                <View className="flex-row justify-between mt-4">
                  <View className="items-center flex-1">
                    <Text className="text-xs text-muted">Ovulation</Text>
                    <Text className="text-base font-semibold text-foreground mt-1">
                      {formatMonthDay(forecast.ovulationDate)}
                    </Text>
                  </View>
                  <View className="items-center flex-1">
                    <Text className="text-xs text-muted">Fertile Window</Text>
                    <Text className="text-base font-semibold text-foreground mt-1 text-center">
                      {formatMonthDay(forecast.fertilityWindowStart)} - {formatMonthDay(forecast.fertilityWindowEnd)}
                    </Text>
                  </View>
                  <View className="items-center flex-1">
                    <Text className="text-xs text-muted">Next Period</Text>
                    <Text className="text-base font-semibold text-foreground mt-1">
                      {formatMonthDay(forecast.nextPeriodStart)}
                    </Text>
                  </View>
                </View>
              ) : (
                <Text className="text-sm text-muted mt-3">
                  Add a period start day to begin ovulation and fertility predictions.
                </Text>
              )}

              {__DEV__ && (
                <View className="flex-row gap-2 mt-4">
                  <TouchableOpacity
                    onPress={handleSeedCycleData}
                    style={[styles.debugButton, { backgroundColor: colors.primary }]}
                  >
                    <Text style={styles.debugButtonText}>Seed Test Cycle</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleClearCycleData}
                    style={[styles.debugButton, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}
                  >
                    <Text style={[styles.debugButtonText, { color: colors.foreground }]}>Clear Cycle Data</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </>
        )}

        {/* Day Headers */}
        <View className="flex-row px-2">
          {DAYS_OF_WEEK.map((day) => (
            <View key={day} style={styles.dayHeader}>
              <Text className="text-xs font-medium text-muted text-center">{day}</Text>
            </View>
          ))}
        </View>

        {/* Calendar Grid */}
        <View className="flex-row flex-wrap px-2">
          {calendarData.map((item, index) => {
            const indicators = getDayIndicators(item.date);
            const isToday = item.date === todayString;
            const isSelected = item.date === selectedDate;

            // Determine background color based on fertility/period
            let bgColor = 'transparent';
            if (item.isCurrentMonth) {
              if (indicators.isPeriodLogged) {
                bgColor = colors.period;
              } else if (indicators.fertilityInfo?.isPeriodDay) {
                bgColor = `${colors.period}40`;
              } else if (indicators.fertilityInfo?.isFertileDay) {
                bgColor = `${colors.fertility}40`;
              }
            }

            return (
              <TouchableOpacity
                key={`${item.date}-${index}`}
                onPress={() => item.isCurrentMonth && handleDayPress(item.date)}
                onLongPress={() => item.isCurrentMonth && handleMarkPeriodStart(item.date)}
                style={[
                  styles.dayCell,
                  { backgroundColor: bgColor },
                  isToday && { borderColor: colors.primary, borderWidth: 2 },
                  isSelected && { backgroundColor: colors.primary },
                ]}
                activeOpacity={0.7}
                disabled={!item.isCurrentMonth}
              >
                <Text
                  style={[
                    styles.dayText,
                    { color: item.isCurrentMonth ? colors.foreground : colors.muted },
                    isSelected && { color: '#FFFFFF' },
                    (indicators.isPeriodLogged || (indicators.fertilityInfo?.isPeriodDay && item.isCurrentMonth)) && { color: '#FFFFFF' },
                  ]}
                >
                  {item.day}
                </Text>

                {/* Ovulation indicator */}
                {indicators.fertilityInfo?.isOvulationDay && item.isCurrentMonth && !isSelected && (
                  <View style={[styles.ovulationRing, { borderColor: colors.ovulation }]} />
                )}

                {/* Indicator dots */}
                {item.isCurrentMonth && (
                  <View style={styles.indicatorRow}>
                    {indicators.hasMigraine && (
                      <View style={[styles.indicator, { backgroundColor: colors.migraine }]} />
                    )}
                    {indicators.hasSymptoms && !indicators.hasMigraine && (
                      <View style={[styles.indicator, { backgroundColor: colors.success }]} />
                    )}
                    {indicators.hasMedsTaken && (
                      <View style={[styles.indicator, { backgroundColor: colors.primary }]} />
                    )}
                    {indicators.hasAppointment && (
                      <View style={[styles.indicator, { backgroundColor: colors.warning }]} />
                    )}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Quick Stats */}
        <View className="flex-row justify-around px-4 py-4 mt-2">
          <View className="items-center">
            <Text className="text-2xl font-bold text-foreground">
              {logs.filter(l => l.migraineOccurred).length}
            </Text>
            <Text className="text-xs text-muted">Migraines</Text>
          </View>
          <View className="items-center">
            <Text className="text-2xl font-bold text-foreground">
              {medicationLogsForPlan.filter(ml => ml.status === 'taken').length}
            </Text>
            <Text className="text-xs text-muted">Meds Taken</Text>
          </View>
          <View className="items-center">
            <Text className="text-2xl font-bold text-foreground">
              {appointments.length}
            </Text>
            <Text className="text-xs text-muted">Appointments</Text>
          </View>
        </View>

        {/* Day Detail Bottom Sheet */}
        <DayDetailSheet
          visible={!!selectedDate}
          date={selectedDate || ''}
          planId={planId}
          onClose={() => setSelectedDate(null)}
        />

        {/* Settings Modal */}
        <SettingsModal
          visible={showSettings}
          onClose={() => setShowSettings(false)}
        />
      </ScreenContainer>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  emptyStateButton: {
    borderRadius: 999,
    minWidth: 160,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  emptyStateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  gradient: {
    flex: 1,
  },
  forecastCard: {
    borderRadius: 18,
    borderWidth: 1,
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
  },
  forecastCopy: {
    flex: 1,
  },
  anchorBadge: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  anchorBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  debugButton: {
    borderRadius: 999,
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  debugButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  headerButton: {
    padding: 8,
    minWidth: 60,
  },
  headerButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingsIcon: {
    fontSize: 24,
  },
  navButton: {
    padding: 8,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonText: {
    fontSize: 32,
    fontWeight: '300',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dayHeader: {
    width: '14.28%',
    paddingVertical: 8,
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    position: 'relative',
  },
  dayText: {
    fontSize: 16,
    fontWeight: '500',
  },
  ovulationRing: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
  },
  indicatorRow: {
    flexDirection: 'row',
    position: 'absolute',
    bottom: 4,
    gap: 2,
  },
  indicator: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
});
