# PHASE 4: Proposed Fixes - Detailed

**Date:** 2025-10-26  
**Status:** READY FOR APPROVAL  
**Branch:** audit/20251026-221237-phase0

---

## Fix #1: Services API 404 Error in Walk-in Modal

**Severity:** LOW  
**Impact:** Prevents walk-in creation

### Root Cause
WalkInModal calls `servicesApi.getServices()` which tries to GET `/api/services`, but this route doesn't exist in backend. Should use `clinicsApi.getClinicServices(clinic_id)` instead.

### Proposed Code Change

**File:** `frontend/src/components/WalkInModal.jsx`  
**Line:** 55-63

**Current Code:**
```javascript
const { data: services = [] } = useQuery({
  queryKey: ['services', formData.clinic_id],
  queryFn: async () => {
    if (!formData.clinic_id) return []
    const result = await servicesApi.getServices()
    return result?.services?.filter(service => service.clinic_id === parseInt(formData.clinic_id)) || []
  },
  enabled: !!formData.clinic_id
})
```

**Change To:**
```javascript
const { data: services = [] } = useQuery({
  queryKey: ['services', formData.clinic_id],
  queryFn: async () => {
    if (!formData.clinic_id) return []
    const result = await clinicsApi.getClinicServices(formData.clinic_id)
    return result?.services || []
  },
  enabled: !!formData.clinic_id
})
```

**Also add import at top:**
```javascript
import { clinicsApi } from '../api/clinics'
```

### Testing
1. Open Queue Management
2. Click "Add Walk-in Patient"
3. Verify services dropdown populates
4. Verify no 404 errors in Network tab

---

## Fix #2: Complete Consultation 500 Error

**Severity:** MEDIUM  
**Impact:** Blocks completion flow

### Root Cause
The error "Incorrect number of binding values for visit_id" suggests a database query issue. Code already uses `filter_by` which is correct, but error handling needs improvement.

### Proposed Code Change

**File:** `backend/app/services/queue_service.py`  
**Line:** 207-231

**Current Code:**
```python
def complete_consultation(self, visit_id, notes=''):
    # Use filter_by instead of get to avoid primary key issues
    visit = Visit.query.filter_by(id=visit_id).first()
    if not visit:
        raise ValueError(f"Visit not found: {visit_id}")
    
    if visit.status != VisitStatus.IN_PROGRESS:
        raise ValueError(f"Consultation must be in progress to complete. Current status: {visit.status}")
    
    visit.status = VisitStatus.COMPLETED
    visit.end_time = datetime.utcnow()
    
    # Update appointment status if visit has an appointment
    if visit.appointment_id and visit.appointment:
        from app.models.appointment import AppointmentStatus
        visit.appointment.status = AppointmentStatus.COMPLETED
    
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        raise ValueError(f"Database error: {str(e)}")
    
    return visit
```

**Change To:**
```python
def complete_consultation(self, visit_id, notes=''):
    """Complete consultation and mark as completed"""
    from flask import current_app
    
    # Log the attempt
    current_app.logger.info(f"Starting completion for visit_id={visit_id}")
    
    # Use filter_by instead of get to avoid primary key issues
    visit = Visit.query.filter_by(id=visit_id).first()
    if not visit:
        current_app.logger.error(f"Visit not found: {visit_id}")
        raise ValueError(f"Visit not found: {visit_id}")
    
    current_app.logger.info(f"Visit found: id={visit.id}, status={visit.status}, appointment_id={visit.appointment_id}")
    
    # Check if visit is in correct status
    if visit.status != VisitStatus.IN_PROGRESS:
        current_app.logger.error(f"Invalid status for completion: current={visit.status}, expected=IN_PROGRESS")
        raise ValueError(f"Consultation must be in progress to complete. Current status: {visit.status}")
    
    # Update visit
    visit.status = VisitStatus.COMPLETED
    visit.end_time = datetime.utcnow()
    
    # Update appointment status if visit has an appointment
    if visit.appointment_id:
        from app.models.appointment import AppointmentStatus
        appointment = Appointment.query.get(visit.appointment_id)
        if appointment:
            appointment.status = AppointmentStatus.COMPLETED
            current_app.logger.info(f"Updated appointment {appointment.id} to COMPLETED")
    
    # Commit changes
    try:
        db.session.commit()
        current_app.logger.info(f"Successfully completed visit {visit.id}")
    except Exception as e:
        db.session.rollback()
        current_app.logger.error(f"Database error completing visit {visit.id}: {str(e)}")
        import traceback
        current_app.logger.error(traceback.format_exc())
        raise ValueError(f"Database error: {str(e)}")
    
    return visit
```

### Testing
1. Start a consultation (status: IN_PROGRESS)
2. Click "Complete" button
3. Verify visit status changes to COMPLETED
4. Verify no 500 errors
5. Check logs for detailed error messages if it fails

---

## Fix #3: Time Display Shows "N/A" - Missing called_time Field

**Severity:** MEDIUM  
**Impact:** Affects user experience

### Root Cause
Visit model doesn't have `called_time` field. Frontend expects this field but it doesn't exist in database schema.

### Proposed Code Change

