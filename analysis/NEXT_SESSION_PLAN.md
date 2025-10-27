# Next Session Plan - Reception Dashboard Audit Continuation

## Current Status
- ✅ Environment: Set up and working
- ✅ Authentication: Verified and working  
- ✅ Dashboard Stats: Working
- ✅ Booking Wizard: Steps 1-2 tested
- ✅ Queue Management: Display verified
- ⚠️ Socket.IO: Connection failing (400 error)
- ⚠️ Booking Wizard: Date picker issue blocks completion

## Priority 1: Fix Socket.IO Connection (HIGH)

### Issue
- WebSocket connection returning 400 BAD REQUEST
- Error: `WebSocket connection to 'ws://localhost:5000/socket.io/' failed: 400`

### Investigation Steps
1. Check `backend/app/socketio_handlers/queue_events.py` line 33-53
2. Review authentication flow in `handle_connect`
3. Check if token is being properly extracted
4. Test with temporary auth bypass for debugging
5. Check backend logs for specific error message

### Files to Check
- `backend/app/socketio_handlers/queue_events.py`
- `frontend/src/hooks/useSocket.js`
- Backend terminal logs

### Expected Fix
- Either fix authentication or make it optional for testing
- Enable polling transport as fallback

---

## Priority 2: Fix Booking Wizard Date Picker (MEDIUM)

### Issue
- Defaults to today (Sunday) causing error when doctor doesn't work Sunday
- Error: "Doctor doesn't work on Sunday"

### Solution
**Option A**: Set default to next Monday
```javascript
const [selectedDate, setSelectedDate] = useState(() => {
  const today = new Date();
  const day = today.getDay();
  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + ((1 + 7 - day) % 7 || 7));
  return nextMonday;
});
```

**Option B**: Add validation and warning message

### Files to Modify
- `frontend/src/components/BookingWizard.jsx` (line 25 or around)

---

## Priority 3: Complete Booking Wizard Testing

### After fixes above, test:
1. ✅ Step 1: Clinic Selection
2. ✅ Step 2: Doctor Selection  
3. ❌ Step 3: Patient Selection & Creation
4. ❌ Step 4: Service & Time Selection
5. ❌ Step 5: Confirmation & Submission

### Test Scenarios
- Select existing patient from search
- Create new patient (all fields)
- Select service
- Select time slot (on Monday/Wednesday/Friday)
- Verify appointment creation in database
- Check for visit and payment records

---

## Priority 4: Test Queue Management Actions

### Test Flow
1. Navigate to Queue Management tab
2. Click "Mark Waiting" button on appointment
3. Verify patient moves from "Appointments Today" to "Waiting"
4. Click "Call Patient" button
5. Verify patient moves to "With Doctor"
6. Click "Complete" button
7. Verify patient moves to "Completed"
8. Click "Process Payment" button
9. Verify payment processing

### Database Verification
After each action, check:
- Visit status updated in database
- Appointment status updated (if applicable)
- Queue display updates

---

## Priority 5: Test Other Pages

### Patients Page (`/patients`)
1. Navigate to patients page
2. Test patient list loading
3. Test search functionality
4. Test "Add New Patient" button
5. Fill all required fields
6. Submit and verify creation
7. Test edit patient
8. Test delete patient with confirmation

### Appointments Page (`/appointments`)
1. Navigate to appointments page
2. Test appointment list
3. Test filters (date, clinic, doctor, status)
4. Test edit appointment
5. Test cancel appointment

### Payments Page (`/payments`)
1. Navigate to payments page
2. Test pending payments list
3. Test "Process Payment" button
4. Verify payment record updated
5. Check visit status updated

---

## Priority 6: Test Real-Time Updates

### Setup
1. Open browser tab 1 as receptionist
2. Open browser tab 2 as receptionist
3. Perform actions in tab 1
4. Verify updates appear in tab 2 automatically

### Actions to Test
1. Create new appointment
2. Move patient through queue phases
3. Complete consultation
4. Process payment

---

## Priority 7: Edge Cases & Error Handling

### Test Scenarios
1. Submit form with missing required fields
2. Try to book overlapping appointments
3. Test with invalid phone number format
4. Test with past date in date picker
5. Test network error (disconnect backend briefly)
6. Test Socket.IO reconnection

---

## Priority 8: Code Cleanup

### Tasks
1. Remove excessive console.log statements
2. Keep only critical logging
3. Fix any linter errors
4. Improve error messages
5. Add loading states where missing
6. Verify proper cleanup in useEffect hooks

### Files to Clean
- `frontend/src/components/BookingWizard.jsx` (many console.logs)
- `frontend/src/hooks/useSocket.js` (excessive logging)
- Check other components for excessive logging

---

## Priority 9: Final End-to-End Test

### Complete User Journey
1. Login as receptionist
2. Create new patient via booking wizard
3. Book appointment for that patient
4. Navigate to Queue Management
5. Move appointment through all phases:
   - Appointments Today → Waiting
   - Waiting → With Doctor
   - With Doctor → Completed
6. Process payment
7. Verify all database records:
   - Appointment record
   - Visit record (with correct statuses)
   - Payment record (paid status)
8. Logout and re-login
9. Verify data persistence

---

## Estimated Time per Priority

| Priority | Task | Time |
|----------|------|------|
| 1 | Fix Socket.IO | 20-30 min |
| 2 | Fix Date Picker | 10-15 min |
| 3 | Complete Booking Wizard | 20-30 min |
| 4 | Test Queue Actions | 20-30 min |
| 5 | Test Other Pages | 45-60 min |
| 6 | Test Real-Time | 20-30 min |
| 7 | Test Edge Cases | 30-45 min |
| 8 | Code Cleanup | 30-45 min |
| 9 | Final E2E Test | 30-45 min |
| **TOTAL** | | **~4-5 hours** |

---

## Success Criteria Checklist

- [ ] Socket.IO connection established
- [ ] Booking wizard all 5 steps work
- [ ] Patient creation working
- [ ] Appointment creation working
- [ ] Queue phase transitions working
- [ ] Payment processing working
- [ ] Real-time updates working (2 tabs)
- [ ] All console errors fixed
- [ ] Database integrity maintained
- [ ] End-to-end journey successful

---

**Next Session Goal**: Complete priorities 1-4 (Fix Socket.IO, Date Picker, Booking Wizard, Queue Actions)

*Plan Created: October 26, 2025*

