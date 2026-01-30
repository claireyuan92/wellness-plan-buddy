import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, TextInput, Switch, Platform } from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { useProfile } from '@/lib/store/app-store';
import { Sex } from '@/lib/types';
import * as Haptics from 'expo-haptics';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

const SEX_OPTIONS: { value: Sex; label: string }[] = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

export default function SettingsModal({ visible, onClose }: SettingsModalProps) {
  const colors = useColors();
  const { profile, updateProfile } = useProfile();

  const [age, setAge] = useState(profile?.age?.toString() || '');
  const [sex, setSex] = useState<Sex>(profile?.sex || 'prefer_not_to_say');
  const [cycleEnabled, setCycleEnabled] = useState(profile?.cycleTrackingEnabled || false);
  const [cycleLength, setCycleLength] = useState(profile?.averageCycleLength?.toString() || '28');
  const [periodLength, setPeriodLength] = useState(profile?.periodLength?.toString() || '5');
  const [medReminders, setMedReminders] = useState(profile?.medicationRemindersEnabled ?? true);
  const [aptReminders, setAptReminders] = useState(profile?.appointmentRemindersEnabled ?? true);

  // Update local state when profile changes
  useEffect(() => {
    if (profile) {
      setAge(profile.age?.toString() || '');
      setSex(profile.sex || 'prefer_not_to_say');
      setCycleEnabled(profile.cycleTrackingEnabled || false);
      setCycleLength(profile.averageCycleLength?.toString() || '28');
      setPeriodLength(profile.periodLength?.toString() || '5');
      setMedReminders(profile.medicationRemindersEnabled ?? true);
      setAptReminders(profile.appointmentRemindersEnabled ?? true);
    }
  }, [profile]);

  const handleSave = async () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    await updateProfile({
      age: parseInt(age, 10) || 0,
      sex,
      cycleTrackingEnabled: cycleEnabled,
      averageCycleLength: parseInt(cycleLength, 10) || 28,
      periodLength: parseInt(periodLength, 10) || 5,
      medicationRemindersEnabled: medReminders,
      appointmentRemindersEnabled: aptReminders,
    });

    onClose();
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
            <Text className="text-2xl font-bold text-foreground mb-6">Settings</Text>

            {/* Profile Section */}
            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text className="text-lg font-semibold text-foreground mb-4">Profile</Text>

              <View className="mb-4">
                <Text className="text-sm text-muted mb-2">Age</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
                  value={age}
                  onChangeText={setAge}
                  keyboardType="number-pad"
                  placeholder="Enter your age"
                  placeholderTextColor={colors.muted}
                />
              </View>

              <View>
                <Text className="text-sm text-muted mb-2">Sex</Text>
                <View className="flex-row flex-wrap gap-2">
                  {SEX_OPTIONS.map((option) => (
                    <TouchableOpacity
                      key={option.value}
                      onPress={() => {
                        if (Platform.OS !== 'web') {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        }
                        setSex(option.value);
                      }}
                      style={[
                        styles.sexButton,
                        {
                          backgroundColor: sex === option.value ? colors.primary : colors.background,
                          borderColor: sex === option.value ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.sexText,
                          { color: sex === option.value ? '#FFFFFF' : colors.foreground },
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>

            {/* Cycle & Fertility Section */}
            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text className="text-lg font-semibold text-foreground mb-4">Cycle & Fertility</Text>

              <View className="flex-row justify-between items-center mb-4">
                <View className="flex-1">
                  <Text className="text-base text-foreground">Enable Cycle Tracking</Text>
                  <Text className="text-sm text-muted">Track periods and fertility</Text>
                </View>
                <Switch
                  value={cycleEnabled}
                  onValueChange={(value) => {
                    if (Platform.OS !== 'web') {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    }
                    setCycleEnabled(value);
                  }}
                  trackColor={{ false: colors.border, true: colors.period }}
                  thumbColor="#FFFFFF"
                />
              </View>

              {cycleEnabled && (
                <>
                  <View className="mb-4">
                    <Text className="text-sm text-muted mb-2">Average Cycle Length (days)</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
                      value={cycleLength}
                      onChangeText={setCycleLength}
                      keyboardType="number-pad"
                      placeholder="28"
                      placeholderTextColor={colors.muted}
                    />
                  </View>

                  <View>
                    <Text className="text-sm text-muted mb-2">Period Length (days)</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
                      value={periodLength}
                      onChangeText={setPeriodLength}
                      keyboardType="number-pad"
                      placeholder="5"
                      placeholderTextColor={colors.muted}
                    />
                  </View>
                </>
              )}
            </View>

            {/* Reminders Section */}
            <View style={[styles.section, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text className="text-lg font-semibold text-foreground mb-4">Reminders</Text>

              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-base text-foreground">Medication Reminders</Text>
                <Switch
                  value={medReminders}
                  onValueChange={(value) => {
                    if (Platform.OS !== 'web') {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    }
                    setMedReminders(value);
                  }}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>

              <View className="flex-row justify-between items-center">
                <Text className="text-base text-foreground">Appointment Reminders</Text>
                <Switch
                  value={aptReminders}
                  onValueChange={(value) => {
                    if (Platform.OS !== 'web') {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    }
                    setAptReminders(value);
                  }}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#FFFFFF"
                />
              </View>
            </View>

            {/* Info Section */}
            <View style={[styles.infoSection, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text className="text-sm text-muted text-center">
                All data is stored locally on your device.{'\n'}
                Your privacy is protected.
              </Text>
            </View>

            {/* Action Buttons */}
            <View className="flex-row gap-3 mt-4">
              <TouchableOpacity
                onPress={onClose}
                style={[styles.button, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}
              >
                <Text style={[styles.buttonText, { color: colors.foreground }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSave}
                style={[styles.button, { backgroundColor: colors.primary, flex: 1 }]}
              >
                <Text style={[styles.buttonText, { color: '#FFFFFF' }]}>Save Changes</Text>
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
  section: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  input: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
  },
  sexButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  sexText: {
    fontSize: 14,
    fontWeight: '500',
  },
  infoSection: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
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
