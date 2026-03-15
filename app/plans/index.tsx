import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Modal, TextInput, ScrollView, Platform } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { ScreenContainer } from '@/components/screen-container';
import { useColors } from '@/hooks/use-colors';
import { usePlans, useAppStore } from '@/lib/store/app-store';
import { TreatmentPlan, generateId } from '@/lib/types';
import { DEMO_PLAN, DEMO_MEDICATIONS, DEMO_DAILY_LOGS, DEMO_MEDICATION_LOGS, DEMO_APPOINTMENTS } from '@/lib/data/demo-data';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function PlansScreen() {
  const colors = useColors();
  const { plans, addPlan, setActivePlan } = usePlans();
  const { state } = useAppStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlan, setNewPlan] = useState({
    name: '',
    healthGoal: '',
    duration: 3,
    notes: '',
  });

  // Load demo data if no plans exist
  useEffect(() => {
    const loadDemoData = async () => {
      if (plans.length === 0 && state.profile?.onboardingCompleted) {
        // Check if demo data was already loaded
        const demoLoaded = await AsyncStorage.getItem('@demo_data_loaded');
        if (!demoLoaded) {
          // Add demo plan
          await AsyncStorage.setItem('@wellness_plans', JSON.stringify([DEMO_PLAN]));
          await AsyncStorage.setItem('@wellness_medications', JSON.stringify(DEMO_MEDICATIONS));
          await AsyncStorage.setItem('@wellness_daily_logs', JSON.stringify(DEMO_DAILY_LOGS));
          await AsyncStorage.setItem('@wellness_medication_logs', JSON.stringify(DEMO_MEDICATION_LOGS));
          await AsyncStorage.setItem('@wellness_appointments', JSON.stringify(DEMO_APPOINTMENTS));
          await AsyncStorage.setItem('@demo_data_loaded', 'true');
          // Reload the page to pick up demo data
          router.replace('/plans');
        }
      }
    };
    loadDemoData();
  }, [plans.length, state.profile?.onboardingCompleted]);

  const handleSelectPlan = async (planId: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await setActivePlan(planId);
    router.replace('/calendar');
  };

  const handleCreatePlan = async () => {
    if (!newPlan.name.trim()) return;

    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    const plan = await addPlan({
      name: newPlan.name,
      healthGoal: newPlan.healthGoal,
      duration: newPlan.duration,
      startDate: new Date().toISOString().split('T')[0],
      notes: newPlan.notes,
      templateType: 'migraine_fertility',
    });

    setShowCreateModal(false);
    setNewPlan({ name: '', healthGoal: '', duration: 3, notes: '' });
    await setActivePlan(plan.id);
    router.replace('/calendar');
  };

  const getDaysRemaining = (plan: TreatmentPlan) => {
    const endDate = new Date(plan.startDate);
    endDate.setMonth(endDate.getMonth() + plan.duration);
    const today = new Date();
    const diff = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  };

  const renderPlanCard = ({ item }: { item: TreatmentPlan }) => {
    const daysRemaining = getDaysRemaining(item);
    const progress = Math.min(100, Math.max(0, 100 - (daysRemaining / (item.duration * 30)) * 100));

    return (
      <TouchableOpacity
        onPress={() => handleSelectPlan(item.id)}
        style={[styles.planCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
        activeOpacity={0.7}
      >
        <View className="flex-row justify-between items-start mb-2">
          <Text className="text-lg font-semibold text-foreground flex-1" numberOfLines={1}>
            {item.name}
          </Text>
          <View style={[styles.badge, { backgroundColor: colors.period }]}>
            <Text style={styles.badgeText}>{item.duration}mo</Text>
          </View>
        </View>
        
        {item.healthGoal ? (
          <Text className="text-sm text-muted mb-3" numberOfLines={2}>
            {item.healthGoal}
          </Text>
        ) : null}

        <View className="mb-2">
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <View 
              style={[
                styles.progressFill, 
                { backgroundColor: colors.primary, width: `${progress}%` }
              ]} 
            />
          </View>
        </View>

        <Text className="text-xs text-muted">
          {daysRemaining > 0 ? `${daysRemaining} days remaining` : 'Plan completed'}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <LinearGradient
      colors={[colors.gradientStart, colors.gradientEnd]}
      style={styles.gradient}
    >
      <ScreenContainer className="flex-1" edges={['top', 'left', 'right', 'bottom']}>
        <View className="px-6 py-4">
          <Text className="text-3xl font-bold text-foreground mb-2">
            Treatment Plans
          </Text>
          <Text className="text-base text-muted">
            Select a plan or create a new one
          </Text>
        </View>

        <FlatList
          data={plans}
          keyExtractor={(item) => item.id}
          renderItem={renderPlanCard}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View className="items-center py-12">
              <Text style={styles.emptyEmoji}>📋</Text>
              <Text className="text-lg font-semibold text-foreground mb-2">
                No Plans Yet
              </Text>
              <Text className="text-sm text-muted text-center px-8">
                Create your first treatment plan to start tracking your wellness journey.
              </Text>
            </View>
          }
        />

        <View className="px-6 pb-6">
          <TouchableOpacity
            onPress={() => {
              if (Platform.OS !== 'web') {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }
              setShowCreateModal(true);
            }}
            style={[styles.createButton, { backgroundColor: colors.primary }]}
            activeOpacity={0.8}
          >
            <Text style={styles.createButtonText}>+ Create New Plan</Text>
          </TouchableOpacity>
        </View>

        {/* Create Plan Modal */}
        <Modal
          visible={showCreateModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowCreateModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text className="text-2xl font-bold text-foreground mb-6">
                  Create Treatment Plan
                </Text>

                <View className="mb-4">
                  <Text className="text-sm font-medium text-foreground mb-2">Plan Name *</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
                    value={newPlan.name}
                    onChangeText={(text) => setNewPlan({ ...newPlan, name: text })}
                    placeholder="e.g., Migraine & Fertility Wellness"
                    placeholderTextColor={colors.muted}
                  />
                </View>

                <View className="mb-4">
                  <Text className="text-sm font-medium text-foreground mb-2">Health Goal</Text>
                  <TextInput
                    style={[styles.input, styles.textArea, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
                    value={newPlan.healthGoal}
                    onChangeText={(text) => setNewPlan({ ...newPlan, healthGoal: text })}
                    placeholder="What do you want to achieve?"
                    placeholderTextColor={colors.muted}
                    multiline
                    numberOfLines={3}
                  />
                </View>

                <View className="mb-4">
                  <Text className="text-sm font-medium text-foreground mb-2">Duration</Text>
                  <View className="flex-row gap-2">
                    {[3, 4, 5, 6].map((months) => (
                      <TouchableOpacity
                        key={months}
                        onPress={() => setNewPlan({ ...newPlan, duration: months })}
                        style={[
                          styles.durationButton,
                          {
                            backgroundColor: newPlan.duration === months ? colors.primary : colors.surface,
                            borderColor: newPlan.duration === months ? colors.primary : colors.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.durationText,
                            { color: newPlan.duration === months ? '#FFFFFF' : colors.foreground },
                          ]}
                        >
                          {months} mo
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View className="mb-6">
                  <Text className="text-sm font-medium text-foreground mb-2">Notes</Text>
                  <TextInput
                    style={[styles.input, styles.textArea, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
                    value={newPlan.notes}
                    onChangeText={(text) => setNewPlan({ ...newPlan, notes: text })}
                    placeholder="Any additional notes..."
                    placeholderTextColor={colors.muted}
                    multiline
                    numberOfLines={3}
                  />
                </View>

                <View style={[styles.templateInfo, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <Text className="text-sm font-medium text-foreground mb-1">
                    📋 Template: Migraine + Menstrual Cycle / Fertility
                  </Text>
                  <Text className="text-xs text-muted">
                    Includes migraine tracking, mood, sleep, stress, cycle tracking, medications, and appointments.
                  </Text>
                </View>

                <View className="flex-row gap-3 mt-6">
                  <TouchableOpacity
                    onPress={() => setShowCreateModal(false)}
                    style={[styles.modalButton, { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1 }]}
                  >
                    <Text style={[styles.modalButtonText, { color: colors.foreground }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleCreatePlan}
                    disabled={!newPlan.name.trim()}
                    style={[
                      styles.modalButton,
                      {
                        backgroundColor: newPlan.name.trim() ? colors.primary : `${colors.primary}55`,
                        flex: 1,
                        opacity: newPlan.name.trim() ? 1 : 0.7,
                      },
                    ]}
                  >
                    <Text style={[styles.modalButtonText, { color: '#FFFFFF', opacity: newPlan.name.trim() ? 1 : 0.75 }]}>
                      Create Plan
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      </ScreenContainer>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  planCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 16,
  },
  createButton: {
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
  },
  createButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
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
  durationButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  durationText: {
    fontSize: 14,
    fontWeight: '600',
  },
  templateInfo: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  modalButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
