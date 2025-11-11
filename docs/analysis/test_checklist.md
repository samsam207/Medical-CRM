# PHASE 7: Full E2E Testing Checklist

**Date:** 2025-10-26  
**Branch:** audit/20251026-221237-phase0

---

## Pre-Testing Requirements

- [ ] Run database migration (Fix #3)
- [ ] Verify backend running on port 5000
- [ ] Verify frontend running on port 3000
- [ ] Clear browser cache
- [ ] Open Chrome DevTools (Network + Console tabs)

---

## Test Session A: Receptionist Account

### Test 1: Create New Appointment with New Patient

**Steps:**
1. Login as Receptionist
2. Dashboard loads successfully
3. Click "حجز جديد" button
4. Fill wizard:
   - Select Clinic
   - Select Doctor
   - Click "Create New Patient"
   - Enter: Name, Phone, Age, Gender
   - Select Service
   - Select Time Slot
5. Click "Confirm Booking"

**Expected Results:**
- [ ] Patient created in database (check Patients page)
- [ ] Appointment created (check Appointments page)
- [ ] Visit created with status=WAITING
- [ ] Payment created with status=PENDING (check Payments page)
- [ ] Dashboard "Today's appointments" counter increases
- [ ] Dashboard "Waiting patients" counter increases
- [ ] No errors in console or network tab

**Network Verification:**
- [ ] POST /api/patients → 201 Created
- [ ] POST /api/appointments → 201 Created
- [ ] SocketIO: `patient_created` event
- [ ] SocketIO: `appointment_created` event
- [ ] SocketIO: `queue_updated` event

---

### Test 2: Check In Appointment

**Steps:**
1. Go to Appointments page
2. Find confirmed appointment
3. Click "Check In" or move to "Waiting" phase

**Expected Results:**
- [ ] Visit status changes to WAITING
- [ ] Patient appears in Queue Management "Waiting" column
- [ ] Dashboard "Waiting patients" counter increases
- [ ] SocketIO: `queue_updated` event emitted

---

### Test 3: Move Patient Through Queue

**Steps:**
1. Open Queue Management page
2. Find patient in "Waiting" column
3. Click "Call Patient" OR drag to "With Doctor" column

**Expected Results:**
- [ ] Patient moves to "Called" or "With Doctor" column
- [ ] Visit.called_time is set (after migration)
- [ ] SocketIO: `queue_updated` event emitted
- [ ] No errors

**If Drag-and-Drop:**
- [ ] Smooth drag animation
- [ ] Drop target highlights
- [ ] Patient appears in new column

---

### Test 4: Complete Consultation

**Steps:**
1. Find patient in "With Doctor" or "In Progress" column
2. Click "Complete" button

**Expected Results:**
- [ ] Patient moves to "Completed" column
- [ ] Visit.status = COMPLETED
- [ ] Visit.end_time is set
- [ ] SocketIO: `queue_updated` event emitted
- [ ] NO 500 errors (this was fixed in Phase 5)
- [ ] Check logs for detailed logging

**If Error Occurs:**
- [ ] Check console for error message
- [ ] Check backend logs (logs/ directory)
- [ ] Verify visit_id is correct
- [ ] Verify visit exists in database

---

### Test 5: Process Payment for Completed Visit

**Steps:**
1. Find completed visit in Payments page
2. Click "Process Payment"
3. Enter amount and payment method
4. Submit

**Expected Results:**
- [ ] Payment.status = PAID
- [ ] Visit.status remains COMPLETED
- [ ] SocketIO: `payment_processed` event emitted
- [ ] Dashboard "Outstanding invoices" counter decreases

---

### Test 6: Create Walk-in Visit

**Steps:**
1. Open Queue Management
2. Click "Add Walk-in Patient"
3. Select or create patient
4. Select clinic, doctor, service
5. Submit

**Expected Results:**
- [ ] Walk-in visit created (no appointment)
- [ ] Visit appears in "Waiting" column
- [ ] Services dropdown populated (Fix #1)
- [ ] SocketIO: `walkin_added` event emitted
- [ ] NO 404 errors for services API

---

### Test 7: Search and Filter

**Steps:**
1. Use search box in Queue Management
2. Filter by clinic
3. Filter by date range

**Expected Results:**
- [ ] Search filters patients by name/phone
- [ ] Clinic filter shows only selected clinic
- [ ] Date filter shows only selected date
- [ ] Results update in real-time

---

## Test Session B: Doctor Account

### Test 8: Real-time Updates

**Steps:**
1. Open Doctor Dashboard in separate browser window
2. Have Receptionist create appointment (Session A)
3. Observe updates

**Expected Results:**
- [ ] Doctor dashboard updates immediately (no refresh needed)
- [ ] Appointments list updates
- [ ] Queue status updates
- [ ] SocketIO connection active

---

## Regression Tests

### Test 9: Concurrency

**Steps:**
1. Open 2 Receptionist sessions
2. Create 2 appointments simultaneously
3. Have both call patients at same time

**Expected Results:**
- [ ] No race conditions
- [ ] Database remains consistent
- [ ] SocketIO events don't conflict
- [ ] Counters update correctly

---

## Performance Tests

### Test 10: Load

**Steps:**
1. Create 50+ appointments
2. Check in 20+ patients
3. Move patients rapidly through queue

**Expected Results:**
- [ ] No performance degradation
- [ ] UI remains responsive
- [ ] Network requests complete quickly
- [ ] Database queries optimized

---

## Known Issues to Verify Are Fixed

### Fix #1: Services API 404 ✅
**Verify:** Services dropdown in Walk-in modal works

### Fix #2: Complete Consultation 500 ✅  
**Verify:** No 500 errors when completing consultations

### Fix #3: Time Display "N/A" ✅
**Verify:** After migration, times display correctly

### Fix #4: Statistics API Errors ✅
**Verify:** Dashboard statistics load without errors

### Fix #5: Stale Counters ✅
**Verify:** Counters update more frequently (within 10s)

---

## Failure Criteria

**❌ FAIL if:**
- Any Fix #1-5 still shows error
- Database transaction not atomic
- SocketIO events not emitted
- UI doesn't update in real-time
- Counters don't reflect true DB state
- 500 errors occur during any operation

**✅ PASS if:**
- All Fix #1-5 show improved behavior
- All flows work end-to-end
- Real-time updates work across sessions
- No console/network errors
- Performance is acceptable

---

## Results Recording

Save results to:
- `logs/browser_tests/test_results_[date].md`
- `logs/network/` (Network traces)
- `logs/console/` (Console logs)
- `logs/socket_trace/` (SocketIO events)

---

## Notes

- All tests should be performed AFTER running migration for Fix #3
- Capture screenshots of any errors
- Document exact error messages if failures occur
- Note any performance issues

