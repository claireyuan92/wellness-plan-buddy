import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useReducer, useEffect, useCallback, ReactNode } from 'react';
import {
  AppState,
  UserProfile,
  TreatmentPlan,
  DailyLog,
  Medication,
  MedicationLog,
  Appointment,
  DEFAULT_PROFILE,
  generateId,
} from '../types';

// Storage keys
const STORAGE_KEYS = {
  PROFILE: '@wellness_profile',
  PLANS: '@wellness_plans',
  ACTIVE_PLAN: '@wellness_active_plan',
  DAILY_LOGS: '@wellness_daily_logs',
  MEDICATIONS: '@wellness_medications',
  MEDICATION_LOGS: '@wellness_medication_logs',
  APPOINTMENTS: '@wellness_appointments',
};

// Initial state
const initialState: AppState = {
  profile: null,
  plans: [],
  activePlanId: null,
  dailyLogs: [],
  medications: [],
  medicationLogs: [],
  appointments: [],
};

// Action types
type Action =
  | { type: 'LOAD_STATE'; payload: Partial<AppState> }
  | { type: 'SET_PROFILE'; payload: UserProfile }
  | { type: 'UPDATE_PROFILE'; payload: UserProfile }
  | { type: 'ADD_PLAN'; payload: TreatmentPlan }
  | { type: 'UPDATE_PLAN'; payload: TreatmentPlan }
  | { type: 'DELETE_PLAN'; payload: string }
  | { type: 'SET_ACTIVE_PLAN'; payload: string | null }
  | { type: 'UPSERT_DAILY_LOG'; payload: DailyLog }
  | { type: 'ADD_MEDICATION'; payload: Medication }
  | { type: 'UPDATE_MEDICATION'; payload: Medication }
  | { type: 'DELETE_MEDICATION'; payload: string }
  | { type: 'UPSERT_MEDICATION_LOG'; payload: MedicationLog }
  | { type: 'ADD_APPOINTMENT'; payload: Appointment }
  | { type: 'UPDATE_APPOINTMENT'; payload: Appointment }
  | { type: 'DELETE_APPOINTMENT'; payload: string };

// Reducer
function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'LOAD_STATE':
      return { ...state, ...action.payload };

    case 'SET_PROFILE':
      return { ...state, profile: action.payload };

    case 'UPDATE_PROFILE':
      return {
        ...state,
        profile: action.payload,
      };

    case 'ADD_PLAN':
      return { ...state, plans: [...state.plans, action.payload] };

    case 'UPDATE_PLAN':
      return {
        ...state,
        plans: state.plans.map((p) =>
          p.id === action.payload.id ? action.payload : p
        ),
      };

    case 'DELETE_PLAN':
      return {
        ...state,
        plans: state.plans.filter((p) => p.id !== action.payload),
        activePlanId:
          state.activePlanId === action.payload ? null : state.activePlanId,
      };

    case 'SET_ACTIVE_PLAN':
      return { ...state, activePlanId: action.payload };

    case 'UPSERT_DAILY_LOG': {
      const existingIndex = state.dailyLogs.findIndex(
        (log) =>
          log.planId === action.payload.planId &&
          log.date === action.payload.date
      );
      if (existingIndex >= 0) {
        const newLogs = [...state.dailyLogs];
        newLogs[existingIndex] = action.payload;
        return { ...state, dailyLogs: newLogs };
      }
      return { ...state, dailyLogs: [...state.dailyLogs, action.payload] };
    }

    case 'ADD_MEDICATION':
      return { ...state, medications: [...state.medications, action.payload] };

    case 'UPDATE_MEDICATION':
      return {
        ...state,
        medications: state.medications.map((m) =>
          m.id === action.payload.id ? action.payload : m
        ),
      };

    case 'DELETE_MEDICATION':
      return {
        ...state,
        medications: state.medications.filter((m) => m.id !== action.payload),
        medicationLogs: state.medicationLogs.filter(
          (log) => log.medicationId !== action.payload
        ),
      };

    case 'UPSERT_MEDICATION_LOG': {
      const existingIndex = state.medicationLogs.findIndex(
        (log) =>
          log.medicationId === action.payload.medicationId &&
          log.date === action.payload.date &&
          (log.scheduledTime ?? null) === (action.payload.scheduledTime ?? null)
      );
      if (existingIndex >= 0) {
        const newLogs = [...state.medicationLogs];
        newLogs[existingIndex] = action.payload;
        return { ...state, medicationLogs: newLogs };
      }
      return {
        ...state,
        medicationLogs: [...state.medicationLogs, action.payload],
      };
    }

    case 'ADD_APPOINTMENT':
      return { ...state, appointments: [...state.appointments, action.payload] };

    case 'UPDATE_APPOINTMENT':
      return {
        ...state,
        appointments: state.appointments.map((a) =>
          a.id === action.payload.id ? action.payload : a
        ),
      };

    case 'DELETE_APPOINTMENT':
      return {
        ...state,
        appointments: state.appointments.filter((a) => a.id !== action.payload),
      };

    default:
      return state;
  }
}