**Step 1: Add Migration**

Create new migration file: `backend/migrations/versions/add_called_time_to_visits.py`

```python
"""add called_time to visits

Revision ID: xxxx
Revises: previous_revision
Create Date: 2025-10-26

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import sqlite

def upgrade():
    # Add called_time column
    op.add_column('visits', sa.Column('called_time', sa.DateTime(), nullable=True))

def downgrade():
    op.drop_column('visits', 'called_time')
```

**Step 2: Update Visit Model**

**File:** `backend/app/models/visit.py`  
**Line:** Add after line 27

**Add:**
```python
called_time = db.Column(db.DateTime)
```

**Also update __init__ (line 44):**
```python
def __init__(self, doctor_id, patient_id, service_id, clinic_id, check_in_time, 
             visit_type, queue_number, appointment_id=None, start_time=None, 
             end_time=None, status=None, called_time=None):
    # ... existing code ...
    if called_time:
        self.called_time = called_time
```

**And update to_dict (line 59-80):**
Add:
```python
'called_time': self.called_time.isoformat() if self.called_time else None,
```

**Step 3: Update Queue Service**

**File:** `backend/app/services/queue_service.py`  
**Function:** `call_patient` (line 178-190)

**Current:**
```python
def call_patient(self, visit_id):
    visit = Visit.query.get(visit_id)
    if not visit:
        raise ValueError("Visit not found")
    
    if visit.status != VisitStatus.WAITING:
        raise ValueError("Only waiting patients can be called")
    
    visit.status = VisitStatus.CALLED
    db.session.commit()
    
    return visit
```

**Change To:**
```python
def call_patient(self, visit_id):
    visit = Visit.query.get(visit_id)
    if not visit:
        raise ValueError("Visit not found")
    
    if visit.status != VisitStatus.WAITING:
        raise ValueError("Only waiting patients can be called")
    
    visit.status = VisitStatus.CALLED
    visit.called_time = datetime.utcnow()  # Add this line
    db.session.commit()
    
    return visit
```

**File:** `backend/app/routes/queue.py`  
**Line:** ~185

**Add:**
```python
visit.called_time = datetime.utcnow()
```

### Testing
1. Check in a patient (status: WAITING)
2. Call the patient
3. Verify called_time is set in database
4. Verify frontend displays correct called time (not "N/A")

---

## Fix #4: Statistics API Errors

**Severity:** LOW  
**Impact:** Dashboard may not load stats

### Root Cause
Generic error handling masks actual errors.

### Proposed Code Change

**File:** `backend/app/services/queue_service.py`  
**Line:** 451-511

Add specific error handling:
```python
def get_queue_statistics(self, clinic_id, date=None):
    """Get queue statistics for a clinic on a specific date"""
    from flask import current_app
    
    if not date:
        date = datetime.now().date()
    
    try:
        # Validate clinic_id
        if clinic_id is None:
            raise ValueError("clinic_id is required")
        
        # Get all visits for the date
        visits = db.session.query(Visit).filter(
            Visit.clinic_id == clinic_id,
            db.func.date(Visit.created_at) == date
        ).all()
    except ValueError as e:
        current_app.logger.error(f"Validation error in get_queue_statistics: {str(e)}")
        raise
    except Exception as e:
        # Log specific error
        current_app.logger.error(f"Database error in get_queue_statistics: {str(e)}")
        import traceback
        current_app.logger.error(traceback.format_exc())
        # Return empty stats instead of raising
        return {
            'date': date.isoformat(),
            'total_appointments': 0,
            'waiting_count': 0,
            'called_count': 0,
            'in_progress_count': 0,
            'completed_count': 0,
            'avg_wait_time_minutes': 0,
            'avg_consultation_time_minutes': 0,
            'error': str(e)
        }
    
    # Continue with rest of function...
```

### Testing
1. Load dashboard
2. Check console/network for stats API errors
3. Verify stats still display even if errors occur

---

## Fix #5: Dashboard Counters Stale Data

**Severity:** LOW  
**Impact:** Counters may be slightly delayed

### Proposed Code Change

**File:** `frontend/src/pages/ReceptionDashboard.jsx`  
**Line:** 31

**Change From:**
```javascript
refetchInterval: 30000 // Refresh every 30 seconds
```

**To:**
```javascript
refetchInterval: 10000 // Refresh every 10 seconds
```

### Testing
1. Create appointment in one tab
2. Observe counter update in another tab (should update within 10s or via SocketIO)

---

## Summary of Fixes

| Fix | Files Changed | Lines | Risk | Priority |
|-----|--------------|-------|------|----------|
| 1. Services 404 | WalkInModal.jsx | 1 | LOW | Medium |
| 2. Complete 500 | queue_service.py | ~10 | MEDIUM | Critical |
| 3. Time N/A | Visit model + migration | ~5 | MEDIUM | Critical |
| 4. Stats errors | queue_service.py | ~5 | LOW | Low |
| 5. Stale counters | ReceptionDashboard.jsx | 1 | LOW | Low |

**Total Files to Modify:** 5 files  
**Total Risk:** Low-Medium  
**Estimated Time:** 30 minutes

