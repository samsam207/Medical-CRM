# Medical CRM - UI/UX Redesign Inventory

## Project Overview
Medical CRM application built with React frontend and Flask backend. Arabic language (RTL) support. Uses Tailwind CSS for styling with a custom medical-themed color palette.

---

## 1. Routes & Pages

### Public Routes
- **`/login`** - `pages/Login.jsx`
  - Authentication page
  - Uses `authStore` for login
  - Redirects authenticated users to `/reception/dashboard`

### Protected Routes (require authentication)
All protected routes use `ProtectedRoute` wrapper with role-based access control.

#### Reception Routes (wrapped in `AppShell`)
- **`/reception/dashboard`** - `pages/DashboardPage.jsx`
  - Main dashboard with statistics and charts
  - Shows appointment stats, queue stats, patient stats, revenue
  
- **`/reception`** - Redirects to `/reception/dashboard`

- **`/reception/patients`** - `pages/PatientsListPage.jsx`
  - Patient list with search, filters, pagination
  - CRUD operations for patients

- **`/reception/appointments`** - `pages/AppointmentsPage.jsx`
  - Appointment list with calendar view
  - Filtering by date, clinic, doctor, status
  - Booking, editing, rescheduling, canceling appointments

- **`/reception/payments`** - `pages/PaymentsPage.jsx`
  - Payment list with filtering
  - Payment processing and refunds

- **`/reception/reports`** - `pages/ReportsPage.jsx`
  - Revenue reports, appointment reports
  - Date range filtering

- **`/reception/clinics-doctors`** - `pages/ClinicsAndDoctorsPage.jsx`
  - Management of clinics, doctors, and services
  - Nested UI for clinic → doctor → service hierarchy

- **`/reception/queue`** - `pages/QueueManagementPage.jsx`
  - Queue management with drag-and-drop
  - Real-time updates via Socket.IO

#### Doctor Routes
- **`/doctor`** - `pages/DoctorDashboard.jsx`
  - Doctor-specific dashboard
  - Queue view and appointment management

- **`/doctor/current-appointment`** - `pages/CurrentAppointmentPage.jsx`
  - Current appointment details and notes
  - Visit management

---

## 2. Components Structure

### Layout Components
- **`components/layout/AppShell.jsx`**
  - Main app shell wrapper
  - Includes header, sidebar, notifications
  - Handles responsive layout

- **`components/layout/Sidebar.jsx`**
  - Collapsible sidebar navigation
  - Role-based menu items
  - RTL-aware navigation
  - Medical-themed gradient design

- **`components/layout/PageContainer.jsx`**
  - Consistent page wrapper
  - Handles spacing and container logic

### Common/Shared Components
- **`components/common/Button.jsx`**
  - Reusable button component
  - Variants: primary, secondary, accent, outline, ghost, danger, success, warning
  - Sizes: sm, md, lg
  - Loading state support

- **`components/common/Card.jsx`**
  - Card container component
  - CardHeader, CardTitle, CardContent exports

- **`components/common/Badge.jsx`**
  - Status badge component

- **`components/common/Modal.jsx`**
  - Custom modal component
  - Backdrop with blur
  - Size variants: sm, md, lg, xl
  - Body overflow management

- **`components/common/Spinner.jsx`**
  - Loading spinner component
  - Size variants

- **`components/common/ProtectedRoute.jsx`**
  - Route protection with role checking
  - Redirects unauthorized users

- **`components/common/ErrorBoundary.jsx`**
  - React error boundary

- **`components/common/SentryErrorBoundary.jsx`**
  - Sentry integration for error tracking

### UI Kit Components (Radix UI based)
Located in `components/ui/`:
- **`avatar.jsx`** - Avatar component (Radix UI)
- **`badge.jsx`** - Badge component
- **`button.jsx`** - Button component (Radix UI based)
- **`card.jsx`** - Card component
- **`dialog.jsx`** - Dialog component (Radix UI)
- **`input.jsx`** - Input component
- **`label.jsx`** - Label component (Radix UI)
- **`separator.jsx`** - Separator component (Radix UI)
- **`skeleton.jsx`** - Skeleton loader
- **`table.jsx`** - Table component

