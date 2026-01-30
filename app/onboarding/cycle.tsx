import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Switch } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useProfile } from '@/lib/store/app-store';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export default function CycleScreen() {
  const colors = useColors();
  const { profile, updateProfile } = useProfile();
  const [enableCycleTracking, setEnableCycleTracking] = useState(
    profile?.cycleTrackingEnabled ?? false
  );

  const handleToggle = (value: boolean) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
    setEnableCycleTracking(value);
  };

  const handleComplete = async () => {
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    await updateProfile({
      cycleTrackingEnabled: enableCycleTracking,
      onboardingCompleted: true,
    });

    router.replace('/plans');
  };

  return (
    <LinearGradient
      colors={[colors.gradientStart, colors.gradientEnd]}
      style={styles.gradient}
    >
      <ScreenContainer className="flex-1 justify-between px-8 py-8" edges={['top', 'left', 'right', 'bottom']}>
        <View className="flex-1 justify-center">
          <View className="items-center mb-8">
            <View style={[styles.iconContainer, { backgroundColor: colors.period }]}>
              <Text style={styles.iconEmoji}>🌙</Text>
            </View>
          </View>

          <Text className="text-3xl font-bold text-foreground text-center mb-4">
            Menstrual Cycle & Fertility Tracking
          </Text>
          
          <Text className="text-base text-muted text-center mb-8 leading-6">
            Track your cycle, predict periods, and monitor fertility windows. This feature is optional and can be changed anytime in Settings.
          </Text>

          <View 
            style={[styles.toggleCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <View className="flex-1">
              <Text className="text-lg font-semibold text-foreground mb-1">
                Enable Cycle Tracking
              </Text>
              <Text className="text-sm text-muted">
                Period predictions & fertility insights
              </Text>
            </View>
            <Switch
              value={enableCycleTracking}
              onValueChange={handleToggle}
              trackColor={{ false: colors.border, true: colors.period }}
              thumbColor="#FFFFFF"
            />
          </View>

          <Text className="text-sm text-muted text-center mt-6 px-4">
            This feature is especially helpful for users planning pregnancy or tracking menstrual health patterns.
          </Text>
        </View>

        <View>
          <TouchableOpacity
            onPress={handleComplete}
            style={[styles.button, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Complete Setup</Text>
          </TouchableOpacity>
        </View>
      </ScreenContainer>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconEmoji: {
    fontSize: 40,
  },
  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 30,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
