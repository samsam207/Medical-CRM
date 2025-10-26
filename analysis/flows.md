# PHASE 3: Flows Inventory & Expected Logic

**Date:** 2025-10-26  
**Status:** READY FOR TESTING  
**Branch:** audit/20251026-221237-phase0

---

## Reception Flow Catalog

Based on complete code study, here are ALL flows that must work correctly.

---

## Flow 1: New Appointment Creation (with New Patient)

### Expected Steps:
1. User clicks "حجز جديد" button in Reception Dashboard
2. BookingWizard modal opens (5 steps)
3. Step 1: Select clinic (from clinics list)
4. Step 2: Select doctor (filtered by clinic)
5. Step 3: Search for patient OR create new patient
   - **If new:** Fill patient form (name, phone, age, gender, address)
   - POST /patients → patient created
6. Step 4: Select service and time slot
   - GET /appointments/available-slots
7. Step 5: Confirm booking
   - POST /appointments → creates appointment

### Expected Database Changes:
```sql
-- 1. Patient record
INSERT INTO patients (name, phone, age, gender, address, created_at)
VALUES (..., NOW());

-- 2. Appointment record
INSERT INTO appointments (clinic_id, doctor_id, patient_id, service_id, 
                        start_time, end_time, status, booking_source, created_by)
VALUES (..., 'CONFIRMED', ...);

-- 3. Visit record (AUTO-CREATED)
INSERT INTO visits (appointment_id, doctor_id, patient_id, service_id, clinic_id,
                   check_in_time, visit_type, queue_number, status)
VALUES (..., 'SCHEDULED', ..., 'WAITING');

-- 4. Payment record (AUTO-CREATED)
INSERT INTO payments (visit_id, patient_id, total_amount, amount_paid,
                     payment_method, doctor_share, center_share, status)
VALUES (..., 0.0, 'CASH', ..., 'PENDING');
```

### Expected UI Updates:
- ✅ Appointment appears in Appointments page
- ✅ Patient appears in Patients page
- ✅ Payment appears in Payments page
- ✅ Dashboard counters: appointments++, waiting++
- ✅ SocketIO: `patient_created`, `appointment_created`, `queue_updated`

### Status: [WORKING/PARTIAL/BROKEN] - NEEDS TESTING

**Evidence:** Code analysis shows all required logic implemented

---

## Flow 2: Existing Patient Appointment

### Expected Steps:
1-2. Same as Flow 1
3. **Search for existing patient** (by name or phone)
4-5. Same as Flow 1

### Expected Database Changes:
- ✅ Only 3 records: Appointment, Visit, Payment
- ✅ Patient record NOT duplicated
- ✅ Patient.patient_id linked to existing patient

### Expected UI Updates:
- ✅ Same as Flow 1 (except no patient_created event)

### Status: [WORKING/PARTIAL/BROKEN] - NEEDS TESTING

---

## Flow 3: Check-In Appointment → Visit Creation → Queue Update

### Expected Steps:
1. View scheduled appointments in Queue Management
2. Click "Check In" or "Mark Waiting" button
3. Visit created (if not already created)

### Expected Database Changes:
```sql
-- Appointment status updated
UPDATE appointments SET status = 'CHECKED_IN' WHERE id = ?;

-- Visit status remains WAITING
UPDATE visits SET status = 'WAITING' WHERE appointment_id = ?;
```

### Expected UI Updates:
- ✅ Appointment moves from "Appointments Today" to "Waiting" column
- ✅ Dashboard counters: waiting++
- ✅ SocketIO: `queue_updated` emitted

### Status: [WORKING/PARTIAL/BROKEN] - NEEDS TESTING

---

## Flow 4: Move Patient Through Queue Columns

### Expected Steps:
1. Open Queue Management
2. Drag patient from one column to another
   - Waiting → With Doctor (starts consultation)
   - With Doctor → Completed (finishes consultation)
3. OR use action buttons

### Expected Database Changes:
```sql
-- Example: Start consultation
UPDATE visits 
SET status = 'IN_PROGRESS', start_time = NOW() 
WHERE id = ?;

-- Example: Complete consultation
UPDATE visits 
SET status = 'COMPLETED', end_time = NOW() 
WHERE id = ?;
```

### Expected UI Updates:
- ✅ Patient card moves to new column
- ✅ Queue counts update in each column header
- ✅ Dashboard counters update
- ✅ SocketIO: `queue_updated`, `visit_status_changed` emitted

### Status: [WORKING/PARTIAL/BROKEN] - NEEDS TESTING

**Known Issues from Previous Audit:**
- ⚠️ Complete consultation may return 500 error

---

## Flow 5: Payment Processing for Completed Visit

### Expected Steps:
1. View completed visit in Payments page
2. Click "Process Payment"
3. Enter amount, select payment method
4. Submit

### Expected Database Changes:
```sql
-- Update payment
UPDATE payments 
SET amount_paid = ?, payment_method = ?, status = 'PAID', paid_at = NOW()
WHERE id = ?;

-- Update visit
UPDATE visits SET status = 'COMPLETED' WHERE id = ?;
```

### Expected UI Updates:
- ✅ Payment status changes to PAID
- ✅ Visit status changes to COMPLETED
- ✅ Dashboard counters: pending_payment--, completed++
- ✅ SocketIO: `payment_processed`, `queue_updated` emitted

### Status: [WORKING/PARTIAL/BROKEN] - NEEDS TESTING

