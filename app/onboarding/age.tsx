import { useState } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { useProfile } from '@/lib/store/app-store';
import * as Haptics from 'expo-haptics';

export default function AgeScreen() {
  const colors = useColors();
  const { profile, updateProfile } = useProfile();
  const [age, setAge] = useState(profile?.age?.toString() || '');

  const handleNext = async () => {
    const ageNum = parseInt(age, 10);
    if (isNaN(ageNum) || ageNum < 13 || ageNum > 120) {
      return;
    }

    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    await updateProfile({ age: ageNum });
    router.push('/onboarding/sex');
  };

  const isValid = () => {
    const ageNum = parseInt(age, 10);
    return !isNaN(ageNum) && ageNum >= 13 && ageNum <= 120;
  };
  const canContinue = isValid();

  return (
    <LinearGradient
      colors={[colors.gradientStart, colors.gradientEnd]}
      style={styles.gradient}
    >
      <ScreenContainer className="flex-1" edges={['top', 'left', 'right', 'bottom']}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.container}
        >
          <View className="flex-1 justify-center px-8">
            <Text className="text-3xl font-bold text-foreground text-center mb-4">
              How old are you?
            </Text>
            
            <Text className="text-base text-muted text-center mb-8">
              This helps us personalize your wellness tracking experience.
            </Text>

            <View className="items-center mb-8">
              <TextInput
                style={[styles.input, { 
                  backgroundColor: colors.surface,
                  color: colors.foreground,
                  borderColor: colors.border,
                }]}
                value={age}
                onChangeText={setAge}
                keyboardType="number-pad"
                placeholder="Enter your age"
                placeholderTextColor={colors.muted}
                maxLength={3}
                returnKeyType="done"
                onSubmitEditing={handleNext}
              />
            </View>
          </View>

          <View className="px-8 pb-8">
            <TouchableOpacity
              onPress={handleNext}
              disabled={!canContinue}
              style={[
                styles.button,
                {
                  backgroundColor: canContinue ? colors.primary : `${colors.primary}55`,
                  opacity: canContinue ? 1 : 0.7,
                }
              ]}
              activeOpacity={0.8}
            >
              <Text style={[styles.buttonText, { opacity: canContinue ? 1 : 0.75 }]}>
                Continue
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
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
  },
  input: {
    width: '100%',
    maxWidth: 200,
    fontSize: 32,
    fontWeight: '600',
    textAlign: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    borderWidth: 2,
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