**Note:** There's duplication between `components/common/` and `components/ui/` (e.g., Button, Card, Badge). The UI kit components use Radix UI primitives.

### Feature-Specific Components

#### Dashboard Components
- **`components/dashboard/StatCard.jsx`**
  - Statistics card with icon, value, label, trend

- **`components/dashboard/AppointmentTrendChart.jsx`**
  - Chart showing appointment trends (using Recharts)

- **`components/dashboard/RevenueChart.jsx`**
  - Revenue chart (using Recharts)

#### Booking & Appointments
- **`components/BookingWizard.jsx`**
  - Multi-step booking wizard
  - Patient selection, clinic/doctor selection, date/time, confirmation
  - Form validation

#### Queue Management
- **`components/QueueManagement.jsx`**
  - Queue visualization with drag-and-drop
  - Phase management (waiting, in-progress, completed)
  - Real-time updates

- **`components/DoctorQueue.jsx`**
  - Doctor-specific queue view

- **`components/DoctorQueueDashboard.jsx`**
  - Doctor queue dashboard component

#### Forms & Modals
- **`components/ClinicFormModal.jsx`**
  - Create/edit clinic modal
  - Form validation

- **`components/DoctorFormModal.jsx`**
  - Create/edit doctor modal
  - Form validation

- **`components/ServiceFormModal.jsx`**
  - Create/edit service modal
  - Form validation

- **`components/WalkInModal.jsx`**
  - Walk-in patient registration
  - Patient search and creation

#### Schedule
- **`components/ScheduleGrid.jsx`**
  - Appointment schedule grid view

---

## 3. Modals & Dialogs

### Modal Components
1. **Common/Modal.jsx** - Base modal component
2. **UI/Dialog.jsx** - Radix UI Dialog (alternative)
3. **ClinicFormModal.jsx** - Clinic CRUD
4. **DoctorFormModal.jsx** - Doctor CRUD
5. **ServiceFormModal.jsx** - Service CRUD
6. **WalkInModal.jsx** - Walk-in registration
7. **BookingWizard** - Multi-step booking (uses Modal internally)

### Modal Usage Patterns
Modals are controlled via state in parent components:
- `useState` for `isOpen`/`isModalOpen` flags
- Conditional rendering: `{isOpen && <Modal>...}`
- Modal props: `isOpen`, `onClose`, `title`, `children`

---

## 4. Forms & Validation

### Form Management
- **State Management:** Most forms use React `useState` (not react-hook-form)
- **Validation:** Custom validation in `utils/validation.js`
- **Form Components:**
  - Standard HTML inputs with Tailwind styling
  - Custom styled inputs in `components/ui/input.jsx`

### Form Patterns
1. **Simple Forms:** Direct `useState` for form data
   - Login.jsx
   - Patient forms
   - Clinic/Doctor/Service modals

2. **Multi-step Forms:** Step-based state management
   - BookingWizard.jsx (uses `currentStep` state)

3. **Validation:**
   - Custom validation functions
   - Client-side validation before API calls
   - Error state management per field

### Form Locations
- Login form: `pages/Login.jsx`
- Patient forms: `pages/PatientsListPage.jsx` (embedded modals)
- Clinic forms: `components/ClinicFormModal.jsx`
- Doctor forms: `components/DoctorFormModal.jsx`
- Service forms: `components/ServiceFormModal.jsx`
- Booking form: `components/BookingWizard.jsx`
- Walk-in form: `components/WalkInModal.jsx`
- Payment forms: `pages/PaymentsPage.jsx`
- Appointment forms: `pages/AppointmentsPage.jsx`

---

## 5. Styling System

### Tailwind CSS Configuration
- **Config File:** `frontend/tailwind.config.js`
- **Main CSS:** `frontend/src/index.css`

### Color Palette (Medical Theme)
Defined in `tailwind.config.js`:

#### Medical Blue-Green Palette
- **medical.blue:** Sky blue (#0EA5E9) - Primary
- **medical.green:** Emerald (#10B981) - Secondary
- **medical.slate:** Neutral grays

#### Semantic Colors
- **primary:** Blue tones
- **secondary:** Green tones
- **success:** Green (#10B981)
- **warning:** Amber/Yellow
- **error:** Red tones

### Typography
- **Arabic Font:** 'Cairo', 'Tajawal', 'Noto Sans Arabic'
- **RTL Support:** Full RTL layout support
- **Font Classes:** `font-arabic`, `font-inter`

### Custom Animations (defined in tailwind.config.js)
- `fade-in`
- `slide-in`
- `slide-up`
- `pulse-glow`
- `shimmer`
- `counter`
- `ripple`
- `heartbeat`
- `chart-grow`

### Custom Utilities (index.css)
- `.btn-primary`, `.btn-secondary`, `.btn-accent`, `.btn-outline`
- `.input-field`
- `.card-modern`
- `.card-header-modern`, `.card-content-modern`
- `.text-primary`, `.text-secondary`, `.text-accent`
- `.animate-fade-in`, `.animate-slide-in`, `.animate-bounce-soft`

### Shadows
- `shadow-premium`
- `shadow-premium-lg`
- `shadow-medical`, `shadow-medical-lg`
- `shadow-glow-blue`, `shadow-glow-green`, `shadow-glow-amber`, `shadow-glow-red`

### Responsive Design
- Mobile-first approach
- Tailwind breakpoints (sm, md, lg, xl)
- RTL-aware responsive classes

---

## 6. API Integration

### API Client
- **Base Client:** `src/api/client.js`
  - Axios instance with interceptors
  - Automatic token refresh on 401
  - Request/response interceptors
  - Base URL: `/api`

### API Modules
Located in `src/api/`:
1. **`index.js`** - Main API exports
2. **`client.js`** - Axios client with auth interceptors
3. **`appointments.js`** - Appointment API calls
4. **`patients.js`** - Patient API calls
5. **`payments.js`** - Payment API calls
6. **`queue.js`** - Queue API calls
7. **`clinics.js`** - Clinic API calls
8. **`doctors.js`** - Doctor API calls
9. **`dashboard.js`** - Dashboard statistics
10. **`reports.js`** - Reports API
11. **`services.js`** - Service API
12. **`visits.js`** - Visit API

### Backend Routes (Flask)
Located in `backend/app/routes/`:
- **`auth.py`** - Authentication (`/auth/login`, `/auth/refresh`, `/auth/logout`, `/auth/me`)
- **`appointments.py`** - Appointment endpoints
- **`patients.py`** - Patient endpoints
- **`payments.py`** - Payment endpoints
- **`queue.py`** - Queue management
- **`clinics.py`** - Clinic CRUD
- **`doctors.py`** - Doctor CRUD
- **`dashboard.py`** - Dashboard statistics
- **`reports.py`** - Reports generation
- **`visits.py`** - Visit management
- **`prescriptions.py`** - Prescription management
- **`health.py`** - Health check

---

## 7. State Management

### Zustand Stores
Located in `src/stores/`:
1. **`authStore.js`**
   - User authentication state
   - Login/logout logic
   - Token management
   - User info and role
   - Persisted via zustand persist middleware

2. **`queueStore.js`**
   - Queue state management
   - Real-time queue updates
   - Selected clinic/doctor filters

3. **`notificationStore.js`**
   - Notification management
   - Toast notifications

### React Context
- **`contexts/LayoutContext.jsx`**
  - Layout state (sidebar collapsed state)
  - Shared layout configuration

### React Query (@tanstack/react-query)
- Used extensively for data fetching
- Query caching and refetching
- Mutation handling
- Auto-refresh intervals for real-time data

---

## 8. Hooks

Located in `src/hooks/`:
- **`useDebounce.js`** - Debounce hook for search inputs
- **`useSocket.js`** - Socket.IO connection hook
- **`useLocalStorage.js`** - LocalStorage sync hook
- **`useMutationWithRefetch.js`** - Mutation with auto-refetch
- **`useDoctorFilters.js`** - Doctor/clinic filter logic

---

## 9. Utilities

Located in `src/utils/`:
- **`formatters.js`** - Date/time/currency formatting
- **`validation.js`** - Form validation rules
- **`sentry.js`** - Sentry error tracking setup
- Additional utility files as needed

Located in `src/lib/`:
- **`utils.js`** - Utility functions (cn helper for class merging)

---

## 10. Real-time Features

### Socket.IO Integration
- **Hook:** `hooks/useSocket.js`
- **Handler:** `backend/app/socketio_handlers/queue_events.py`
- **Usage:**
  - Queue updates
  - Appointment status changes
  - Real-time notifications

---

## 11. Error Handling

- **Error Boundaries:** `ErrorBoundary.jsx`, `SentryErrorBoundary.jsx`
- **Sentry Integration:** Error tracking and reporting
- **API Error Handling:** Centralized in `api/client.js` interceptors
- **Form Validation Errors:** Per-form state management

---

## 12. Accessibility

### Current State
- Basic RTL support
- Semantic HTML usage
- Keyboard navigation (partial)
- **Needs Improvement:**
  - ARIA labels
  - Screen reader support
  - Focus management
  - Color contrast (verify WCAG compliance)

---

## 13. Testing

### Test Files
- `backend/tests/test_appointments.py`
- `backend/tests/test_auth.py`
- Frontend testing infrastructure exists but limited tests

### Testing Tools
- **Backend:** pytest (Flask-Testing)
- **Frontend:** Vitest, @testing-library/react (configured, limited usage)

---

## 14. Build & Dependencies

### Frontend Dependencies (Key)
- **React 18.2.0**
- **React Router DOM 6.8.1**
- **Tailwind CSS 3.4.18**
- **Axios 1.3.4**
- **Zustand 4.4.1** (state management)
- **@tanstack/react-query 4.24.6** (data fetching)
- **Radix UI** components (dialog, dropdown, select, etc.)
- **Recharts 2.5.0** (charts)
- **Socket.IO Client 4.6.1** (real-time)
- **React Hook Form 7.43.5** (installed but not widely used)
- **Zod 3.21.4** (validation - installed but not widely used)
- **Framer Motion 12.23.24** (animations)
- **Lucide React** (icons)
- **Sentry** (error tracking)

### Build Tools
- **Vite 4.1.0** (build tool)
- **PostCSS**
- **Autoprefixer**

---

## 15. File Structure Summary

```
frontend/
├── src/
│   ├── api/           # API client modules
│   ├── components/   # React components
│   │   ├── common/   # Shared/common components
│   │   ├── dashboard/ # Dashboard-specific components
│   │   ├── layout/   # Layout components
│   │   └── ui/       # UI kit (Radix UI based)
│   ├── contexts/     # React contexts
│   ├── hooks/        # Custom React hooks
│   ├── lib/          # Utility libraries
│   ├── pages/        # Page components (routes)
│   ├── stores/       # Zustand stores
│   ├── utils/        # Utility functions
│   ├── App.jsx       # Main app component
│   ├── main.jsx      # Entry point
│   └── index.css     # Global styles
├── tailwind.config.js
├── vite.config.js
└── package.json

backend/
├── app/
│   ├── models/       # SQLAlchemy models
│   ├── routes/       # Flask route handlers
│   ├── services/     # Business logic services
│   ├── socketio_handlers/ # Socket.IO handlers
│   ├── tasks/        # Celery tasks
│   └── utils/        # Utility functions
└── requirements.txt
```

---

## 16. Key Observations

### Component Duplication
- **Button:** `components/common/Button.jsx` and `components/ui/button.jsx`
- **Card:** `components/common/Card.jsx` and `components/ui/card.jsx`
- **Badge:** `components/common/Badge.jsx` and `components/ui/badge.jsx`

**Recommendation:** Consolidate into a single design system during redesign.

### Form Management
- Most forms use `useState` instead of `react-hook-form` (which is installed)
- Custom validation instead of Zod (which is installed)
- **Recommendation:** Standardize form management approach.

### Styling Consistency
- Mix of utility classes and custom CSS classes
- Some components use Tailwind directly, others use custom classes
- **Recommendation:** Establish consistent styling patterns.

### Modal Patterns
- Two modal systems: Custom `Modal.jsx` and Radix UI `Dialog.jsx`
- Inconsistent usage across components
- **Recommendation:** Standardize on one modal system.

---

## End of Inventory