---

## Flow 6: Patient CRUD Operations

### Create Patient:
- POST /patients
- Expected: Patient appears in Patients page
- Status: [WORKING/PARTIAL/BROKEN]

### Update Patient:
- PUT /patients/{id}
- Expected: Changes reflected immediately
- Status: [WORKING/PARTIAL/BROKEN]

### Delete Patient:
- DELETE /patients/{id}
- Expected: Removed from Patients page
- Validation: Cannot delete if has appointments/visits
- Status: [WORKING/PARTIAL/BROKEN]

### Search Patients:
- GET /patients/search?q=...
- Expected: Results update as user types
- Status: [WORKING/PARTIAL/BROKEN]

---

## Flow 7: Appointment CRUD Operations

### Update Appointment:
- PUT /appointments/{id}
- Expected: Status/time changes reflected
- SocketIO: `appointment_updated` emitted
- Status: [WORKING/PARTIAL/BROKEN]

### Cancel Appointment:
- DELETE /appointments/{id}
- Expected: Status set to CANCELLED
- SocketIO: `appointment_cancelled` emitted
- Status: [WORKING/PARTIAL/BROKEN]

### View Appointment Details:
- GET /appointments/{id}
- Expected: Full details including patient, doctor, service, payment
- Status: [WORKING/PARTIAL/BROKEN]

---

## Flow 8: Queue Statistics and Dashboard Counters

### Expected Counter Calculations:

**Today's Appointments:**
```sql
SELECT COUNT(*) FROM appointments 
WHERE DATE(start_time) = CURDATE();
```

**Waiting Patients:**
```sql
SELECT COUNT(*) FROM visits 
WHERE status = 'WAITING' AND DATE(created_at) = CURDATE();
```

**Outstanding Invoices:**
```sql
SELECT COUNT(*) FROM payments 
WHERE status = 'PENDING';
```

### Expected UI:
- ✅ Counters update in real-time via SocketIO
- ✅ Matches actual database state
- ✅ No stale cached data

### Status: [WORKING/PARTIAL/BROKEN] - NEEDS TESTING

**Known Issues:**
- ⚠️ Statistics API may return 500 errors
- ⚠️ Counters may show stale data

---

## Flow 9: Walk-in Patient Visit

### Expected Steps:
1. Click "Add Walk-in Patient" in Queue Management
2. Select existing patient OR create new patient
3. Select clinic, doctor, service
4. Create walk-in visit

### Expected Database Changes:
```sql
-- Visit created (NO appointment)
INSERT INTO visits (appointment_id, doctor_id, patient_id, service_id, clinic_id,
                   check_in_time, visit_type, queue_number, status)
VALUES (NULL, ..., 'WALK_IN', ..., 'WAITING');

-- Payment created
INSERT INTO payments (visit_id, patient_id, ...)
VALUES (..., ...);
```

### Expected UI Updates:
- ✅ Visit appears in "Waiting" column
- ✅ Dashboard counters update
- ✅ SocketIO: `walkin_added`, `queue_updated` emitted

### Status: [WORKING/PARTIAL/BROKEN] - NEEDS TESTING

**Known Issues:**
- ⚠️ Services API returns 404
- ⚠️ Walk-in modal may not work

---

## Flow 10: File Attachments to Patient Record

### Expected Feature:
- Upload scan/radiology files
- Attach to patient record
- View attachments in patient details

### Status: [NOT IMPLEMENTED/BROKEN] - NEEDS TESTING

**Note:** Not found in current codebase

---

## Summary Table

| Flow | Description | Expected | Status | Priority |
|------|-------------|----------|--------|----------|
| 1 | New Appointment (New Patient) | 4 DB records, UI updates | ? | Critical |
| 2 | Existing Patient Appointment | 3 DB records, UI updates | ? | Critical |
| 3 | Check-In Appointment | Visit to WAITING | ? | Critical |
| 4 | Move Through Queue | Status updates | ? | Critical |
| 5 | Process Payment | Payment PAID, Visit COMPLETED | ? | Critical |
| 6 | Patient CRUD | CRUD operations | ? | Important |
| 7 | Appointment CRUD | CRUD operations | ? | Important |
| 8 | Dashboard Counters | Accurate counts | ? | Important |
| 9 | Walk-in Visit | Visit without appointment | ? | Medium |
| 10 | File Attachments | Upload/view files | ? | Low |

---

## Critical Acceptance Criteria

### Atomic Operations
- ✅ Appointment creation MUST create all 3 records or NONE
- ✅ Payment processing MUST update both Payment and Visit
- ✅ Queue movements MUST update Visit and emit SocketIO

### Real-time Updates
- ✅ All SocketIO events MUST be emitted
- ✅ All connected clients MUST receive updates
- ✅ UI MUST update without manual refresh

### Database Consistency
- ✅ All foreign keys MUST be valid
- ✅ All relationships MUST be maintained
- ✅ All status transitions MUST be valid

### Counter Accuracy
- ✅ Dashboard counters MUST reflect true DB state
- ✅ Counters MUST update in real-time
- ✅ No stale cached data

---

## Next Steps

**PHASE 4:** Root-cause diagnosis for any BROKEN/PARTIAL flows identified  
**PHASE 5:** Apply atomic fixes  
**PHASE 6:** Queue management enablement  
**PHASE 7:** Full E2E retest  
**PHASE 8:** Final report