// Context types
interface AppContextType {
  state: AppState;
  isLoading: boolean;
  // Profile actions
  setProfile: (profile: UserProfile) => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  // Plan actions
  addPlan: (plan: Omit<TreatmentPlan, 'id' | 'createdAt'>) => Promise<TreatmentPlan>;
  updatePlan: (plan: TreatmentPlan) => Promise<void>;
  deletePlan: (planId: string) => Promise<void>;
  setActivePlan: (planId: string | null) => Promise<void>;
  // Daily log actions
  upsertDailyLog: (log: DailyLog) => Promise<void>;
  getDailyLog: (planId: string, date: string) => DailyLog | undefined;
  // Medication actions
  addMedication: (medication: Omit<Medication, 'id' | 'createdAt'>) => Promise<Medication>;
  updateMedication: (medication: Medication) => Promise<void>;
  deleteMedication: (medicationId: string) => Promise<void>;
  getMedicationsForPlan: (planId: string) => Medication[];
  // Medication log actions
  upsertMedicationLog: (log: MedicationLog) => Promise<void>;
  getMedicationLog: (
    medicationId: string,
    date: string,
    scheduledTime?: string | null
  ) => MedicationLog | undefined;
  // Appointment actions
  addAppointment: (appointment: Omit<Appointment, 'id' | 'createdAt'>) => Promise<Appointment>;
  updateAppointment: (appointment: Appointment) => Promise<void>;
  deleteAppointment: (appointmentId: string) => Promise<void>;
  getAppointmentsForPlan: (planId: string) => Appointment[];
  getAppointmentsForDate: (planId: string, date: string) => Appointment[];
}

const AppContext = createContext<AppContextType | null>(null);

