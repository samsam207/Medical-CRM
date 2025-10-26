# PHASE 2: Browser Walkthrough - Test Plan

**Date:** 2025-10-26  
**Status:** IN PROGRESS  
**Branch:** audit/20251026-221237-phase0

## Test Environment

**Services Running:**
- Backend: http://localhost:5000 (PID: 35456)
- Frontend: http://localhost:3000 (PID: 59232)

**Browser Sessions Needed:**
- Session A: Receptionist account
- Session B: Doctor account

---

## Test Scenario 1: Create New Appointment with New Patient

### Expected Flow:
1. Receptionist logs in
2. Opens "حجز جديد" (New Appointment) wizard
3. Selects clinic
4. Selects doctor
5. Creates new patient (name, phone, age, gender)
6. Selects service
7. Selects time slot
8. Confirms booking

### Expected Results:

**Database Changes:**
- ✅ 1 new Patient record created
- ✅ 1 new Appointment record created (status: CONFIRMED)
- ✅ 1 new Visit record created (status: WAITING)
- ✅ 1 new Payment record created (status: PENDING)

**UI Updates:**
- ✅ Appointment appears in Appointments page
- ✅ Patient appears in Patients page
- ✅ Payment/invoice appears in Payments page
- ✅ Today's appointments counter increments
- ✅ Waiting patients counter increments

**Network Logs:**
```
POST /patients → 201 Created
POST /appointments → 201 Created
  - Response includes: appointment, visit data
```

**SocketIO Events:**
- `patient_created` emitted
- `appointment_created` emitted
- `queue_updated` emitted

**Console Logs:**
- "Patient creation response:" logged
- "Appointment created:" logged
- Dashboard stats refetch triggered

---

## Test Scenario 2: Create Appointment with Existing Patient

### Expected Flow:
1. Use existing patient from search
2. Follow same wizard but select existing patient

### Expected Results:
- ✅ Same as Scenario 1 EXCEPT no patient_created event

---

## Test Scenario 3: Queue Management - Move Patient Through Columns

### Expected Flow:
1. Receptionist opens Queue Management tab
2. Views 4 columns: Appointments → Waiting → In-there → Completed
3. Moves patient from one column to another
4. Observes real-time updates

### Expected Results:

**For Each Movement:**
- ✅ Visit.status updated in database
- ✅ Patient card moves to new column
- ✅ SocketIO: `queue_updated` emitted
- ✅ Dashboard counters update
- ✅ Network: POST /queue/phases/move → 200 OK

**Console Logs:**
- "Queue updated:" logged
- Debounced refetch triggered

---

## Test Scenario 4: Process Payment

### Expected Flow:
1. Receptionist views a completed visit
2. Clicks "Process Payment"
3. Selects payment method
4. Processes payment

### Expected Results:
- ✅ Payment.status updated to PAID
- ✅ Visit.status updated to COMPLETED
- ✅ SocketIO: `payment_processed` emitted
- ✅ Dashboard counters update
- ✅ Network: PUT /payments/{id}/process → 200 OK

---

## Test Scenario 5: Concurrency Test

### Expected Flow:
1. Open Session A (Receptionist)
2. Open Session B (Doctor)
3. Receptionist creates appointment
4. Doctor view updates automatically

### Expected Results:
- ✅ Doctor UI updates without refresh
- ✅ Both sessions show same data
- ✅ SocketIO connection established in both sessions

---

## What to Record

### Network Logs (`logs/network/`)
For each test scenario, record:
- Request URL, method, headers, payload
- Response status, JSON
- Timing data

### Console Logs (`logs/console/`)
- React Query logs
- SocketIO connection status
- Error messages (if any)
- Component lifecycle logs

### Socket Traces (`logs/socket_trace/`)
- Event names
- Payloads
- Timestamp
- Room names

---

## Critical Pass/Fail Criteria

### ❌ FAIL if:
1. Appointment created but Visit/Payment missing
2. SocketIO events not emitted
3. UI doesn't update after action
4. Counters don't reflect database state
5. Database transaction partially committed
6. Real-time updates not working between sessions

### ✅ PASS if:
1. All 3 records created atomically
2. UI updates immediately
3. Counters accurate
4. Real-time updates working
5. No errors in console/network

---

## Browser Test Instructions

**Due to tool limitations, actual browser automation cannot be performed here.**

**Please manually execute:**

1. Open Chrome DevTools
2. Go to Network tab (filter: XHR, WebSocket)
3. Go to Console tab
4. Start recording network and console
5. Execute each test scenario
6. Save logs to `logs/network/` and `logs/console/`
7. Monitor SocketIO events in Network > WS tab

---

## Expected Test Duration

- Scenario 1: 5 minutes
- Scenario 2: 3 minutes
- Scenario 3: 5 minutes
- Scenario 4: 5 minutes
- Scenario 5: 5 minutes
- Total: ~25 minutes

---

## Known Issues to Look For

Based on previous audit reports:

1. **Services API 404 Error** - Walk-in modal may fail
2. **Complete Consultation 500 Error** - Queue completion may fail
3. **Time Display "N/A"** - Visit timestamps may not display
4. **Statistics API Errors** - Dashboard stats may error

These should be verified during Phase 2 testing.

