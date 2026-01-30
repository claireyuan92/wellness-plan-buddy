# Wellness Plan Expert Buddy - Design Document

## Visual Style (Flo-Inspired)

### Color Palette
- **Primary Gradient**: Soft lavender to rose (#E8D5E8 → #F5E6E8)
- **Accent Color**: Warm coral (#E8A598) for CTAs and highlights
- **Background**: Soft cream white (#FDFBF9) 
- **Surface Cards**: Pure white (#FFFFFF) with subtle shadows
- **Text Primary**: Deep charcoal (#2D3436)
- **Text Secondary**: Warm gray (#636E72)
- **Period/Fertility**: Soft pink (#F8B4B4) for period days, light purple (#D4A5D9) for fertility window
- **Success**: Soft green (#A8E6CF)
- **Warning**: Warm amber (#FFD93D)
- **Migraine Indicator**: Soft red-orange (#FF8B8B)

### Typography
- **Headings**: Bold, rounded sans-serif (system default with increased weight)
- **Body**: Regular weight, comfortable line height (1.5)
- **Numbers/Data**: Medium weight for clarity

### Design Elements
- Rounded corners (16-24px radius on cards)
- Gentle shadows (subtle elevation)
- Soft gradients for headers and accents
- Friendly, simple icons
- Smooth transitions and micro-animations

---

## Screen List

### 1. Onboarding Flow (First Launch Only)
- **Welcome Screen**: App introduction with calming illustration
- **Age Input Screen**: Simple number picker
- **Sex Selection Screen**: Radio buttons (Male/Female/Other/Prefer not to say)
- **Cycle Tracking Opt-in Screen**: Toggle to enable menstrual/fertility tracking

### 2. Plan Selection Screen
- List of user's Treatment Plans
- "Create New Plan" button
- Each plan card shows: name, duration, start date, progress

### 3. Create/Edit Treatment Plan Screen (Modal)
- Plan name input
- Health goal (free text)
- Duration selector (3-6 months)
- Start date picker
- Notes field
- Plan template selector (Migraine + Menstrual Cycle / Fertility)

### 4. Calendar Home Screen (Main View)
- Monthly calendar grid (primary focus)
- Visual indicators for:
  - Logged symptoms (small dots)
  - Medications taken/skipped (checkmark/x icons)
  - Appointments (small calendar icon)
  - Period days (pink background)
  - Ovulation day (purple circle)
  - High fertility window (light purple background)
- Current plan name in header
- Settings gear icon (top right)
- Plan selector (top left)

### 5. Day Detail Bottom Sheet (Scrollable)
Sections in order:
1. **Date Header**: Selected date with day name
2. **Symptoms & Wellness Section**
   - Migraine toggle
   - Intensity slider (1-10)
   - Symptom multi-select chips
   - Mood selector (emoji-based)
   - Sleep quality slider (1-10)
   - Stress level slider (1-10)
   - Notes field
3. **Cycle & Fertility Section** (if enabled)
   - Period start/end toggle
   - Flow level selector (light/medium/heavy)
   - Ovulation indicator (read-only prediction)
   - Fertility window display
4. **Medications & Supplements Section**
   - Scheduled items list with Taken/Skipped buttons
   - Add unscheduled medication button
5. **Appointments Section**
   - Today's appointments list
   - Add appointment button

### 6. Add/Edit Medication Modal
- Type selector (Supplement/Prescription/OTC)
- Product name (searchable dropdown for Isotonix, free text for others)
- Dosage input
- Schedule time(s) multi-select
- Reminder toggle
- Notes field

### 7. Add/Edit Appointment Modal
- Title/type input
- Start time picker
- Duration picker
- Location input
- Notes field

### 8. Settings Screen (Modal)
- **Cycle & Fertility Toggle**: Enable/Disable
- **Cycle Configuration** (visible when enabled):
  - Average cycle length (default 28)
  - Period length (default 5)
- **Reminders Section**:
  - Medication reminders toggle
  - Appointment reminders toggle
- **Profile Section**:
  - Edit age
  - Edit sex

---

## Key User Flows

### Flow 1: First Launch Onboarding
1. User opens app → Welcome screen
2. Tap "Get Started" → Age input
3. Enter age, tap "Next" → Sex selection
4. Select sex, tap "Next" → Cycle tracking opt-in
5. Choose enable/disable, tap "Complete" → Plan Selection screen (empty)

### Flow 2: Create Treatment Plan
1. From Plan Selection → Tap "Create New Plan"
2. Fill plan details in modal
3. Select template (Migraine + Menstrual Cycle / Fertility)
4. Tap "Create" → Navigate to Calendar Home for new plan

### Flow 3: Daily Logging
1. From Calendar Home → Tap on a date
2. Day Detail bottom sheet opens
3. Log symptoms (toggle migraine, set intensity, select symptoms)
4. Log mood, sleep, stress
5. If cycle enabled: log period start/end, flow level
6. Mark medications as Taken/Skipped
7. Add any appointments
8. Sheet auto-saves on changes

### Flow 4: Add Medication/Supplement
1. From Day Detail → Tap "Add Medication"
2. Modal opens → Select type
3. If supplement: search Isotonix products
4. Enter dosage, schedule times
5. Toggle reminders
6. Tap "Save" → Returns to Day Detail

### Flow 5: View Fertility Predictions
1. From Calendar Home → View colored indicators
2. Pink days = predicted period
3. Purple circle = predicted ovulation
4. Light purple = high fertility window
5. Tap any day → See details in bottom sheet

---

## Navigation Architecture

```
App Root
├── Onboarding Flow (shown once)
│   ├── Welcome
│   ├── Age Input
│   ├── Sex Selection
│   └── Cycle Opt-in
│
├── Plan Selection Screen
│   └── Create/Edit Plan Modal
│
└── Calendar Home (per plan)
    ├── Day Detail Bottom Sheet
    │   ├── Add Medication Modal
    │   └── Add Appointment Modal
    └── Settings Modal
```

**No bottom tabs** - All navigation via modals and bottom sheets from Calendar Home.

---

## Data Models

### User Profile
- age: number
- sex: 'male' | 'female' | 'other' | 'prefer_not_to_say'
- cycleTrackingEnabled: boolean
- averageCycleLength: number (default 28)
- periodLength: number (default 5)
- onboardingCompleted: boolean

### Treatment Plan
- id: string
- name: string
- healthGoal: string
- duration: number (months)
- startDate: Date
- notes: string
- templateType: 'migraine_fertility'

### Daily Log
- id: string
- planId: string
- date: Date
- migraineOccurred: boolean
- migraineIntensity: number (1-10)
- symptoms: string[] (nausea, aura, light_sensitivity, etc.)
- mood: 'great' | 'good' | 'okay' | 'bad' | 'terrible'
- sleepQuality: number (1-10)
- stressLevel: number (1-10)
- notes: string
- periodStarted: boolean
- periodEnded: boolean
- flowLevel: 'light' | 'medium' | 'heavy' | null

### Medication
- id: string
- planId: string
- type: 'supplement' | 'prescription' | 'otc'
- name: string
- dosage: string
- scheduleTimes: string[] (e.g., ['08:00', '20:00'])
- reminderEnabled: boolean
- notes: string

### Medication Log
- id: string
- medicationId: string
- date: Date
- status: 'taken' | 'skipped' | 'pending'
- actualTime: Date | null

### Appointment
- id: string
- planId: string
- title: string
- type: string (acupuncture, psychology, etc.)
- startTime: Date
- duration: number (minutes)
- location: string
- notes: string