// Provider component
export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [isLoading, setIsLoading] = React.useState(true);

  // Load state from AsyncStorage on mount
  useEffect(() => {
    const loadState = async () => {
      try {
        const [
          profileJson,
          plansJson,
          activePlanId,
          dailyLogsJson,
          medicationsJson,
          medicationLogsJson,
          appointmentsJson,
        ] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.PROFILE),
          AsyncStorage.getItem(STORAGE_KEYS.PLANS),
          AsyncStorage.getItem(STORAGE_KEYS.ACTIVE_PLAN),
          AsyncStorage.getItem(STORAGE_KEYS.DAILY_LOGS),
          AsyncStorage.getItem(STORAGE_KEYS.MEDICATIONS),
          AsyncStorage.getItem(STORAGE_KEYS.MEDICATION_LOGS),
          AsyncStorage.getItem(STORAGE_KEYS.APPOINTMENTS),
        ]);

        dispatch({
          type: 'LOAD_STATE',
          payload: {
            profile: profileJson ? JSON.parse(profileJson) : null,
            plans: plansJson ? JSON.parse(plansJson) : [],
            activePlanId: activePlanId || null,
            dailyLogs: dailyLogsJson ? JSON.parse(dailyLogsJson) : [],
            medications: medicationsJson ? JSON.parse(medicationsJson) : [],
            medicationLogs: medicationLogsJson ? JSON.parse(medicationLogsJson) : [],
            appointments: appointmentsJson ? JSON.parse(appointmentsJson) : [],
          },
        });
      } catch (error) {
        console.error('Error loading state:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadState();
  }, []);

  // Profile actions
  const setProfile = useCallback(async (profile: UserProfile) => {
    dispatch({ type: 'SET_PROFILE', payload: profile });
    await AsyncStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
  }, []);

  const updateProfile = useCallback(
    async (updates: Partial<UserProfile>) => {
      const newProfile = state.profile
        ? { ...state.profile, ...updates }
        : { ...DEFAULT_PROFILE, ...updates };
      dispatch({ type: 'UPDATE_PROFILE', payload: newProfile });
      await AsyncStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(newProfile));
    },
    [state.profile]
  );

  // Plan actions
  const addPlan = useCallback(
    async (planData: Omit<TreatmentPlan, 'id' | 'createdAt'>): Promise<TreatmentPlan> => {
      const plan: TreatmentPlan = {
        ...planData,
        id: generateId(),
        createdAt: new Date().toISOString(),
      };
      dispatch({ type: 'ADD_PLAN', payload: plan });
      const newPlans = [...state.plans, plan];
      await AsyncStorage.setItem(STORAGE_KEYS.PLANS, JSON.stringify(newPlans));
      return plan;
    },
    [state.plans]
  );

  const updatePlan = useCallback(
    async (plan: TreatmentPlan) => {
      dispatch({ type: 'UPDATE_PLAN', payload: plan });
      const newPlans = state.plans.map((p) => (p.id === plan.id ? plan : p));
      await AsyncStorage.setItem(STORAGE_KEYS.PLANS, JSON.stringify(newPlans));
    },
    [state.plans]
  );

  const deletePlan = useCallback(
    async (planId: string) => {
      dispatch({ type: 'DELETE_PLAN', payload: planId });
      const newPlans = state.plans.filter((p) => p.id !== planId);
      await AsyncStorage.setItem(STORAGE_KEYS.PLANS, JSON.stringify(newPlans));
      if (state.activePlanId === planId) {
        await AsyncStorage.removeItem(STORAGE_KEYS.ACTIVE_PLAN);
      }
    },
    [state.plans, state.activePlanId]
  );

  const setActivePlan = useCallback(async (planId: string | null) => {
    dispatch({ type: 'SET_ACTIVE_PLAN', payload: planId });
    if (planId) {
      await AsyncStorage.setItem(STORAGE_KEYS.ACTIVE_PLAN, planId);
    } else {
      await AsyncStorage.removeItem(STORAGE_KEYS.ACTIVE_PLAN);
    }
  }, []);

  // Daily log actions
  const upsertDailyLog = useCallback(
    async (log: DailyLog) => {
      dispatch({ type: 'UPSERT_DAILY_LOG', payload: log });
      const existingIndex = state.dailyLogs.findIndex(
        (l) => l.planId === log.planId && l.date === log.date
      );
      let newLogs: DailyLog[];
      if (existingIndex >= 0) {
        newLogs = [...state.dailyLogs];
        newLogs[existingIndex] = log;
      } else {
        newLogs = [...state.dailyLogs, log];
      }
      await AsyncStorage.setItem(STORAGE_KEYS.DAILY_LOGS, JSON.stringify(newLogs));
    },
    [state.dailyLogs]
  );

  const getDailyLog = useCallback(
    (planId: string, date: string) => {
      return state.dailyLogs.find((log) => log.planId === planId && log.date === date);
    },
    [state.dailyLogs]
  );

  // Medication actions
  const addMedication = useCallback(
    async (medicationData: Omit<Medication, 'id' | 'createdAt'>): Promise<Medication> => {
      const medication: Medication = {
        ...medicationData,
        id: generateId(),
        createdAt: new Date().toISOString(),
      };
      dispatch({ type: 'ADD_MEDICATION', payload: medication });
      const newMedications = [...state.medications, medication];
      await AsyncStorage.setItem(STORAGE_KEYS.MEDICATIONS, JSON.stringify(newMedications));
      return medication;
    },
    [state.medications]
  );

  const updateMedication = useCallback(
    async (medication: Medication) => {
      dispatch({ type: 'UPDATE_MEDICATION', payload: medication });
      const newMedications = state.medications.map((m) =>
        m.id === medication.id ? medication : m
      );
      await AsyncStorage.setItem(STORAGE_KEYS.MEDICATIONS, JSON.stringify(newMedications));
    },
    [state.medications]
  );

  const deleteMedication = useCallback(
    async (medicationId: string) => {
      dispatch({ type: 'DELETE_MEDICATION', payload: medicationId });
      const newMedications = state.medications.filter((m) => m.id !== medicationId);
      const newMedicationLogs = state.medicationLogs.filter(
        (log) => log.medicationId !== medicationId
      );
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.MEDICATIONS, JSON.stringify(newMedications)),
        AsyncStorage.setItem(STORAGE_KEYS.MEDICATION_LOGS, JSON.stringify(newMedicationLogs)),
      ]);
    },
    [state.medications, state.medicationLogs]
  );

  const getMedicationsForPlan = useCallback(
    (planId: string) => {
      return state.medications.filter((m) => m.planId === planId);
    },
    [state.medications]
  );

  // Medication log actions
  const upsertMedicationLog = useCallback(
    async (log: MedicationLog) => {
      dispatch({ type: 'UPSERT_MEDICATION_LOG', payload: log });
      const existingIndex = state.medicationLogs.findIndex(
        (l) =>
          l.medicationId === log.medicationId &&
          l.date === log.date &&
          (l.scheduledTime ?? null) === (log.scheduledTime ?? null)
      );
      let newLogs: MedicationLog[];
      if (existingIndex >= 0) {
        newLogs = [...state.medicationLogs];
        newLogs[existingIndex] = log;
      } else {
        newLogs = [...state.medicationLogs, log];
      }
      await AsyncStorage.setItem(STORAGE_KEYS.MEDICATION_LOGS, JSON.stringify(newLogs));
    },
    [state.medicationLogs]
  );

  const getMedicationLog = useCallback(
    (medicationId: string, date: string, scheduledTime: string | null = null) => {
      return state.medicationLogs.find(
        (log) =>
          log.medicationId === medicationId &&
          log.date === date &&
          (log.scheduledTime ?? null) === scheduledTime
      );
    },
    [state.medicationLogs]
  );

  // Appointment actions
  const addAppointment = useCallback(
    async (appointmentData: Omit<Appointment, 'id' | 'createdAt'>): Promise<Appointment> => {
      const appointment: Appointment = {
        ...appointmentData,
        id: generateId(),
        createdAt: new Date().toISOString(),
      };
      dispatch({ type: 'ADD_APPOINTMENT', payload: appointment });
      const newAppointments = [...state.appointments, appointment];
      await AsyncStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(newAppointments));
      return appointment;
    },
    [state.appointments]
  );

  const updateAppointment = useCallback(
    async (appointment: Appointment) => {
      dispatch({ type: 'UPDATE_APPOINTMENT', payload: appointment });
      const newAppointments = state.appointments.map((a) =>
        a.id === appointment.id ? appointment : a
      );
      await AsyncStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(newAppointments));
    },
    [state.appointments]
  );

  const deleteAppointment = useCallback(
    async (appointmentId: string) => {
      dispatch({ type: 'DELETE_APPOINTMENT', payload: appointmentId });
      const newAppointments = state.appointments.filter((a) => a.id !== appointmentId);
      await AsyncStorage.setItem(STORAGE_KEYS.APPOINTMENTS, JSON.stringify(newAppointments));
    },
    [state.appointments]
  );

  const getAppointmentsForPlan = useCallback(
    (planId: string) => {
      return state.appointments.filter((a) => a.planId === planId);
    },
    [state.appointments]
  );

  const getAppointmentsForDate = useCallback(
    (planId: string, date: string) => {
      return state.appointments.filter((a) => {
        if (a.planId !== planId) return false;
        const appointmentDate = a.startTime.split('T')[0];
        return appointmentDate === date;
      });
    },
    [state.appointments]
  );

  const value: AppContextType = {
    state,
    isLoading,
    setProfile,
    updateProfile,
    addPlan,
    updatePlan,
    deletePlan,
    setActivePlan,
    upsertDailyLog,
    getDailyLog,
    addMedication,
    updateMedication,
    deleteMedication,
    getMedicationsForPlan,
    upsertMedicationLog,
    getMedicationLog,
    addAppointment,
    updateAppointment,
    deleteAppointment,
    getAppointmentsForPlan,
    getAppointmentsForDate,
  };

  return React.createElement(AppContext.Provider, { value }, children);
}

