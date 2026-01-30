import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, TextInput, Switch, FlatList, Platform } from 'react-native';
import { useColors } from '@/hooks/use-colors';
import { Medication, MedicationType } from '@/lib/types';
import { ISOTONIX_PRODUCTS, searchIsotonixProducts } from '@/lib/data/isotonix-products';
import * as Haptics from 'expo-haptics';

interface MedicationModalProps {
  visible: boolean;
  planId: string;
  onClose: () => void;
  onSave: (medication: Omit<Medication, 'id' | 'createdAt'>) => Promise<void>;
}

const TYPE_OPTIONS: { value: MedicationType; label: string; emoji: string }[] = [
  { value: 'supplement', label: 'Supplement', emoji: '💊' },
  { value: 'prescription', label: 'Prescription', emoji: '💉' },
  { value: 'otc', label: 'OTC', emoji: '🩹' },
];

const TIME_OPTIONS = [
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00', '22:00',
];

export default function MedicationModal({ visible, planId, onClose, onSave }: MedicationModalProps) {
  const colors = useColors();
  const [type, setType] = useState<MedicationType>('supplement');
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [scheduleTimes, setScheduleTimes] = useState<string[]>([]);
  const [reminderEnabled, setReminderEnabled] = useState(true);
  const [notes, setNotes] = useState('');
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProducts = searchQuery.length > 0 
    ? searchIsotonixProducts(searchQuery)
    : ISOTONIX_PRODUCTS;

  const handleSave = async () => {
    if (!name.trim()) return;

    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    await onSave({
      planId,
      type,
      name: name.trim(),
      dosage: dosage.trim(),
      scheduleTimes,
      reminderEnabled,
      notes: notes.trim(),
    });

    // Reset form
    setType('supplement');
    setName('');
    setDosage('');
    setScheduleTimes([]);
    setReminderEnabled(true);
    setNotes('');
  };

  const handleTimeToggle = (time: string) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    if (scheduleTimes.includes(time)) {
      setScheduleTimes(scheduleTimes.filter(t => t !== time));
    } else {
      setScheduleTimes([...scheduleTimes, time].sort());
    }
  };

  const handleSelectProduct = (productName: string) => {
    setName(productName);
    setShowProductSearch(false);
    setSearchQuery('');
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
            <Text className="text-2xl font-bold text-foreground mb-6">Add Medication</Text>

            {/* Type Selector */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-foreground mb-2">Type</Text>
              <View className="flex-row gap-2">
                {TYPE_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    onPress={() => {
                      if (Platform.OS !== 'web') {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      }
                      setType(option.value);
                      if (option.value !== 'supplement') {
                        setShowProductSearch(false);
                      }
                    }}
                    style={[
                      styles.typeButton,
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

            {/* Name Input */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-foreground mb-2">
                {type === 'supplement' ? 'Product Name' : 'Medication Name'} *
              </Text>
              
              {type === 'supplement' ? (
                <TouchableOpacity
                  onPress={() => setShowProductSearch(true)}
                  style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <Text style={{ color: name ? colors.foreground : colors.muted }}>
                    {name || 'Search Isotonix Products...'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TextInput
                  style={[styles.input, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
                  value={name}
                  onChangeText={setName}
                  placeholder="Enter medication name"
                  placeholderTextColor={colors.muted}
                />
              )}
            </View>

            {/* Dosage Input */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-foreground mb-2">Dosage</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
                value={dosage}
                onChangeText={setDosage}
                placeholder="e.g., 1 capful, 50mg"
                placeholderTextColor={colors.muted}
              />
            </View>

            {/* Schedule Times */}
            <View className="mb-4">
              <Text className="text-sm font-medium text-foreground mb-2">Schedule Times</Text>
              <View className="flex-row flex-wrap gap-2">
                {TIME_OPTIONS.map((time) => (
                  <TouchableOpacity
                    key={time}
                    onPress={() => handleTimeToggle(time)}
                    style={[
                      styles.timeButton,
                      {
                        backgroundColor: scheduleTimes.includes(time) ? colors.primary : colors.surface,
                        borderColor: scheduleTimes.includes(time) ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.timeText,
                        { color: scheduleTimes.includes(time) ? '#FFFFFF' : colors.foreground },
                      ]}
                    >
                      {time}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Reminder Toggle */}
            <View className="flex-row justify-between items-center mb-4" style={[styles.toggleRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text className="text-base text-foreground">Enable Reminders</Text>
              <Switch
                value={reminderEnabled}
                onValueChange={(value) => {
                  if (Platform.OS !== 'web') {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  }
                  setReminderEnabled(value);
                }}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#FFFFFF"
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
                disabled={!name.trim()}
                style={[
                  styles.button,
                  { backgroundColor: name.trim() ? colors.primary : colors.border, flex: 1 },
                ]}
              >
                <Text style={[styles.buttonText, { color: '#FFFFFF', opacity: name.trim() ? 1 : 0.5 }]}>
                  Save
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>

      {/* Product Search Modal */}
      <Modal
        visible={showProductSearch}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowProductSearch(false)}
      >
        <View style={styles.overlay}>
          <View style={[styles.searchModal, { backgroundColor: colors.background }]}>
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-xl font-bold text-foreground">Isotonix Products</Text>
              <TouchableOpacity onPress={() => setShowProductSearch(false)}>
                <Text style={[styles.closeText, { color: colors.primary }]}>Close</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.searchInput, { backgroundColor: colors.surface, color: colors.foreground, borderColor: colors.border }]}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search products..."
              placeholderTextColor={colors.muted}
              autoFocus
            />

            <FlatList
              data={filteredProducts}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => handleSelectProduct(item.name)}
                  style={[styles.productItem, { borderColor: colors.border }]}
                >
                  <Text className="text-base font-medium text-foreground">{item.name}</Text>
                  <Text className="text-sm text-muted">{item.category}</Text>
                </TouchableOpacity>
              )}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>
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
  searchModal: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    height: '80%',
  },
  typeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  typeEmoji: {
    fontSize: 16,
  },
  typeText: {
    fontSize: 13,
    fontWeight: '500',
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
  toggleRow: {
    padding: 16,
    borderRadius: 12,
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
  closeText: {
    fontSize: 16,
    fontWeight: '600',
  },
  searchInput: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
    marginBottom: 16,
  },
  productItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
});
