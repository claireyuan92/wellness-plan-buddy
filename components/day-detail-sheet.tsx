import { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, Platform, LayoutAnimation, UIManager } from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { useAppStore, useDailyLogs, useMedications, useAppointments } from '@/lib/store/app-store';
import { DailyLog, generateId, Medication, Appointment, MedicationStatus } from '@/lib/types';
import { getDateFertilityInfoFromLogs, getUpcomingFertilityForecast } from '@/lib/utils/fertility';
import * as Haptics from 'expo-haptics';
import MedicationModal from './medication-modal';
import AppointmentModal from './appointment-modal';

interface DayDetailSheetProps {
  visible: boolean;
  date: string;
  planId: string;
  onClose: () => void;
}

const MIGRAINE_LEVELS = [
  { value: 3, label: 'Mild' },
  { value: 6, label: 'Moderate' },
  { value: 9, label: 'Severe' },
] as const;

export default function DayDetailSheet({ visible, date, planId, onClose }: DayDetailSheetProps) {
  const colors = useColors();
  const { state } = useAppStore();
  const { logs, upsertDailyLog, getDailyLog } = useDailyLogs(planId);
  const { medications, upsertMedicationLog, getMedicationLog, addMedication, deleteMedication } = useMedications(planId);
  const { appointments, getAppointmentsForDate, addAppointment, deleteAppointment } = useAppointments(planId);

  const [showMedicationModal, setShowMedicationModal] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  // Local state for the form
  const [log, setLog] = useState<DailyLog>({
    id: '',
    planId: '',
    date: '',
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
  });

  // Load existing log when date changes
  useEffect(() => {
    if (date && planId) {
      const existingLog = getDailyLog(planId, date);
      if (existingLog) {
        setLog(existingLog);
      } else {
        setLog({
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
        });
      }
    }
  }, [date, planId, getDailyLog]);

  const fertilityInfo = useMemo(() => {
    if (!state.profile?.cycleTrackingEnabled || !date) return null;
    return getDateFertilityInfoFromLogs(
      date,
      logs,
      state.profile.averageCycleLength,
      state.profile.periodLength
    );
  }, [date, logs, state.profile]);
  const fertilityForecast = useMemo(() => {
    if (!state.profile?.cycleTrackingEnabled || !date) return null;
    return getUpcomingFertilityForecast(
      logs,
      state.profile.averageCycleLength,
      state.profile.periodLength,
      date
    );
  }, [date, logs, state.profile]);

  // Get medications and appointments for this date
  const supplements = useMemo(
    () => medications.filter((medication) => medication.type === 'supplement'),
    [medications]
  );
  const medicationsOnly = useMemo(
    () => medications.filter((medication) => medication.type !== 'supplement'),
    [medications]
  );
  const dayAppointments = useMemo(() => getAppointmentsForDate(planId, date), [planId, date, getAppointmentsForDate]);

  const handleSave = async () => {
    await upsertDailyLog(log);
  };

  const handleFieldChange = async <K extends keyof DailyLog>(field: K, value: DailyLog[K]) => {
    setLog((prev) => {
      const newLog = { ...prev, [field]: value } as DailyLog;
      // Auto-save after a short delay
      setTimeout(() => upsertDailyLog(newLog), 300);
      return newLog;
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

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  };

  const formatTime = (timeStr: string) => {
    const d = new Date(timeStr);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };
  const formatScheduleTime = (value: string) => {
    const [hours, minutes] = value.split(':').map(Number);
    const dateValue = new Date();
    dateValue.setHours(hours, minutes, 0, 0);
    return dateValue.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };
  const formatShortDate = (value: string) =>
    new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const renderMedicationSection = (title: string, items: Medication[], emptyMessage: string) => (
    <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View className="flex-row justify-between items-center mb-4">
        <Text className="text-lg font-semibold text-foreground">{title}</Text>
        <TouchableOpacity
          onPress={() => {
            if (Platform.OS !== 'web') {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }
            setShowMedicationModal(true);
          }}
          style={[styles.addButton, { backgroundColor: colors.primary }]}
        >
          <Text style={styles.addButtonText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {items.length === 0 ? (
        <Text className="text-sm text-muted text-center py-4">{emptyMessage}</Text>
      ) : (
        items.flatMap((med) => {
          const doseTimes = med.scheduleTimes.length > 0 ? med.scheduleTimes : [null];
          return doseTimes.map((scheduledTime) => {
            const medLog = getMedicationLog(med.id, date, scheduledTime);
            return (
              <View
                key={`${med.id}-${scheduledTime ?? 'as-needed'}`}
                style={[styles.medCard, { backgroundColor: colors.background, borderColor: colors.border }]}
              >
                <View className="flex-1">
                  <Text className="text-base font-medium text-foreground">{med.name}</Text>
                  <Text className="text-sm text-muted">{med.dosage}</Text>
                  <Text className="text-xs text-muted">
                    {scheduledTime ? formatScheduleTime(scheduledTime) : 'As needed'}
                  </Text>
                </View>
                <View className="flex-row gap-2">
                  <TouchableOpacity
                    onPress={() => handleMedicationStatus(med.id, scheduledTime, 'taken')}
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
                    onPress={() => handleMedicationStatus(med.id, scheduledTime, 'skipped')}
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

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.background }]}>
          {/* Handle bar */}
          <View style={styles.handleContainer}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
          </View>

          {/* Header */}
          <View className="flex-row justify-between items-center px-6 pb-4">
            <Text className="text-xl font-bold text-foreground">{formatDate(date)}</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={[styles.closeButton, { color: colors.primary }]}>Done</Text>
            </TouchableOpacity>
          </View>

          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {renderMedicationSection('Supplements', supplements, 'No supplements scheduled.')}

            {renderMedicationSection('Medication', medicationsOnly, 'No medication scheduled.')}

            {/* Migraine Status */}
            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text className="text-lg font-semibold text-foreground mb-4">Migraine Status</Text>
              <View className="flex-row gap-3">
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
                    >
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.severityButtonText,
                          { color: isSelected ? '#FFFFFF' : colors.foreground },
                        ]}
                      >
                        {level.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TouchableOpacity
                onPress={() => {
                  if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                  handleFieldChange('migraineOccurred', false);
                }}
                style={[
                  styles.clearStatusButton,
                  { backgroundColor: !log.migraineOccurred ? colors.primary : colors.background, borderColor: !log.migraineOccurred ? colors.primary : colors.border },
                ]}
              >
                <Text style={[styles.clearStatusButtonText, { color: !log.migraineOccurred ? '#FFFFFF' : colors.foreground }]}>
                  No Migraine Today
                </Text>
              </TouchableOpacity>
            </View>

            {/* Cycle Summary */}
            {state.profile?.cycleTrackingEnabled && (
              <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {(fertilityInfo || fertilityForecast) && (
                  <View style={[styles.fertilityInfo, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <Text className="text-sm font-medium text-foreground mb-1">
                      {fertilityInfo ? `Cycle Day ${fertilityInfo.cycleDay}` : 'Cycle forecast'}
                    </Text>
                    {fertilityInfo?.isOvulationDay && (
                      <Text style={[styles.fertilityBadge, { backgroundColor: colors.ovulation }]}>
                        🥚 Predicted Ovulation Day
                      </Text>
                    )}
                    {fertilityInfo?.isFertileDay && !fertilityInfo.isOvulationDay && (
                      <Text style={[styles.fertilityBadge, { backgroundColor: colors.fertility }]}>
                        ✨ High Fertility Window
                      </Text>
                    )}
                    {fertilityForecast && (
                      <View className="mt-3 gap-2">
                        <Text className="text-sm text-foreground">
                          Period start: {formatShortDate(fertilityForecast.anchorPeriodStart)}
                        </Text>
                        <Text className="text-sm text-foreground">
                          Predicted ovulation: {formatShortDate(fertilityForecast.ovulationDate)}
                        </Text>
                        <Text className="text-sm text-foreground">
                          Fertility window: {formatShortDate(fertilityForecast.fertilityWindowStart)} - {formatShortDate(fertilityForecast.fertilityWindowEnd)}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}

            {/* Appointments Section */}
            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-lg font-semibold text-foreground">Appointments</Text>
                <TouchableOpacity
                  onPress={() => {
                    if (Platform.OS !== 'web') {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                    setShowAppointmentModal(true);
                  }}
                  style={[styles.addButton, { backgroundColor: colors.primary }]}
                >
                  <Text style={styles.addButtonText}>+ Add</Text>
                </TouchableOpacity>
              </View>

              {dayAppointments.length === 0 ? (
                <Text className="text-sm text-muted text-center py-4">
                  No appointments for this day.
                </Text>
              ) : (
                dayAppointments.map((apt) => (
                  <View key={apt.id} style={[styles.aptCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                    <View style={[styles.aptTime, { backgroundColor: colors.warning }]}>
                      <Text style={styles.aptTimeText}>{formatTime(apt.startTime)}</Text>
                    </View>
                    <View className="flex-1 ml-3">
                      <Text className="text-base font-medium text-foreground">{apt.title}</Text>
                      {apt.location && <Text className="text-sm text-muted">{apt.location}</Text>}
                      <Text className="text-xs text-muted">{apt.duration} min</Text>
                    </View>
                  </View>
                ))
              )}
            </View>

            {/* Bottom padding */}
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </View>

      {/* Medication Modal */}
      <MedicationModal
        visible={showMedicationModal}
        planId={planId}
        onClose={() => setShowMedicationModal(false)}
        onSave={async (med) => {
          await addMedication(med);
          setShowMedicationModal(false);
        }}
      />

      {/* Appointment Modal */}
      <AppointmentModal
        visible={showAppointmentModal}
        planId={planId}
        date={date}
        onClose={() => setShowAppointmentModal(false)}
        onSave={async (apt) => {
          await addAppointment(apt);
          setShowAppointmentModal(false);
        }}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
  closeButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: 16,
  },
  section: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  sectionEmoji: {
    fontSize: 20,
  },
  intensityButton: {
    flex: 1,
    height: 24,
    borderRadius: 4,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  moodButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  moodEmoji: {
    fontSize: 24,
  },
  notesInput: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  flowButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  flowText: {
    fontSize: 14,
    fontWeight: '500',
  },
  fertilityInfo: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  fertilityBadge: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    overflow: 'hidden',
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  addButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  medCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  statusButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  severityButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    paddingHorizontal: 12,
  },
  severityButtonText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  clearStatusButton: {
    marginTop: 12,
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    paddingHorizontal: 16,
  },
  clearStatusButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  aptCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  aptTime: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  aptTimeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
});
