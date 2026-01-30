import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

export default function WelcomeScreen() {
  const colors = useColors();

  const handleGetStarted = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    router.push('/onboarding/age');
  };

  return (
    <LinearGradient
      colors={[colors.gradientStart, colors.gradientEnd]}
      style={styles.gradient}
    >
      <ScreenContainer className="flex-1 justify-between px-8 py-12">
        <View className="flex-1 justify-center items-center">
          <View className="w-32 h-32 rounded-full bg-surface items-center justify-center mb-8 shadow-lg">
            <Text style={styles.logoEmoji}>🌸</Text>
          </View>
          
          <Text className="text-4xl font-bold text-foreground text-center mb-4">
            Wellness Plan{'\n'}Expert Buddy
          </Text>
          
          <Text className="text-lg text-muted text-center leading-7 px-4">
            Your personal companion for managing wellness goals through thoughtful tracking and expert guidance.
          </Text>
        </View>

        <View className="items-center gap-4">
          <TouchableOpacity
            onPress={handleGetStarted}
            style={[styles.button, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Get Started</Text>
          </TouchableOpacity>
          
          <Text className="text-sm text-muted text-center">
            Your data stays on your device
          </Text>
        </View>
      </ScreenContainer>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  logoEmoji: {
    fontSize: 64,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 30,
    minWidth: 200,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
});
