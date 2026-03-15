import { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, TextInput, Switch, Platform, LayoutAnimation, UIManager } from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { useAppStore, useDailyLogs, useMedications, useAppointments } from '@/lib/store/app-store';
import { DailyLog, generateId, MIGRAINE_SYMPTOMS, MigraineSymptom, Mood, FlowLevel, Medication, Appointment } from '@/lib/types';
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

const MOOD_OPTIONS: { value: Mood; emoji: string; label: string }[] = [
  { value: 'great', emoji: '😄', label: 'Great' },
  { value: 'good', emoji: '🙂', label: 'Good' },
  { value: 'okay', emoji: '😐', label: 'Okay' },
  { value: 'bad', emoji: '😔', label: 'Bad' },
  { value: 'terrible', emoji: '😢', label: 'Terrible' },
];

const FLOW_OPTIONS: { value: FlowLevel; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'medium', label: 'Medium' },
  { value: 'heavy', label: 'Heavy' },
];

const SYMPTOM_LABELS: Record<MigraineSymptom, string> = {
  nausea: 'Nausea',
  aura: 'Aura',
  light_sensitivity: 'Light Sensitivity',
  sound_sensitivity: 'Sound Sensitivity',
  dizziness: 'Dizziness',
  neck_pain: 'Neck Pain',
  fatigue: 'Fatigue',
  other: 'Other',
};

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
  const dayMedications = medications;
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

  const handleCycleToggle = (field: 'periodStarted' | 'periodEnded', value: boolean) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    if (field === 'periodStarted') {
      handleFieldChange('periodStarted', value);
      if (value) {
        handleFieldChange('periodEnded', false);
        if (!log.flowLevel) {
          handleFieldChange('flowLevel', 'medium');
        }
      }
      return;
    }

    handleFieldChange('periodEnded', value);
    if (value) {
      handleFieldChange('periodStarted', false);
    }
  };

  const handleSymptomToggle = (symptom: MigraineSymptom) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    const newSymptoms = log.symptoms.includes(symptom)
      ? log.symptoms.filter(s => s !== symptom)
      : [...log.symptoms, symptom];
    handleFieldChange('symptoms', newSymptoms);
  };

  const handleMedicationStatus = async (medicationId: string, status: 'taken' | 'skipped') => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    await upsertMedicationLog({
      id: generateId(),
      medicationId,
      date,
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
  const formatShortDate = (value: string) =>
    new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

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
            {/* Symptoms & Wellness Section */}
            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text className="text-lg font-semibold text-foreground mb-4">Symptoms & Wellness</Text>

              {/* Migraine Toggle */}
              <View className="flex-row justify-between items-center mb-4">
                <View className="flex-row items-center">
                  <Text style={styles.sectionEmoji}>🤕</Text>
                  <Text className="text-base text-foreground ml-2">Migraine</Text>
                </View>
                <Switch
                  value={log.migraineOccurred}
                  onValueChange={(value) => {
                    if (Platform.OS !== 'web') {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    }
                    handleFieldChange('migraineOccurred', value);
                  }}
                  trackColor={{ false: colors.border, true: colors.migraine }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {/* Migraine Intensity */}
              {log.migraineOccurred && (
                <View className="mb-4">
                  <Text className="text-sm text-muted mb-2">Intensity: {log.migraineIntensity}/10</Text>
                  <View className="flex-row gap-1">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                      <TouchableOpacity
                        key={num}
                        onPress={() => handleFieldChange('migraineIntensity', num)}
                        style={[
                          styles.intensityButton,
                          {
                            backgroundColor: num <= log.migraineIntensity ? colors.migraine : colors.border,
                          },
                        ]}
                      />
                    ))}
                  </View>
                </View>
              )}

              {/* Symptom Chips */}
              {log.migraineOccurred && (
                <View className="mb-4">
                  <Text className="text-sm text-muted mb-2">Symptoms</Text>
                  <View className="flex-row flex-wrap gap-2">
                    {MIGRAINE_SYMPTOMS.map((symptom) => (
                      <TouchableOpacity
                        key={symptom}
                        onPress={() => handleSymptomToggle(symptom)}
                        style={[
                          styles.chip,
                          {
                            backgroundColor: log.symptoms.includes(symptom) ? colors.primary : colors.background,
                            borderColor: log.symptoms.includes(symptom) ? colors.primary : colors.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            { color: log.symptoms.includes(symptom) ? '#FFFFFF' : colors.foreground },
                          ]}
                        >
                          {SYMPTOM_LABELS[symptom]}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Mood Selector */}
              <View className="mb-4">
                <Text className="text-sm text-muted mb-2">Mood</Text>
                <View className="flex-row justify-between">
                  {MOOD_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      onPress={() => {
                        if (Platform.OS !== 'web') {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }
                        handleFieldChange('mood', log.mood === option.value ? null : option.value);
                      }}
                      style={[
                        styles.moodButton,
                        {
                          backgroundColor: log.mood === option.value ? colors.primary : colors.background,
                          borderColor: log.mood === option.value ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Text style={styles.moodEmoji}>{option.emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Sleep Quality */}
              <View className="mb-4">
                <Text className="text-sm text-muted mb-2">
                  Sleep Quality: {log.sleepQuality !== null ? `${log.sleepQuality}/10` : 'Not logged'}
                </Text>
                <View className="flex-row gap-1">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <TouchableOpacity
                      key={num}
                      onPress={() => handleFieldChange('sleepQuality', num)}
                      style={[
                        styles.intensityButton,
                        {
                          backgroundColor: log.sleepQuality !== null && num <= log.sleepQuality ? colors.success : colors.border,
                        },
                      ]}
                    />
                  ))}
                </View>
              </View>

              {/* Stress Level */}
              <View className="mb-4">
                <Text className="text-sm text-muted mb-2">
                  Stress Level: {log.stressLevel !== null ? `${log.stressLevel}/10` : 'Not logged'}
                </Text>
                <View className="flex-row gap-1">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                    <TouchableOpacity
                      key={num}
                      onPress={() => handleFieldChange('stressLevel', num)}
                      style={[
                        styles.intensityButton,
                        {
                          backgroundColor: log.stressLevel !== null && num <= log.stressLevel ? colors.warning : colors.border,
                        },
                      ]}
                    />
                  ))}
                </View>
              </View>

              {/* Notes */}
              <View>
                <Text className="text-sm text-muted mb-2">Notes</Text>
                <TextInput
                  style={[styles.notesInput, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
                  value={log.notes}
                  onChangeText={(text) => handleFieldChange('notes', text)}
                  placeholder="Add notes..."
                  placeholderTextColor={colors.muted}
                  multiline
                  numberOfLines={3}
                />
              </View>
            </View>

            {/* Cycle & Fertility Section */}
            {state.profile?.cycleTrackingEnabled && (
              <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text className="text-lg font-semibold text-foreground mb-4">Cycle & Fertility</Text>

                {/* Period Toggle */}
                <View className="flex-row justify-between items-center mb-4">
                  <View className="flex-row items-center">
                    <Text style={styles.sectionEmoji}>🩸</Text>
                    <Text className="text-base text-foreground ml-2">Period Started</Text>
                  </View>
                  <Switch
                    value={log.periodStarted}
                    onValueChange={(value) => handleCycleToggle('periodStarted', value)}
                    trackColor={{ false: colors.border, true: colors.period }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                {/* Period End Toggle */}
                <View className="flex-row justify-between items-center mb-4">
                  <View className="flex-row items-center">
                    <Text style={styles.sectionEmoji}>✓</Text>
                    <Text className="text-base text-foreground ml-2">Period Ended</Text>
                  </View>
                  <Switch
                    value={log.periodEnded}
                    onValueChange={(value) => handleCycleToggle('periodEnded', value)}
                    trackColor={{ false: colors.border, true: colors.period }}
                    thumbColor="#FFFFFF"
                  />
                </View>

                {/* Flow Level */}
                {(log.periodStarted || log.flowLevel) && (
                  <View className="mb-4">
                    <Text className="text-sm text-muted mb-2">Flow Level</Text>
                    <View className="flex-row gap-2">
                      {FLOW_OPTIONS.map((option) => (
                        <TouchableOpacity
                          key={option.value}
                          onPress={() => {
                            if (Platform.OS !== 'web') {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            }
                            handleFieldChange('flowLevel', log.flowLevel === option.value ? null : option.value);
                          }}
                          style={[
                            styles.flowButton,
                            {
                              backgroundColor: log.flowLevel === option.value ? colors.period : colors.background,
                              borderColor: log.flowLevel === option.value ? colors.period : colors.border,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.flowText,
                              { color: log.flowLevel === option.value ? '#FFFFFF' : colors.foreground },
                            ]}
                          >
                            {option.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {/* Fertility Info */}
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

            {/* Medications & Supplements Section */}
            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-lg font-semibold text-foreground">Medications & Supplements</Text>
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

              {dayMedications.length === 0 ? (
                <Text className="text-sm text-muted text-center py-4">
                  No medications scheduled. Tap + Add to create one.
                </Text>
              ) : (
                dayMedications.map((med) => {
                  const medLog = getMedicationLog(med.id, date);
                  return (
                    <View key={med.id} style={[styles.medCard, { backgroundColor: colors.background, borderColor: colors.border }]}>
                      <View className="flex-1">
                        <Text className="text-base font-medium text-foreground">{med.name}</Text>
                        <Text className="text-sm text-muted">{med.dosage}</Text>
                        {med.scheduleTimes.length > 0 && (
                          <Text className="text-xs text-muted">{med.scheduleTimes.join(', ')}</Text>
                        )}
                      </View>
                      <View className="flex-row gap-2">
                        <TouchableOpacity
                          onPress={() => handleMedicationStatus(med.id, 'taken')}
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
                          onPress={() => handleMedicationStatus(med.id, 'skipped')}
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
                })
              )}
            </View>

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
