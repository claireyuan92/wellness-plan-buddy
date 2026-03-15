import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  LayoutAnimation,
  Modal,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { ScreenContainer } from '@/components/screen-container';
import DayLogPanel from '@/components/day-log-panel';
import SettingsModal from '@/components/settings-modal';
import { useColors } from '@/hooks/use-colors';
import { useAppStore, useAppointments, useDailyLogs, useMedications, usePlans } from '@/lib/store/app-store';
import { DailyLog, generateId } from '@/lib/types';
import { getDateFertilityInfoFromLogs } from '@/lib/utils/fertility';

const DAY_IN_MS = 1000 * 60 * 60 * 24;
const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

type CalendarDay = {
  date: string;
  day: number;
  isCurrentMonth: boolean;
};

function toDateKey(date: Date) {
  return date.toISOString().split('T')[0];
}

function addDays(date: string, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return toDateKey(next);
}

function getStartOfWeek(date: string) {
  const next = new Date(date);
  next.setDate(next.getDate() - next.getDay());
  return toDateKey(next);
}

function buildEmptyLog(planId: string, date: string): DailyLog {
  return {
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
    ovulationLogged: false,
  };
}

function buildMonthDays(baseDate: Date): CalendarDay[] {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startPadding = firstDay.getDay();
  const totalDays = lastDay.getDate();
  const days: CalendarDay[] = [];

  const prevMonth = new Date(year, month, 0);
  for (let i = startPadding - 1; i >= 0; i -= 1) {
    const day = prevMonth.getDate() - i;
    days.push({
      date: toDateKey(new Date(year, month - 1, day)),
      day,
      isCurrentMonth: false,
    });
  }

  for (let day = 1; day <= totalDays; day += 1) {
    days.push({
      date: toDateKey(new Date(year, month, day)),
      day,
      isCurrentMonth: true,
    });
  }

  const remaining = 42 - days.length;
  for (let day = 1; day <= remaining; day += 1) {
    days.push({
      date: toDateKey(new Date(year, month + 1, day)),
      day,
      isCurrentMonth: false,
    });
  }

  return days;
}

