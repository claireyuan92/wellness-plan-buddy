import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, TextInput, Platform } from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { Appointment } from '@/lib/types';
import * as Haptics from 'expo-haptics';

interface AppointmentModalProps {
  visible: boolean;
  planId: string;
  date: string;
  onClose: () => void;
  onSave: (appointment: Omit<Appointment, 'id' | 'createdAt'>) => Promise<void>;
}

const APPOINTMENT_TYPES = [
  { value: 'acupuncture', label: 'Acupuncture', emoji: '🪡' },
  { value: 'psychology', label: 'Psychology', emoji: '🧠' },
  { value: 'neurology', label: 'Neurology', emoji: '🏥' },
  { value: 'obgyn', label: 'OB-GYN', emoji: '👩‍⚕️' },
  { value: 'general', label: 'General', emoji: '🩺' },
  { value: 'other', label: 'Other', emoji: '📋' },
];

const DURATION_OPTIONS = [15, 30, 45, 60, 90, 120];

const HOUR_OPTIONS = Array.from({ length: 13 }, (_, i) => i + 7); // 7 AM to 7 PM
const MINUTE_OPTIONS = ['00', '15', '30', '45'];

export default function AppointmentModal({ visible, planId, date, onClose, onSave }: AppointmentModalProps) {
  const colors = useColors();
  const [title, setTitle] = useState('');
  const [type, setType] = useState('general');
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState('00');
  const [duration, setDuration] = useState(30);
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');

  const handleSave = async () => {
    if (!title.trim()) return;

    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    // Construct the start time
    const startTime = `${date}T${hour.toString().padStart(2, '0')}:${minute}:00`;

    await onSave({
      planId,
      title: title.trim(),
      type,
      startTime,
      duration,
      location: location.trim(),
      notes: notes.trim(),
    });

    // Reset form
    setTitle('');
    setType('general');
    setHour(9);
    setMinute('00');
    setDuration(30);
    setLocation('');
    setNotes('');
  };

  const formatHour = (h: number) => {
    const period = h >= 12 ? 'PM' : 'AM';
    const displayHour = h > 12 ? h - 12 : h === 0 ? 12 : h;
    return `${displayHour} ${period}`;
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: colors.background }]}>
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text className="text-2xl font-bold text-foreground mb-6">Add Appointment</Text>

            {/* Title Input */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-foreground mb-2">Title *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
                value={title}
                onChangeText={setTitle}
                placeholder="e.g., Acupuncture Session"
                placeholderTextColor={colors.muted}
              />
            </View>

            {/* Type Selector */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-foreground mb-2">Type</Text>
              <View className="flex-row flex-wrap gap-2">
                {APPOINTMENT_TYPES.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => {
                      if (Platform.OS !== 'web') {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }
                      setType(option.value);
                    }}
                    style={[
                      styles.typeChip,
                      {
                        backgroundColor: type === option.value ? colors.primary : colors.surface,
                        borderColor: type === option.value ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text style={styles.typeEmoji}>{option.emoji}</Text>
                    <Text
                      style={[
                        styles.typeText,
                        { color: type === option.value ? '#FFFFFF' : colors.foreground },
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Time Selector */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-foreground mb-2">Start Time</Text>
              <View className="flex-row gap-4">
                <View className="flex-1">
                  <Text className="text-xs text-muted mb-1">Hour</Text>
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.timeScroll}
                  >
                    {HOUR_OPTIONS.map((h) => (
                      <TouchableOpacity
                        key={h}
                        onPress={() => {
                          if (Platform.OS !== 'web') {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          }
                          setHour(h);
                        }}
                        style={[
                          styles.timeButton,
                          {
                            backgroundColor: hour === h ? colors.primary : colors.surface,
                            borderColor: hour === h ? colors.primary : colors.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.timeText,
                            { color: hour === h ? '#FFFFFF' : colors.foreground },
                          ]}
                        >
                          {formatHour(h)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>
              <View className="mt-2">
                <Text className="text-xs text-muted mb-1">Minutes</Text>
                <View className="flex-row gap-2">
                  {MINUTE_OPTIONS.map((m) => (
                    <TouchableOpacity
                      key={m}
                      onPress={() => {
                        if (Platform.OS !== 'web') {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }
                        setMinute(m);
                      }}
                      style={[
                        styles.minuteButton,
                        {
                          backgroundColor: minute === m ? colors.primary : colors.surface,
                          borderColor: minute === m ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.minuteText,
                          { color: minute === m ? '#FFFFFF' : colors.foreground },
                        ]}
                      >
                        :{m}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* Duration Selector */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-foreground mb-2">Duration</Text>
              <View className="flex-row flex-wrap gap-2">
                {DURATION_OPTIONS.map((d) => (
                  <TouchableOpacity
                    key={d}
                    onPress={() => {
                      if (Platform.OS !== 'web') {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }
                      setDuration(d);
                    }}
                    style={[
                      styles.durationButton,
                      {
                        backgroundColor: duration === d ? colors.primary : colors.surface,
                        borderColor: duration === d ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.durationText,
                        { color: duration === d ? '#FFFFFF' : colors.foreground },
                      ]}
                    >
                      {d} min
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Location Input */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-foreground mb-2">Location</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
                value={location}
                onChangeText={setLocation}
                placeholder="e.g., Wellness Center, 123 Main St"
                placeholderTextColor={colors.muted}
              />
            </View>

            {/* Notes */}
            <View className="mb-6">
              <Text className="text-sm font-medium text-foreground mb-2">Notes</Text>
              <TextInput
                style={[styles.input, styles.textArea, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Any additional notes..."
                placeholderTextColor={colors.muted}
                multiline
                numberOfLines={3}
              />
            </View>

            {/* Action Buttons */}
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={onClose}
                style={[styles.button, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}
              >
                <Text style={[styles.buttonText, { color: colors.foreground }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                disabled={!title.trim()}
                style={[
                  styles.button,
                  {
                    backgroundColor: title.trim() ? colors.primary : `${colors.primary}55`,
                    flex: 1,
                    opacity: title.trim() ? 1 : 0.7,
                  },
                ]}
              >
                <Text style={[styles.buttonText, { color: '#FFFFFF', opacity: title.trim() ? 1 : 0.75 }]}>
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  input: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 4,
  },
  typeEmoji: {
    fontSize: 14,
  },
  typeText: {
    fontSize: 13,
    fontWeight: '500',
  },
  timeScroll: {
    gap: 8,
  },
  timeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  timeText: {
    fontSize: 13,
    fontWeight: '500',
  },
  minuteButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  minuteText: {
    fontSize: 14,
    fontWeight: '500',
  },
  durationButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  durationText: {
    fontSize: 14,
    fontWeight: '500',
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