// Hook to use the app context
export function useAppStore(): AppContextType {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppStore must be used within an AppProvider');
  }
  return context;
}

// Selector hooks for specific data
export function useProfile() {
  const { state, setProfile, updateProfile } = useAppStore();
  return { profile: state.profile, setProfile, updateProfile };
}

export function usePlans() {
  const { state, addPlan, updatePlan, deletePlan, setActivePlan } = useAppStore();
  const activePlan = state.plans.find((p) => p.id === state.activePlanId);
  return {
    plans: state.plans,
    activePlan,
    activePlanId: state.activePlanId,
    addPlan,
    updatePlan,
    deletePlan,
    setActivePlan,
  };
}

export function useDailyLogs(planId: string) {
  const { state, upsertDailyLog, getDailyLog } = useAppStore();
  const logsForPlan = state.dailyLogs.filter((log) => log.planId === planId);
  return { logs: logsForPlan, upsertDailyLog, getDailyLog };
}

export function useMedications(planId: string) {
  const {
    addMedication,
    updateMedication,
    deleteMedication,
    getMedicationsForPlan,
    upsertMedicationLog,
    getMedicationLog,
  } = useAppStore();
  const medications = getMedicationsForPlan(planId);
  return {
    medications,
    addMedication,
    updateMedication,
    deleteMedication,
    upsertMedicationLog,
    getMedicationLog,
  };
}

export function useAppointments(planId: string) {
  const {
    addAppointment,
    updateAppointment,
    deleteAppointment,
    getAppointmentsForPlan,
    getAppointmentsForDate,
  } = useAppStore();
  const appointments = getAppointmentsForPlan(planId);
  return {
    appointments,
    addAppointment,
    updateAppointment,
    deleteAppointment,
    getAppointmentsForDate,
  };
}
