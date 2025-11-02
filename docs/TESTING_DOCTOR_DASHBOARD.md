# Testing Doctor Dashboard Guide

## 🔐 Login Credentials

The system has pre-seeded doctor accounts. Use these credentials to test:

### Available Doctor Accounts:

| Username | Password | Specialty | Clinic |
|----------|----------|-----------|--------|
| `dr_laila` | `doctor123` | Dermatology | Dermatology Clinic |
| `dr_mohamed` | `doctor123` | Internal Medicine | Internal Medicine Clinic |
| `dr_ahmed` | `doctor123` | Dentistry | Dentistry Clinic |

## 🚀 Quick Start Testing

### 1. **Login as Doctor**

1. Navigate to the login page: `http://localhost:3000/login`
2. Enter one of the doctor credentials above (e.g., `dr_laila` / `doctor123`)
3. You will be redirected to `/reception/dashboard` (same as receptionist)

### 2. **Verify Doctor-Specific Features**

After login, you should see:

#### ✅ **Dashboard Features:**
- **Statistics Cards**: All statistics are automatically filtered to show only data for the logged-in doctor and their clinic
  - Appointments statistics (only this doctor's appointments)
  - Patient statistics (only patients who visited this doctor's clinic)
  - Payment statistics (only payments for this doctor's visits)
  - Queue statistics (only this doctor's clinic queue)

- **Clinic Selector**: 
  - For doctors: **Disabled/Read-only**, showing only their assigned clinic
  - You cannot change the clinic filter

#### ✅ **Navigation:**
- **Sidebar Menu**: Should include all regular menu items PLUS:
  - "الموعد الحالي" (Current Appointment) - **Only visible to doctors**

#### ✅ **Data Filtering:**

All pages automatically filter data by:
- **Doctor ID**: Only showing data related to the logged-in doctor
- **Clinic ID**: Only showing data from the doctor's assigned clinic

**Pages to test:**
1. **Dashboard** (`/reception/dashboard`)
   - All statistics should reflect only your doctor/clinic data
   
2. **Appointments** (`/reception/appointments`)
   - Only shows appointments assigned to you
   - Clinic and Doctor filters are hidden (auto-set)
   
3. **Queue Management** (`/reception/queue`)
   - Only shows queue for your clinic
   - Clinic selector is disabled
   
4. **Patients** (`/reception/patients`)
   - Only shows patients who have visited your clinic
   
5. **Payments** (`/reception/payments`)
   - Only shows payments for your visits
   - Clinic and Doctor filters are disabled (auto-set)
   
6. **Reports** (`/reception/reports`)
   - All reports are filtered by your doctor/clinic
   - Export function works with filtering
   
7. **Clinics & Doctors** (`/reception/clinics-doctors`)
   - Only shows your clinic and doctors in your clinic
   - "Add Clinic" and "Add Doctor" buttons are hidden
   - Edit/Delete buttons are hidden (read-only view)

## 🏥 Testing Current Appointment Feature

### Step 1: Create a Test Scenario

1. **Login as Receptionist** (`sara_reception` / `sara123`)
2. Create an appointment:
   - Create a new patient or use existing
   - Create appointment with the doctor you want to test (e.g., Dr. Laila)
   - Select appropriate date/time
   - Set status to "Confirmed"

3. **Move to Queue:**
   - Go to Queue Management page
   - Find the appointment you just created
   - Click "Check In" to move patient to waiting queue
   - Click "Start Consultation" to move to "with doctor" status

### Step 2: Test as Doctor

1. **Login as Doctor** (e.g., `dr_laila` / `doctor123`)
2. **Navigate to Current Appointment:**
   - Click "الموعد الحالي" (Current Appointment) in the sidebar
   - OR navigate directly to: `http://localhost:3000/doctor/current-appointment`

3. **Verify Displayed Information:**
   - ✅ Patient details (name, phone, age, gender, address, medical history)
   - ✅ Visit type indicator ("First Visit" badge if applicable)
   - ✅ Appointment details (booking ID, scheduled time)
   - ✅ Service information
   - ✅ Clinic information
   - ✅ Queue number
   - ✅ Visit history (previous visits/appointments)

4. **Test Completion:**
   - Add consultation notes (optional)
   - Click "Complete Appointment" button
   - Verify appointment status changes to "completed"
   - Verify redirect back to dashboard

### Step 3: Test Edge Cases

- **No Current Appointment:**
  - If no patient is in "with doctor" status, you should see:
    - "No Current Appointment" message
    - Helpful text explaining when appointments appear
    - "Back to Dashboard" button

- **Multiple Appointments:**
  - Only the most recent appointment in "IN_PROGRESS" status is shown

## 🔒 Testing Security & Access Control

### Test Doctor Restrictions:

1. **Cannot Create/Edit Clinics:**
   - Go to Clinics & Doctors page
   - Verify "Add Clinic" button is hidden
   - Verify Edit/Delete buttons are hidden for clinics

2. **Cannot Create/Edit Doctors:**
   - Verify "Add Doctor" button is hidden
   - Verify Edit/Delete buttons are hidden for doctors

3. **Cannot Create/Edit Patients:**
   - Go to Patients page
   - Verify "Add Patient" button is visible (doctors can view, but cannot create via UI restrictions)

4. **Cannot Create Appointments:**
   - Go to Appointments page
   - Verify "Create Appointment" button may be hidden or restricted

5. **Filter Controls are Disabled:**
   - Clinic selectors are disabled/read-only
   - Doctor selectors are hidden
   - Data is automatically filtered

### Test Access to Own Data:

1. **As Doctor A (`dr_laila`):**
   - Should only see Dermatology clinic data
   - Should only see Dr. Laila's appointments

2. **As Doctor B (`dr_mohamed`):**
   - Should only see Internal Medicine clinic data
   - Should only see Dr. Mohamed's appointments
   - Should NOT see Dr. Laila's data

## 🧪 Testing Data Filtering

### Verify Backend Filtering:

1. **Open Browser DevTools** (F12)
2. **Go to Network tab**
3. **Navigate through different pages**
4. **Check API Requests:**

   Look for requests to:
   - `/api/appointments` - Should include `doctor_id` and `clinic_id` in params
   - `/api/payments` - Should include `doctor_id` and `clinic_id` in params
   - `/api/patients` - Should include `clinic_id` in params
   - `/api/appointments/statistics` - Should include `doctor_id` and `clinic_id`
   - `/api/payments/statistics` - Should include `doctor_id` and `clinic_id`
   - `/api/reports/revenue` - Should include `doctor_id` and `clinic_id`

   Example request should look like:
   ```
   GET /api/appointments?doctor_id=2&clinic_id=1&page=1&per_page=50
   ```

### Verify Frontend Filter Application:

1. Check that `addFilters()` is being called
2. Verify `clinic_id` and `doctor_id` are automatically included in query params
3. Confirm that filter dropdowns are disabled for doctors

## 📊 Testing Statistics

### Dashboard Statistics Verification:

When logged in as a doctor, verify:

1. **Appointment Statistics:**
   - Total appointments = only your appointments
   - Today's appointments = only your appointments for today

2. **Payment Statistics:**
   - Total revenue = only revenue from your visits
   - Pending payments = only payments for your visits

3. **Patient Statistics:**
   - Total patients = only patients who visited your clinic
   - Recent registrations = only patients registered for your clinic

4. **Clinic Statistics:**
   - Should show statistics for only your clinic

5. **Doctor Statistics:**
   - Should show statistics for doctors in your clinic only

## 🐛 Troubleshooting

### Issue: Doctor sees all data (no filtering)

**Solution:**
- Check browser console for errors
- Verify `doctor_id` and `clinic_id` are being sent in API requests
- Check that `useDoctorFilters` hook is working
- Verify backend routes are applying filters correctly

### Issue: Cannot access Current Appointment page

**Solution:**
- Verify route is: `/doctor/current-appointment`
- Check that user role is "doctor" in auth store
- Verify ProtectedRoute allows doctor role

### Issue: Current Appointment shows "No Appointment" when one exists

**Solution:**
- Verify visit status is "IN_PROGRESS"
- Check that the visit's `doctor_id` matches the logged-in doctor
- Verify the appointment is properly linked to the visit

### Issue: Filter controls are not disabled

**Solution:**
- Check that `isDoctor` flag is correctly set in `useDoctorFilters`
- Verify conditional rendering logic in components
- Check that doctor data is properly stored in auth store

## 📝 Expected Behavior Summary

| Feature | Receptionist | Doctor |
|---------|--------------|--------|
| Dashboard Access | ✅ All data | ✅ Filtered by doctor/clinic |
| Create Appointments | ✅ Yes | ❌ No (restricted) |
| Create Patients | ✅ Yes | ❌ No (restricted) |
| Edit Clinics | ✅ Yes | ❌ No |
| Edit Doctors | ✅ Yes | ❌ No |
| View Appointments | ✅ All | ✅ Only own |
| View Payments | ✅ All | ✅ Only own |
| View Patients | ✅ All | ✅ Only clinic patients |
| Current Appointment | ❌ No | ✅ Yes |
| Complete Appointments | ❌ No | ✅ Yes (own only) |
| Filter Controls | ✅ Enabled | ❌ Disabled (auto-filtered) |

## 🎯 Quick Test Checklist

- [ ] Login as doctor (`dr_laila` / `doctor123`)
- [ ] Verify redirect to `/reception/dashboard`
- [ ] Verify statistics show only doctor/clinic data
- [ ] Verify clinic selector is disabled/read-only
- [ ] Verify "Current Appointment" appears in sidebar
- [ ] Navigate to all pages and verify filtering
- [ ] Test Current Appointment page with active visit
- [ ] Complete an appointment and verify redirect
- [ ] Verify cannot edit/create clinics/doctors
- [ ] Verify API requests include `doctor_id` and `clinic_id` params
- [ ] Test with different doctor accounts to verify isolation

---

**Note:** If you need to seed the database with test data, run:
```bash
cd backend
python seed.py
```

This will create the doctor users and their associated doctor records.

