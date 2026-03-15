import {
  TreatmentPlan,
  DailyLog,
  Medication,
  MedicationLog,
  Appointment,
  generateId,
} from '../types';

// Helper to get date string offset from today
const getDateOffset = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().split('T')[0];
};

// Helper to get datetime string offset from today
const getDateTimeOffset = (days: number, hours: number, minutes: number): string => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
};

// Demo Treatment Plan
export const DEMO_PLAN: TreatmentPlan = {
  id: 'demo-plan-001',
  name: 'Migraine & Fertility Wellness',
  healthGoal: 'Reduce migraine frequency and track fertility for pregnancy planning',
  duration: 6,
  startDate: getDateOffset(-30), // Started 30 days ago
  notes: 'Focus on identifying migraine triggers and optimizing fertility window',
  templateType: 'migraine_fertility',
  createdAt: getDateOffset(-30),
};

// Demo Medications
export const DEMO_MEDICATIONS: Medication[] = [
  {
    id: 'demo-med-001',
    planId: 'demo-plan-001',
    type: 'supplement',
    name: 'Isotonix OPC-3',
    dosage: '1 capful',
    scheduleTimes: ['08:00'],
    reminderEnabled: true,
    notes: 'Take on empty stomach',
    createdAt: getDateOffset(-30),
  },
  {
    id: 'demo-med-002',
    planId: 'demo-plan-001',
    type: 'supplement',
    name: 'Isotonix Magnesium',
    dosage: '1 capful',
    scheduleTimes: ['20:00'],
    reminderEnabled: true,
    notes: 'May help with migraine prevention',
    createdAt: getDateOffset(-30),
  },
  {
    id: 'demo-med-003',
    planId: 'demo-plan-001',
    type: 'supplement',
    name: 'Isotonix Prenatal Activated Multivitamin',
    dosage: '1 capful',
    scheduleTimes: ['08:00'],
    reminderEnabled: true,
    notes: 'Essential for pregnancy planning',
    createdAt: getDateOffset(-30),
  },
  {
    id: 'demo-med-004',
    planId: 'demo-plan-001',
    type: 'prescription',
    name: 'Sumatriptan',
    dosage: '50mg',
    scheduleTimes: [],
    reminderEnabled: false,
    notes: 'Take as needed for acute migraine',
    createdAt: getDateOffset(-30),
  },
  {
    id: 'demo-med-005',
    planId: 'demo-plan-001',
    type: 'otc',
    name: 'Ibuprofen',
    dosage: '400mg',
    scheduleTimes: [],
    reminderEnabled: false,
    notes: 'For mild headaches only - avoid during fertile window',
    createdAt: getDateOffset(-30),
  },
];

// Demo Daily Logs (past 14 days)
export const DEMO_DAILY_LOGS: DailyLog[] = [
  // Period days (days -14 to -10)
  {
    id: generateId(),
    planId: 'demo-plan-001',
    date: getDateOffset(-14),
    migraineOccurred: false,
    migraineIntensity: 0,
    symptoms: [],
    mood: 'okay',
    sleepQuality: 6,
    stressLevel: 4,
    notes: 'First day of period',
    periodStarted: true,
    periodEnded: false,
    flowLevel: 'medium',
  },
  {
    id: generateId(),
    planId: 'demo-plan-001',
    date: getDateOffset(-13),
    migraineOccurred: true,
    migraineIntensity: 6,
    symptoms: ['nausea', 'light_sensitivity'],
    mood: 'bad',
    sleepQuality: 5,
    stressLevel: 6,
    notes: 'Menstrual migraine started',
    periodStarted: false,
    periodEnded: false,
    flowLevel: 'heavy',
  },
  {
    id: generateId(),
    planId: 'demo-plan-001',
    date: getDateOffset(-12),
    migraineOccurred: true,
    migraineIntensity: 4,
    symptoms: ['fatigue'],
    mood: 'okay',
    sleepQuality: 6,
    stressLevel: 5,
    notes: 'Migraine improving',
    periodStarted: false,
    periodEnded: false,
    flowLevel: 'medium',
  },
  {
    id: generateId(),
    planId: 'demo-plan-001',
    date: getDateOffset(-11),
    migraineOccurred: false,
    migraineIntensity: 0,
    symptoms: [],
    mood: 'good',
    sleepQuality: 7,
    stressLevel: 4,
    notes: '',
    periodStarted: false,
    periodEnded: false,
    flowLevel: 'light',
  },
  {
    id: generateId(),
    planId: 'demo-plan-001',
    date: getDateOffset(-10),
    migraineOccurred: false,
    migraineIntensity: 0,
    symptoms: [],
    mood: 'good',
    sleepQuality: 7,
    stressLevel: 3,
    notes: 'Last day of period',
    periodStarted: false,
    periodEnded: true,
    flowLevel: 'light',
  },
  // Regular days
  {
    id: generateId(),
    planId: 'demo-plan-001',
    date: getDateOffset(-7),
    migraineOccurred: false,
    migraineIntensity: 0,
    symptoms: [],
    mood: 'great',
    sleepQuality: 8,
    stressLevel: 2,
    notes: 'Feeling great today!',
    periodStarted: false,
    periodEnded: false,
    flowLevel: null,
  },
  {
    id: generateId(),
    planId: 'demo-plan-001',
    date: getDateOffset(-5),
    migraineOccurred: true,
    migraineIntensity: 3,
    symptoms: ['aura'],
    mood: 'okay',
    sleepQuality: 6,
    stressLevel: 5,
    notes: 'Mild migraine with aura, caught it early',
    periodStarted: false,
    periodEnded: false,
    flowLevel: null,
  },
  {
    id: generateId(),
    planId: 'demo-plan-001',
    date: getDateOffset(-3),
    migraineOccurred: false,
    migraineIntensity: 0,
    symptoms: [],
    mood: 'good',
    sleepQuality: 7,
    stressLevel: 4,
    notes: '',
    periodStarted: false,
    periodEnded: false,
    flowLevel: null,
  },
  {
    id: generateId(),
    planId: 'demo-plan-001',
    date: getDateOffset(-1),
    migraineOccurred: false,
    migraineIntensity: 0,
    symptoms: [],
    mood: 'good',
    sleepQuality: 8,
    stressLevel: 3,
    notes: 'Good sleep, feeling rested',
    periodStarted: false,
    periodEnded: false,
    flowLevel: null,
  },
];

