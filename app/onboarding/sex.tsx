import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useProfile } from '@/lib/store/app-store';
import { Sex } from '@/lib/types';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const SEX_OPTIONS: { value: Sex; label: string; emoji: string }[] = [
  { value: 'female', label: 'Female', emoji: '👩' },
  { value: 'male', label: 'Male', emoji: '👨' },
  { value: 'other', label: 'Other', emoji: '🧑' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say', emoji: '🤐' },
];

export default function SexScreen() {
  const colors = useColors();
  const { profile, updateProfile } = useProfile();
  const [selectedSex, setSelectedSex] = useState<Sex | null>(profile?.sex || null);

  const handleSelect = (sex: Sex) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setSelectedSex(sex);
  };

  const handleNext = async () => {
    if (!selectedSex) return;

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    await updateProfile({ sex: selectedSex });
    router.push('/onboarding/cycle');
  };

  return (
    <LinearGradient
      colors={[colors.gradientStart, colors.gradientEnd]}
      style={styles.gradient}
    >
      <ScreenContainer className="flex-1 justify-between px-8 py-8" edges={['top', 'left', 'right', 'bottom']}>
        <View className="flex-1 justify-center">
          <Text className="text-3xl font-bold text-foreground text-center mb-4">
            What is your sex?
          </Text>
          
          <Text className="text-base text-muted text-center mb-8">
            This helps us provide relevant health tracking options.
          </Text>

          <View className="gap-3">
            {SEX_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                onPress={() => handleSelect(option.value)}
                style={[
                  styles.optionButton,
                  {
                    backgroundColor: selectedSex === option.value ? colors.primary : colors.surface,
                    borderColor: selectedSex === option.value ? colors.primary : colors.border,
                  },
                ]}
                activeOpacity={0.7}
              >
                <Text style={styles.emoji}>{option.emoji}</Text>
                <Text
                  style={[
                    styles.optionText,
                    { color: selectedSex === option.value ? '#FFFFFF' : colors.foreground },
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View>
          <TouchableOpacity
            onPress={handleNext}
            disabled={!selectedSex}
            style={[
              styles.button,
              { backgroundColor: selectedSex ? colors.primary : colors.border }
            ]}
            activeOpacity={0.8}
          >
            <Text style={[styles.buttonText, { opacity: selectedSex ? 1 : 0.5 }]}>
              Continue
            </Text>
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
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 2,
  },
  emoji: {
    fontSize: 24,
    marginRight: 12,
  },
  optionText: {
    fontSize: 18,
    fontWeight: '500',
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
