# PHASE 4: Root-Cause Diagnosis

**Date:** 2025-10-26  
**Status:** DIAGNOSIS IN PROGRESS  
**Branch:** audit/20251026-221237-phase0

---

## Issues Identified from Code Study & Previous Audits

### Issue 1: Services API 404 Error (Walk-in Modal)
**Symptom:** Walk-in modal shows 404 error when loading services  
**Impact:** Services dropdown empty, prevents walk-in creation  
**Reference:** Previous audit report (analysis/queue_management_audit_report.md)

**Root Cause Analysis:**

**Frontend Code:** `frontend/src/components/WalkInModal.jsx` (line 55-63)
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

**Issue:** `servicesApi.getServices()` is called, which tries to GET /services, but there's no services route in backend.

**Investigation Results:**
- ✅ `frontend/src/api/services.js` EXISTS
- ❌ Backend `/api/services` route DOES NOT EXIST
- ✅ `clinicsApi.getClinicServices(clinic_id)` EXISTS and calls `/api/clinics/{id}/services`
- ✅ Backend HAS `get_clinic_services` endpoint

**Root Cause:** WalkInModal is calling wrong endpoint (services.js tries to get all services globally, but should get services for specific clinic).

**Proposed Fix:**
Change line 59 in `WalkInModal.jsx` from:
```javascript
const result = await servicesApi.getServices()
return result?.services?.filter(service => service.clinic_id === parseInt(formData.clinic_id)) || []
```

To:
```javascript
const result = await clinicsApi.getClinicServices(formData.clinic_id)
return result?.services || []
```

**Risk Level:** LOW - Only affects walk-in creation  
**Files to Modify:**
- `frontend/src/components/WalkInModal.jsx` (line 59)

---

### Issue 2: Complete Consultation 500 Error
**Symptom:** Clicking "Complete" button on in-progress patient causes 500 error  
**Error Message:** "Incorrect number of binding values for visit_id"  
**Reference:** Previous audit report

**Root Cause Analysis:**

**Backend Code:** `backend/app/routes/queue.py` (line 247-299)
```python
@queue_bp.route('/complete', methods=['POST'])
@receptionist_required
def complete_consultation(current_user):
    # Use filter_by instead of get to avoid primary key issues
    visit = Visit.query.filter_by(id=visit_id).first()
```

**Also in:** `backend/app/services/queue_service.py` (line 207-231)
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

**Issue:** The code already uses `filter_by` instead of `get`, which should fix the primary key issue. However, the error message suggests something else.

**Closer Look:** The error "Incorrect number of binding values" typically means:
1. Too many/too few parameters in a query
2. Database field mismatch
3. Relationship loading issue

**Investigation Needed:**
Check the Visit model to ensure all fields are defined correctly.

**Proposed Fix:**
1. Add better error handling and logging
2. Verify Visit.status transitions are valid
3. Add defensive checks before status update
4. Log the exact visit data before update

**Risk Level:** MEDIUM - Blocks completion flow  
**Files to Modify:**
- `backend/app/services/queue_service.py` (enhance error handling)
- `backend/app/routes/queue.py` (add more logging)

---

### Issue 3: Time Display Shows "N/A"
**Symptom:** All time fields in queue display "N/A"  
**Impact:** Can't see when patient checked in, called, started, completed  
**Reference:** Previous audit report

**Root Cause Analysis:**

**Backend Code:** `backend/app/models/visit.py` (line 59-80)
```python
def to_dict(self):
    return {
        'id': self.id,
        'appointment_id': self.appointment_id,
        'doctor_id': self.doctor_id,
        'patient_id': self.patient_id,
        'service_id': self.service_id,
        'clinic_id': self.clinic_id,
        'check_in_time': self.check_in_time.isoformat() if self.check_in_time else None,
        'start_time': self.start_time.isoformat() if self.start_time else None,
        'end_time': self.end_time.isoformat() if self.end_time else None,
        'status': self.status.value if self.status else None,
        'visit_type': self.visit_type.value if self.status else None,
        'queue_number': self.queue_number,
        'created_at': self.created_at.isoformat() if self.created_at else None,
        # Include related data
        'patient': self.patient.to_dict() if self.patient else None,
        'doctor': self.doctor.to_dict() if self.doctor else None,
        'clinic': self.clinic.to_dict() if self.clinic else None,
        'service': self.service.to_dict() if self.service else None
    }
```

**Frontend Expectation:** `QueueManagement.jsx` (line 137-145)
```javascript
const formatTime = (timeString) => {
  if (!timeString) return 'N/A'
  const date = new Date(timeString)
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: true 
  })
}
```

**Issue:** Frontend is calling `formatTime(appointment.start_time)` but appointment doesn't have these fields directly.

