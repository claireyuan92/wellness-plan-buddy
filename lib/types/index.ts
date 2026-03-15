// User Profile Types
export type Sex = 'male' | 'female' | 'other' | 'prefer_not_to_say';

export interface UserProfile {
  age: number;
  sex: Sex;
  cycleTrackingEnabled: boolean;
  averageCycleLength: number;
  periodLength: number;
  onboardingCompleted: boolean;
  medicationRemindersEnabled: boolean;
  appointmentRemindersEnabled: boolean;
}

// Treatment Plan Types
export type PlanTemplate = 'migraine_fertility';

export interface TreatmentPlan {
  id: string;
  name: string;
  healthGoal: string;
  duration: number; // months (3-6)
  startDate: string; // ISO date string
  notes: string;
  templateType: PlanTemplate;
  createdAt: string;
}

// Daily Log Types
export type Mood = 'great' | 'good' | 'okay' | 'bad' | 'terrible';
export type FlowLevel = 'light' | 'medium' | 'heavy';

export const MIGRAINE_SYMPTOMS = [
  'nausea',
  'aura',
  'light_sensitivity',
  'sound_sensitivity',
  'dizziness',
  'neck_pain',
  'fatigue',
  'other',
] as const;

export type MigraineSymptom = typeof MIGRAINE_SYMPTOMS[number];

export interface DailyLog {
  id: string;
  planId: string;
  date: string; // ISO date string (YYYY-MM-DD)
  // Migraine tracking
  migraineOccurred: boolean;
  migraineIntensity: number; // 1-10
  symptoms: MigraineSymptom[];
  // Wellness tracking
  mood: Mood | null;
  sleepQuality: number | null; // 1-10
  stressLevel: number | null; // 1-10
  notes: string;
  // Cycle tracking
  periodStarted: boolean;
  periodEnded: boolean;
  flowLevel: FlowLevel | null;
  ovulationLogged?: boolean;
}

// Medication Types
export type MedicationType = 'supplement' | 'prescription' | 'otc';

export interface Medication {
  id: string;
  planId: string;
  type: MedicationType;
  name: string;
  dosage: string;
  scheduleTimes: string[]; // e.g., ['08:00', '20:00']
  reminderEnabled: boolean;
  notes: string;
  createdAt: string;
}

export type MedicationStatus = 'taken' | 'skipped' | 'pending';

export interface MedicationLog {
  id: string;
  medicationId: string;
  date: string; // ISO date string (YYYY-MM-DD)
  scheduledTime: string | null; // HH:mm for scheduled doses, null for as-needed meds
  status: MedicationStatus;
  actualTime: string | null; // ISO datetime string
}

// Appointment Types
export interface Appointment {
  id: string;
  planId: string;
  title: string;
  type: string; // acupuncture, psychology, etc.
  startTime: string; // ISO datetime string
  duration: number; // minutes
  location: string;
  notes: string;
  createdAt: string;
}

// Isotonix Product Type
export interface IsotonixProduct {
  id: string;
  name: string;
  category: string;
  description: string;
}

// App State
export interface AppState {
  profile: UserProfile | null;
  plans: TreatmentPlan[];
  activePlanId: string | null;
  dailyLogs: DailyLog[];
  medications: Medication[];
  medicationLogs: MedicationLog[];
  appointments: Appointment[];
}

// Utility function to generate unique IDs
export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Utility function to get today's date string
export const getTodayString = (): string => {
  return new Date().toISOString().split('T')[0];
};

// Utility function to format date for display
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
};

// Default user profile
export const DEFAULT_PROFILE: UserProfile = {
  age: 0,
  sex: 'prefer_not_to_say',
  cycleTrackingEnabled: false,
  averageCycleLength: 28,
  periodLength: 5,
  onboardingCompleted: false,
  medicationRemindersEnabled: true,
  appointmentRemindersEnabled: true,
};
