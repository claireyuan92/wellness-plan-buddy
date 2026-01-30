import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { useAppStore } from '@/lib/store/app-store';
import { useColors } from '@/hooks/use-colors';

export default function IndexScreen() {
  const { state, isLoading } = useAppStore();
  const colors = useColors();

  useEffect(() => {
    if (isLoading) return;

    // Check if onboarding is completed
    if (!state.profile?.onboardingCompleted) {
      router.replace('/onboarding');
      return;
    }

    // Check if there's an active plan
    if (state.activePlanId) {
      router.replace('/calendar');
      return;
    }

    // Otherwise go to plan selection
    router.replace('/plans');
  }, [isLoading, state.profile, state.activePlanId]);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.background,
      }}
    >
      <ActivityIndicator size="large" color={colors.primary} />
    </View>
  );
}