export default function CalendarScreen() {
  const colors = useColors();
  const { state } = useAppStore();
  const { activePlan, setActivePlan } = usePlans();
  const [selectedDate, setSelectedDate] = useState(toDateKey(new Date()));
  const [monthAnchor, setMonthAnchor] = useState(new Date());
  const [showMonthModal, setShowMonthModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const transition = useRef(new Animated.Value(0)).current;

  const planId = activePlan?.id ?? '';
  const { logs, upsertDailyLog } = useDailyLogs(planId);
  const { medications } = useMedications(planId);
  const { appointments } = useAppointments(planId);

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  useEffect(() => {
    setMonthAnchor(new Date(selectedDate));
  }, [selectedDate]);

  const medicationLogsForPlan = useMemo(() => {
    const medicationIds = new Set(medications.map((medication) => medication.id));
    return state.medicationLogs.filter((log) => medicationIds.has(log.medicationId));
  }, [medications, state.medicationLogs]);

  const isLoggedPeriodDay = useCallback((log?: DailyLog) => {
    return !!(log?.periodStarted || log?.periodEnded || log?.flowLevel);
  }, []);

  const syncPeriodDates = useCallback(async (periodDates: string[]) => {
    const sortedDates = [...new Set(periodDates)].sort();
    const logsByDate = new Map(logs.map((log) => [log.date, log]));
    const writes: DailyLog[] = [];

    sortedDates.forEach((date, index) => {
      const previousDate = sortedDates[index - 1];
      const nextDate = sortedDates[index + 1];
      const hasPreviousAdjacent =
        !!previousDate &&
        new Date(date).getTime() - new Date(previousDate).getTime() === DAY_IN_MS;
      const hasNextAdjacent =
        !!nextDate &&
        new Date(nextDate).getTime() - new Date(date).getTime() === DAY_IN_MS;
      const existingLog = logsByDate.get(date);

      writes.push({
        ...(existingLog ?? buildEmptyLog(planId, date)),
        flowLevel: existingLog?.flowLevel ?? 'medium',
        periodStarted: !hasPreviousAdjacent,
        periodEnded: !hasNextAdjacent,
      });
    });

    logs.forEach((log) => {
      if (!isLoggedPeriodDay(log)) return;
      if (sortedDates.includes(log.date)) return;
      writes.push({
        ...log,
        periodStarted: false,
        periodEnded: false,
        flowLevel: null,
      });
    });

    await Promise.all(writes.map((log) => upsertDailyLog(log)));
  }, [isLoggedPeriodDay, logs, planId, upsertDailyLog]);

  const togglePeriodDate = useCallback(async (date: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    const periodDates = logs.filter((log) => isLoggedPeriodDay(log)).map((log) => log.date);
    const nextDates = periodDates.includes(date)
      ? periodDates.filter((value) => value !== date)
      : [...periodDates, date];

    await syncPeriodDates(nextDates);
  }, [isLoggedPeriodDay, logs, syncPeriodDates]);

  const getDayIndicators = useCallback((date: string) => {
    const log = logs.find((item) => item.date === date);
    const dayAppointments = appointments.filter((appointment) => appointment.startTime.split('T')[0] === date);
    const dayMedLogs = medicationLogsForPlan.filter((item) => item.date === date);

    const fertilityInfo = state.profile?.cycleTrackingEnabled
      ? getDateFertilityInfoFromLogs(
          date,
          logs,
          state.profile.averageCycleLength,
          state.profile.periodLength
        )
      : null;

    return {
      hasMigraine: !!log?.migraineOccurred,
      hasMedsTaken: dayMedLogs.some((item) => item.status === 'taken'),
      hasAppointment: dayAppointments.length > 0,
      isPeriodLogged: isLoggedPeriodDay(log),
      isOvulationLogged: !!log?.ovulationLogged,
      fertilityInfo,
    };
  }, [appointments, isLoggedPeriodDay, logs, medicationLogsForPlan, state.profile]);

  const animateToDate = useCallback((nextDate: string) => {
    if (nextDate === selectedDate) return;

    const direction = new Date(nextDate).getTime() > new Date(selectedDate).getTime() ? 1 : -1;
    Animated.timing(transition, {
      toValue: direction,
      duration: 170,
      useNativeDriver: true,
    }).start(() => {
      setSelectedDate(nextDate);
      transition.setValue(-direction * 0.65);
      Animated.spring(transition, {
        toValue: 0,
        damping: 18,
        mass: 0.9,
        stiffness: 180,
        useNativeDriver: true,
      }).start();
    });
  }, [selectedDate, transition]);

  const swipeResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dx) > 18 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy),
        onPanResponderRelease: (_, gestureState) => {
          if (gestureState.dx <= -45) {
            animateToDate(addDays(selectedDate, 1));
          } else if (gestureState.dx >= 45) {
            animateToDate(addDays(selectedDate, -1));
          }
        },
      }),
    [animateToDate, selectedDate]
  );

  const weekDays = useMemo(() => {
    const weekStart = getStartOfWeek(selectedDate);
    return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  }, [selectedDate]);

  const monthSections = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const monthDate = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + index - 2, 1);
      return {
        key: `${monthDate.getFullYear()}-${monthDate.getMonth()}`,
        label: `${MONTHS[monthDate.getMonth()]} ${monthDate.getFullYear()}`,
        days: buildMonthDays(monthDate),
      };
    });
  }, [monthAnchor]);

  const dayPanelStyle = useMemo(
    () => ({
      opacity: transition.interpolate({
        inputRange: [-1, -0.3, 0, 0.3, 1],
        outputRange: [0.2, 0.86, 1, 0.86, 0.2],
      }),
      transform: [
        {
          translateX: transition.interpolate({
            inputRange: [-1, 0, 1],
            outputRange: [-46, 0, 46],
          }),
        },
        {
          scale: transition.interpolate({
            inputRange: [-1, 0, 1],
            outputRange: [0.98, 1, 0.98],
          }),
        },
      ],
    }),
    [transition]
  );

  const handleBackToPlans = async () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await setActivePlan(null);
    router.replace('/plans');
  };

  if (!activePlan) {
    return (
      <LinearGradient colors={[colors.gradientStart, colors.gradientEnd]} style={styles.gradient}>
        <ScreenContainer className="flex-1 items-center justify-center px-6">
          <Text className="text-2xl font-bold text-foreground mb-2">No active plan</Text>
          <Text className="text-sm text-muted text-center mb-6">
            Select or create a treatment plan before logging symptoms, medications, and cycle days.
          </Text>
          <TouchableOpacity
            onPress={() => router.replace('/plans')}
            style={[styles.emptyStateButton, { backgroundColor: colors.primary }]}
            activeOpacity={0.85}
          >
            <Text style={styles.emptyStateButtonText}>Go to Plans</Text>
          </TouchableOpacity>
        </ScreenContainer>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={[colors.gradientStart, colors.gradientEnd]} style={styles.gradient}>
      <ScreenContainer className="flex-1" edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBackToPlans} style={styles.headerButton}>
            <Text style={[styles.headerButtonText, { color: colors.primary }]}>← Plans</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.planTitle, { color: colors.foreground }]} numberOfLines={1}>
              {activePlan.name}
            </Text>
            <Text style={[styles.planSubtitle, { color: colors.muted }]}>Day View</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => setShowMonthModal(true)}
              style={[styles.iconButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              activeOpacity={0.85}
            >
              <Text style={styles.iconText}>📅</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowSettings(true)}
              style={[styles.iconButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              activeOpacity={0.85}
            >
              <Text style={styles.iconText}>⚙️</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.weekStrip}>
          {weekDays.map((date) => {
            const indicators = getDayIndicators(date);
            const isSelected = date === selectedDate;
            const isToday = date === toDateKey(new Date());
            const dayDate = new Date(date);
            let backgroundColor = colors.surface;

            if (indicators.isPeriodLogged) {
              backgroundColor = colors.period;
            } else if (indicators.isOvulationLogged || indicators.fertilityInfo?.isOvulationDay) {
              backgroundColor = `${colors.ovulation}55`;
            } else if (indicators.fertilityInfo?.isFertileDay) {
              backgroundColor = `${colors.fertility}55`;
            }

            return (
              <TouchableOpacity
                key={date}
                onPress={() => animateToDate(date)}
                style={[
                  styles.weekDayButton,
                  { backgroundColor, borderColor: isSelected || isToday ? colors.primary : colors.border },
                  isSelected && { transform: [{ translateY: -2 }] },
                ]}
                activeOpacity={0.85}
              >
                <Text style={[styles.weekDayLabel, { color: isSelected ? colors.primary : colors.muted }]}>
                  {DAYS_OF_WEEK[dayDate.getDay()]}
                </Text>
                <Text style={[styles.weekDayNumber, { color: colors.foreground }]}>{dayDate.getDate()}</Text>
                <View style={styles.weekDots}>
                  {indicators.hasMigraine && <View style={[styles.weekDot, { backgroundColor: colors.migraine }]} />}
                  {indicators.hasMedsTaken && <View style={[styles.weekDot, { backgroundColor: colors.primary }]} />}
                  {indicators.hasAppointment && <View style={[styles.weekDot, { backgroundColor: colors.warning }]} />}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <Animated.View style={[styles.dayPanelShell, dayPanelStyle]} {...swipeResponder.panHandlers}>
          <DayLogPanel
            date={selectedDate}
            planId={planId}
            onTogglePeriodDay={togglePeriodDate}
          />
        </Animated.View>

        <Modal
          visible={showMonthModal}
          animationType="slide"
          transparent
          onRequestClose={() => setShowMonthModal(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setShowMonthModal(false)}>
            <Pressable
              style={[styles.monthSheet, { backgroundColor: colors.background }]}
              onPress={(event) => event.stopPropagation()}
            >
              <View style={styles.monthSheetHeader}>
                <Text style={[styles.monthSheetTitle, { color: colors.foreground }]}>Monthly Calendar</Text>
                <TouchableOpacity onPress={() => setShowMonthModal(false)}>
                  <Text style={[styles.closeText, { color: colors.primary }]}>Done</Text>
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.monthScrollContent}>
                <View style={styles.legendRow}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: colors.period }]} />
                    <Text style={[styles.legendText, { color: colors.muted }]}>Period</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: colors.ovulation }]} />
                    <Text style={[styles.legendText, { color: colors.muted }]}>Ovulation</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: colors.fertility }]} />
                    <Text style={[styles.legendText, { color: colors.muted }]}>Fertile</Text>
                  </View>
                </View>

                {monthSections.map((section) => (
                  <View key={section.key} style={styles.monthSection}>
                    <Text style={[styles.monthLabel, { color: colors.foreground }]}>{section.label}</Text>
                    <View style={styles.monthWeekHeader}>
                      {DAYS_OF_WEEK.map((day) => (
                        <Text key={`${section.key}-${day}`} style={[styles.monthWeekLabel, { color: colors.muted }]}>
                          {day}
                        </Text>
                      ))}
                    </View>
                    <View style={styles.monthGrid}>
                      {section.days.map((item) => {
                        const indicators = getDayIndicators(item.date);
                        const isSelected = item.date === selectedDate;
                        let backgroundColor = 'transparent';

                        if (item.isCurrentMonth) {
                          if (indicators.isPeriodLogged) {
                            backgroundColor = colors.period;
                          } else if (indicators.isOvulationLogged || indicators.fertilityInfo?.isOvulationDay) {
                            backgroundColor = `${colors.ovulation}44`;
                          } else if (indicators.fertilityInfo?.isFertileDay) {
                            backgroundColor = `${colors.fertility}40`;
                          } else if (indicators.fertilityInfo?.isPeriodDay) {
                            backgroundColor = `${colors.period}30`;
                          }
                        }

                        return (
                          <TouchableOpacity
                            key={`${section.key}-${item.date}`}
                            onPress={() => {
                              if (!item.isCurrentMonth) return;
                              animateToDate(item.date);
                              setShowMonthModal(false);
                            }}
                            onLongPress={() => {
                              if (!item.isCurrentMonth || !state.profile?.cycleTrackingEnabled) return;
                              void togglePeriodDate(item.date);
                            }}
                            style={[
                              styles.monthCell,
                              { backgroundColor },
                              isSelected && { borderColor: colors.primary, borderWidth: 2 },
                            ]}
                            activeOpacity={0.8}
                          >
                            <Text style={[styles.monthCellText, { color: item.isCurrentMonth ? colors.foreground : colors.muted }]}>
                              {item.day}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                ))}
              </ScrollView>
            </Pressable>
          </Pressable>
        </Modal>

        <SettingsModal visible={showSettings} onClose={() => setShowSettings(false)} />
      </ScreenContainer>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
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
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 12,
  },
  headerButton: {
    minWidth: 68,
    paddingVertical: 8,
  },
  headerButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  headerCenter: {
    flex: 1,
  },
  planTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  planSubtitle: {
    fontSize: 12,
    marginTop: 2,
    textAlign: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  iconText: {
    fontSize: 18,
  },
  weekStrip: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  weekDayButton: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1.5,
    flex: 1,
    minHeight: 82,
    paddingTop: 10,
    paddingBottom: 8,
    paddingHorizontal: 4,
  },
  weekDayLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  weekDayNumber: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 6,
  },
  weekDots: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 8,
    minHeight: 6,
  },
  weekDot: {
    borderRadius: 3,
    height: 6,
    width: 6,
  },
  dayPanelShell: {
    flex: 1,
  },
  modalOverlay: {
    backgroundColor: 'rgba(0,0,0,0.32)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  monthSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '86%',
    minHeight: '72%',
  },
  monthSheetHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
  },
  monthSheetTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeText: {
    fontSize: 16,
    fontWeight: '700',
  },
  monthScrollContent: {
    paddingBottom: 40,
    paddingHorizontal: 16,
  },
  legendRow: {
    flexDirection: 'row',
    gap: 16,
    paddingBottom: 10,
  },
  legendItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  legendDot: {
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  legendText: {
    fontSize: 12,
  },
  monthSection: {
    marginTop: 12,
  },
  monthLabel: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 10,
  },
  monthWeekHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  monthWeekLabel: {
    fontSize: 11,
    textAlign: 'center',
    width: '14.28%',
  },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  monthCell: {
    alignItems: 'center',
    borderRadius: 10,
    height: 48,
    justifyContent: 'center',
    marginBottom: 4,
    width: '14.28%',
  },
  monthCellText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