**Looking at queue data structure:**
`backend/app/services/queue_service.py` (line 41-53):
```python
visit_info = {
    'id': visit.id,
    'queue_number': visit.queue_number,
    'patient_name': visit.patient.name,
    'patient_phone': visit.patient.phone,
    'doctor_name': visit.doctor.name,
    'service_name': visit.service.name,
    'visit_type': visit.visit_type.value,
    'check_in_time': visit.check_in_time.isoformat() if visit.check_in_time else None,
    'start_time': visit.start_time.isoformat() if visit.start_time else None,
    'end_time': visit.end_time.isoformat() if visit.end_time else None,
    'status': visit.status.value
}
```

**The Issue:** Frontend is trying to access fields that may not exist in appointment data OR the Visit model doesn't have proper timestamp fields for certain statuses.

**Investigation:** Visit model has:
- `check_in_time` ✅
- `start_time` ✅
- `end_time` ✅

But what about `called_time`, `consultation_start_time`, `consultation_end_time`?

**Looking at Visit model:** (line 19-32)
```python
check_in_time = db.Column(db.DateTime, nullable=False)
start_time = db.Column(db.DateTime)
end_time = db.Column(db.DateTime)
```

**The Real Issue:** Visit model doesn't have `called_time` field! Frontend expects this but it doesn't exist.

**Proposed Fix:**
1. Add `called_time` column to Visit model
2. Update migration to add this field
3. Set `called_time` when status changes to CALLED
4. Update frontend to use correct field names

**Risk Level:** MEDIUM - Affects user experience  
**Files to Modify:**
- `backend/app/models/visit.py` (add called_time field)
- Migrations (create migration)
- `backend/app/routes/queue.py` (set called_time)
- `frontend/src/components/QueueManagement.jsx` (use correct fields)

---

### Issue 4: Statistics API Errors
**Symptom:** Some 500 errors on statistics endpoint  
**Impact:** Dashboard may not load properly  
**Reference:** Previous audit report

**Root Cause Analysis:**

**Backend Code:** `backend/app/services/queue_service.py` (line 451-511)
```python
def get_queue_statistics(self, clinic_id, date=None):
    # Get all visits for the date
    visits = db.session.query(Visit).filter(
        Visit.clinic_id == clinic_id,
        db.func.date(Visit.created_at) == date
    ).all()
```

**Issue:** The try/except block catches ALL exceptions and returns empty stats. This masks the real error.

**Better Error Handling:** Already implemented (lines 456-473), but let's improve it.

**Proposed Fix:**
1. Add more specific error handling
2. Log actual errors
3. Return proper error responses instead of empty stats
4. Add validation for clinic_id and date parameters

**Risk Level:** LOW - Affects dashboard display  
**Files to Modify:**
- `backend/app/services/queue_service.py` (improve error handling)
- `backend/app/routes/queue.py` (add validation)

---

### Issue 5: Dashboard Counters May Be Stale

**Root Cause Analysis:**

**Frontend:** Dashboard stats are cached and may not update in real-time.

**Code:** `frontend/src/pages/ReceptionDashboard.jsx` (line 28-32)
```javascript
const { data: stats, isLoading, error, refetch } = useQuery({
  queryKey: ['dashboard-stats'],
  queryFn: dashboardApi.getStats,
  refetchInterval: 30000 // Refresh every 30 seconds
})
```

**SocketIO Events:** Listens to events but has 500ms debounce (line 44-60)

**Issue:** 30-second refetch interval may be too long. Events are debounced by 500ms, which should help.

**Proposed Fix:**
1. Reduce refetch interval to 10 seconds
2. Ensure socket events immediately invalidate cache
3. Add loading states during refetch

**Risk Level:** LOW - Minor delay in counter updates  
**Files to Modify:**
- `frontend/src/pages/ReceptionDashboard.jsx` (reduce interval)

---

## Summary of Diagnosis

| Issue | Severity | Root Cause | Files Affected | Proposed Fix |
|-------|----------|------------|----------------|--------------|
| 1. Services 404 | LOW | Missing API | WalkInModal.jsx | Use clinics endpoint |
| 2. Complete 500 | MEDIUM | Primary key issue? | queue.py, queue_service.py | Add logging, better error handling |
| 3. Time N/A | MEDIUM | Missing `called_time` field | Visit model, migrations | Add field + migration |
| 4. Stats Error | LOW | Generic error handling | queue_service.py | Specific error logging |
| 5. Stale Counters | LOW | Long refetch interval | ReceptionDashboard.jsx | Reduce to 10s |

---

## Proposed Fix Priority

**Critical (Do First):**
1. Issue #3: Time display "N/A" - Add `called_time` field
2. Issue #2: Complete consultation 500 - Add better error handling

**Important (Do Second):**
3. Issue #1: Services 404 - Use correct endpoint
4. Issue #4: Stats errors - Better error handling

**Minor (Do Third):**
5. Issue #5: Stale counters - Reduce refetch interval

---

## Next Steps

For each fix:
1. Create backup of target files
2. Apply minimal changes
3. Test in browser
4. Document results

**Risk Assessment:** All fixes are minimal and reversible.

