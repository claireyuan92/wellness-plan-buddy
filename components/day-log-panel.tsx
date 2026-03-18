import { useEffect, useMemo, useState } from 'react';
import { LayoutAnimation, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, UIManager, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/use-colors';
import { useAppStore, useAppointments, useDailyLogs, useMedications } from '@/lib/store/app-store';
import { DailyLog, Medication, MedicationStatus, generateId } from '@/lib/types';
import { getDateFertilityInfoFromLogs, getUpcomingFertilityForecast } from '@/lib/utils/fertility';
import MedicationModal from './medication-modal';

interface DayLogPanelProps {
  date: string;
  planId: string;
  onTogglePeriodDay: (date: string) => Promise<void>;
}

const MIGRAINE_LEVELS = [
  { value: 3, label: 'Mild' },
  { value: 6, label: 'Moderate' },
  { value: 9, label: 'Severe' },
] as const;

const DAY_IN_MS = 1000 * 60 * 60 * 24;

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

function formatScheduleTime(value: string) {
  const [hours, minutes] = value.split(':').map(Number);
  const dateValue = new Date();
  dateValue.setHours(hours, minutes, 0, 0);
  return dateValue.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

function formatLongDate(date: string) {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function getDaysUntil(fromDate: string, targetDate: string) {
  return Math.round((new Date(targetDate).getTime() - new Date(fromDate).getTime()) / DAY_IN_MS);
}

export default function DayLogPanel({ date, planId, onTogglePeriodDay }: DayLogPanelProps) {
  const colors = useColors();
  const { state } = useAppStore();
  const { logs, upsertDailyLog, getDailyLog } = useDailyLogs(planId);
  const { medications, upsertMedicationLog, getMedicationLog, addMedication } = useMedications(planId);
  const { appointments } = useAppointments(planId);
  const [log, setLog] = useState<DailyLog>(buildEmptyLog(planId, date));
  const [showMedicationModal, setShowMedicationModal] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  useEffect(() => {
    const existingLog = getDailyLog(planId, date);
    setLog(existingLog ? { ...existingLog, ovulationLogged: existingLog.ovulationLogged ?? false } : buildEmptyLog(planId, date));
  }, [date, getDailyLog, planId]);

  const fertilityInfo = useMemo(() => {
    if (!state.profile?.cycleTrackingEnabled) return null;
    return getDateFertilityInfoFromLogs(
      date,
      logs,
      state.profile.averageCycleLength,
      state.profile.periodLength
    );
  }, [date, logs, state.profile]);

  const fertilityForecast = useMemo(() => {
    if (!state.profile?.cycleTrackingEnabled) return null;
    return getUpcomingFertilityForecast(
      logs,
      state.profile.averageCycleLength,
      state.profile.periodLength,
      date
    );
  }, [date, logs, state.profile]);

  const supplements = useMemo(
    () => medications.filter((medication) => medication.type === 'supplement'),
    [medications]
  );
  const medicationsOnly = useMemo(
    () => medications.filter((medication) => medication.type !== 'supplement'),
    [medications]
  );

  const appointmentCount = useMemo(
    () => appointments.filter((appointment) => appointment.startTime.split('T')[0] === date).length,
    [appointments, date]
  );

  const isPeriodLogged = !!(log.periodStarted || log.periodEnded || log.flowLevel);

  const cycleHighlights = useMemo(() => {
    if (!fertilityForecast) return [];

    const items: { key: string; label: string; value: string; color: string }[] = [];
    const daysToPeriod = getDaysUntil(date, fertilityForecast.nextPeriodStart);
    const daysToOvulation = getDaysUntil(date, fertilityForecast.ovulationDate);

    if (daysToPeriod >= 0 && daysToPeriod <= 5) {
      items.push({
        key: 'period',
        label: daysToPeriod === 0 ? 'Period expected today' : `Period in ${daysToPeriod} day${daysToPeriod === 1 ? '' : 's'}`,
        value: fertilityForecast.nextPeriodStart,
        color: colors.period,
      });
    }

    if (daysToOvulation >= 0 && daysToOvulation <= 5) {
      items.push({
        key: 'ovulation',
        label: daysToOvulation === 0 ? 'Ovulation expected today' : `Ovulation in ${daysToOvulation} day${daysToOvulation === 1 ? '' : 's'}`,
        value: fertilityForecast.ovulationDate,
        color: colors.ovulation,
      });
    }

    return items;
  }, [colors.ovulation, colors.period, date, fertilityForecast]);

  const handleFieldChange = <K extends keyof DailyLog>(field: K, value: DailyLog[K]) => {
    setLog((prev) => {
      const nextLog = { ...prev, [field]: value } as DailyLog;
      setTimeout(() => {
        void upsertDailyLog(nextLog);
      }, 150);
      return nextLog;
    });
  };

  const handleMedicationStatus = async (
    medicationId: string,
    scheduledTime: string | null,
    status: MedicationStatus
  ) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    await upsertMedicationLog({
      id: generateId(),
      medicationId,
      date,
      scheduledTime,
      status,
      actualTime: status === 'taken' ? new Date().toISOString() : null,
    });
  };

  const handleTogglePeriod = async () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    await onTogglePeriodDay(date);
  };

  const handleToggleOvulation = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    handleFieldChange('ovulationLogged', !log.ovulationLogged);
  };

  const renderMedicationSection = (title: string, items: Medication[], emptyMessage: string) => (
    <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>{title}</Text>
        <TouchableOpacity
          onPress={() => setShowMedicationModal(true)}
          style={[styles.addButton, { backgroundColor: colors.primary }]}
          activeOpacity={0.85}
        >
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {items.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.muted }]}>{emptyMessage}</Text>
      ) : (
        items.flatMap((medication) => {
          const doseTimes = medication.scheduleTimes.length > 0 ? medication.scheduleTimes : [null];
          return doseTimes.map((scheduledTime) => {
            const medLog = getMedicationLog(medication.id, date, scheduledTime);
            return (
              <View
                key={`${medication.id}-${scheduledTime ?? 'as-needed'}`}
                style={[styles.medCard, { backgroundColor: colors.background, borderColor: colors.border }]}
              >
                <View style={styles.medInfo}>
                  <Text style={[styles.medTitle, { color: colors.foreground }]}>{medication.name}</Text>
                  <Text style={[styles.medMeta, { color: colors.muted }]}>{medication.dosage}</Text>
                  <Text style={[styles.medMeta, { color: colors.muted }]}>
                    {scheduledTime ? formatScheduleTime(scheduledTime) : 'As needed'}
                  </Text>
                </View>
                <View style={styles.medActions}>
                  <TouchableOpacity
                    onPress={() => handleMedicationStatus(medication.id, scheduledTime, 'taken')}
                    style={[
                      styles.statusButton,
                      {
                        backgroundColor: medLog?.status === 'taken' ? colors.success : colors.background,
                        borderColor: medLog?.status === 'taken' ? colors.success : colors.border,
                      },
                    ]}
                  >
                    <Text style={{ color: medLog?.status === 'taken' ? '#FFFFFF' : colors.foreground }}>✓</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleMedicationStatus(medication.id, scheduledTime, 'skipped')}
                    style={[
                      styles.statusButton,
                      {
                        backgroundColor: medLog?.status === 'skipped' ? colors.error : colors.background,
                        borderColor: medLog?.status === 'skipped' ? colors.error : colors.border,
                      },
                    ]}
                  >
                    <Text style={{ color: medLog?.status === 'skipped' ? '#FFFFFF' : colors.foreground }}>✗</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          });
        })
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.topMeta}>
          <View>
            <Text style={[styles.dateTitle, { color: colors.foreground }]}>{formatLongDate(date)}</Text>
            <Text style={[styles.dateSubtitle, { color: colors.muted }]}>
              {appointmentCount > 0 ? `${appointmentCount} appointment${appointmentCount === 1 ? '' : 's'} today` : 'No appointments today'}
            </Text>
          </View>
        </View>

        {cycleHighlights.length > 0 && (
          <View style={styles.highlightRow}>
            {cycleHighlights.map((item) => (
              <View key={item.key} style={[styles.highlightCard, { backgroundColor: `${item.color}22`, borderColor: item.color }]}>
                <Text style={[styles.highlightText, { color: colors.foreground }]}>{item.label}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {state.profile?.cycleTrackingEnabled && (
          <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Cycle</Text>
            <View style={styles.actionRow}>
              <TouchableOpacity
                onPress={() => void handleTogglePeriod()}
                style={[
                  styles.actionButton,
                  {
                    backgroundColor: isPeriodLogged ? colors.period : colors.background,
                    borderColor: isPeriodLogged ? colors.period : colors.border,
                  },
                ]}
                activeOpacity={0.85}
              >
                <Text style={[styles.actionButtonText, { color: isPeriodLogged ? '#FFFFFF' : colors.foreground }]}>
                  {isPeriodLogged ? 'Period Logged' : 'Log Period'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleToggleOvulation}
                style={[
                  styles.actionButton,
                  {
                    backgroundColor: log.ovulationLogged ? colors.ovulation : colors.background,
                    borderColor: log.ovulationLogged ? colors.ovulation : colors.border,
                  },
                ]}
                activeOpacity={0.85}
              >
                <Text style={[styles.actionButtonText, { color: log.ovulationLogged ? '#FFFFFF' : colors.foreground }]}>
                  {log.ovulationLogged ? 'Ovulation Logged' : 'Log Ovulation'}
                </Text>
              </TouchableOpacity>
            </View>
            {fertilityInfo && (
              <Text style={[styles.helperText, { color: colors.muted }]}>
                Cycle day {fertilityInfo.cycleDay}
                {fertilityInfo.isFertileDay ? ' • Fertile window' : ''}
                {fertilityInfo.isOvulationDay ? ' • Predicted ovulation' : ''}
              </Text>
            )}
          </View>
        )}

        {renderMedicationSection('Supplements', supplements, 'No supplements scheduled.')}
        {renderMedicationSection('Medication', medicationsOnly, 'No medication scheduled.')}

        <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Migraine Status</Text>
          <View style={styles.actionRow}>
            {MIGRAINE_LEVELS.map((level) => {
              const isSelected = log.migraineOccurred && log.migraineIntensity === level.value;
              return (
                <TouchableOpacity
                  key={level.label}
                  onPress={() => {
                    if (Platform.OS !== 'web') {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                    handleFieldChange('migraineOccurred', true);
                    handleFieldChange('migraineIntensity', level.value);
                  }}
                  style={[
                    styles.severityButton,
                    {
                      backgroundColor: isSelected ? colors.migraine : colors.background,
                      borderColor: isSelected ? colors.migraine : colors.border,
                    },
                  ]}
                  activeOpacity={0.85}
                >
                  <Text
                    numberOfLines={1}
                    style={[styles.severityText, { color: isSelected ? '#FFFFFF' : colors.foreground }]}
                  >
                    {level.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity
            onPress={() => handleFieldChange('migraineOccurred', false)}
            style={[
              styles.clearButton,
              {
                backgroundColor: !log.migraineOccurred ? colors.primary : colors.background,
                borderColor: !log.migraineOccurred ? colors.primary : colors.border,
              },
            ]}
            activeOpacity={0.85}
          >
            <Text style={[styles.clearButtonText, { color: !log.migraineOccurred ? '#FFFFFF' : colors.foreground }]}>
              No Migraine Today
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <MedicationModal
        visible={showMedicationModal}
        planId={planId}
        onClose={() => setShowMedicationModal(false)}
        onSave={async (medication) => {
          await addMedication(medication);
          setShowMedicationModal(false);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  summaryCard: {
    borderRadius: 24,
    borderWidth: 1,
    marginHorizontal: 20,
    marginBottom: 14,
    paddingVertical: 8,
  },
  topMeta: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 12,
  },
  dateTitle: {
    fontSize: 26,
    fontWeight: '700',
  },
  dateSubtitle: {
    fontSize: 13,
    marginTop: 4,
  },
  highlightRow: {
    gap: 10,
    paddingHorizontal: 18,
    paddingBottom: 16,
  },
  highlightCard: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  highlightText: {
    fontSize: 15,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  section: {
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: 16,
    padding: 16,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  addButton: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    flex: 1,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: 14,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
  helperText: {
    fontSize: 13,
    marginTop: 12,
  },
  emptyText: {
    fontSize: 14,
    paddingVertical: 6,
    textAlign: 'center',
  },
  medCard: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 10,
    padding: 12,
  },
  medInfo: {
    flex: 1,
  },
  medTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  medMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  medActions: {
    flexDirection: 'row',
    gap: 8,
  },
  statusButton: {
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 2,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  severityButton: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    flex: 1,
    justifyContent: 'center',
    minHeight: 50,
    paddingHorizontal: 10,
  },
  severityText: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  clearButton: {
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    justifyContent: 'center',
    marginTop: 12,
    minHeight: 50,
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