// Demo Medication Logs
export const DEMO_MEDICATION_LOGS: MedicationLog[] = [
  // OPC-3 logs
  {
    id: generateId(),
    medicationId: 'demo-med-001',
    date: getDateOffset(-3),
    scheduledTime: '08:00',
    status: 'taken',
    actualTime: getDateTimeOffset(-3, 8, 15),
  },
  {
    id: generateId(),
    medicationId: 'demo-med-001',
    date: getDateOffset(-2),
    scheduledTime: '08:00',
    status: 'taken',
    actualTime: getDateTimeOffset(-2, 8, 0),
  },
  {
    id: generateId(),
    medicationId: 'demo-med-001',
    date: getDateOffset(-1),
    scheduledTime: '08:00',
    status: 'skipped',
    actualTime: null,
  },
  // Magnesium logs
  {
    id: generateId(),
    medicationId: 'demo-med-002',
    date: getDateOffset(-3),
    scheduledTime: '20:00',
    status: 'taken',
    actualTime: getDateTimeOffset(-3, 20, 30),
  },
  {
    id: generateId(),
    medicationId: 'demo-med-002',
    date: getDateOffset(-2),
    scheduledTime: '20:00',
    status: 'taken',
    actualTime: getDateTimeOffset(-2, 21, 0),
  },
  {
    id: generateId(),
    medicationId: 'demo-med-002',
    date: getDateOffset(-1),
    scheduledTime: '20:00',
    status: 'taken',
    actualTime: getDateTimeOffset(-1, 20, 0),
  },
  // Prenatal logs
  {
    id: generateId(),
    medicationId: 'demo-med-003',
    date: getDateOffset(-3),
    scheduledTime: '08:00',
    status: 'taken',
    actualTime: getDateTimeOffset(-3, 8, 15),
  },
  {
    id: generateId(),
    medicationId: 'demo-med-003',
    date: getDateOffset(-2),
    scheduledTime: '08:00',
    status: 'taken',
    actualTime: getDateTimeOffset(-2, 8, 0),
  },
  {
    id: generateId(),
    medicationId: 'demo-med-003',
    date: getDateOffset(-1),
    scheduledTime: '08:00',
    status: 'taken',
    actualTime: getDateTimeOffset(-1, 8, 30),
  },
];

// Demo Appointments
export const DEMO_APPOINTMENTS: Appointment[] = [
  {
    id: 'demo-apt-001',
    planId: 'demo-plan-001',
    title: 'Acupuncture Session',
    type: 'acupuncture',
    startTime: getDateTimeOffset(2, 14, 0),
    duration: 60,
    location: 'Wellness Center, 123 Main St',
    notes: 'Monthly session for migraine prevention',
    createdAt: getDateOffset(-7),
  },
  {
    id: 'demo-apt-002',
    planId: 'demo-plan-001',
    title: 'OB-GYN Consultation',
    type: 'medical',
    startTime: getDateTimeOffset(5, 10, 30),
    duration: 30,
    location: 'Dr. Smith Office, Medical Plaza',
    notes: 'Discuss fertility planning and cycle tracking',
    createdAt: getDateOffset(-14),
  },
  {
    id: 'demo-apt-003',
    planId: 'demo-plan-001',
    title: 'Neurologist Follow-up',
    type: 'medical',
    startTime: getDateTimeOffset(10, 15, 0),
    duration: 45,
    location: 'Neurology Clinic',
    notes: 'Review migraine diary and medication effectiveness',
    createdAt: getDateOffset(-20),
  },
];

// Function to check if demo data should be loaded
export const shouldLoadDemoData = (plansCount: number): boolean => {
  return plansCount === 0;
};
