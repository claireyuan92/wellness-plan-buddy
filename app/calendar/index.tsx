import { useState, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, Platform } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { usePlans, useAppStore, useDailyLogs, useMedications, useAppointments } from '@/lib/store/app-store';
import { DailyLog, generateId, MIGRAINE_SYMPTOMS, MigraineSymptom, Mood, FlowLevel, Medication, MedicationLog, Appointment } from '@/lib/types';
import { getDateFertilityInfo, findLastPeriodStart } from '@/lib/utils/fertility';
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

  // Find last period start for fertility calculations
  const lastPeriodStart = useMemo(() => findLastPeriodStart(logs), [logs]);

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
    const dayMedLogs = state.medicationLogs.filter(ml => ml.date === date);
    
    const hasMigraine = log?.migraineOccurred;
    const hasSymptoms = log && (log.mood || log.sleepQuality || log.stressLevel);
    const hasMedsTaken = dayMedLogs.some(ml => ml.status === 'taken');
    const hasMedsSkipped = dayMedLogs.some(ml => ml.status === 'skipped');
    const hasAppointment = dayAppointments.length > 0;

    // Fertility info
    let fertilityInfo = null;
    if (state.profile?.cycleTrackingEnabled && lastPeriodStart) {
      fertilityInfo = getDateFertilityInfo(
        date,
        lastPeriodStart,
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
  }, [logs, appointments, state.medicationLogs, state.profile, lastPeriodStart]);

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

  const handleBackToPlans = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await setActivePlan(null);
    router.replace('/plans');
  };

  const todayString = new Date().toISOString().split('T')[0];

  if (!activePlan) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text className="text-foreground">No active plan</Text>
      </View>
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
              {state.medicationLogs.filter(ml => ml.status === 'taken').length}
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
  gradient: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
