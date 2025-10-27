<!-- b19f04b6-ab48-405b-ad3d-ea49a64d1354 f23a2f27-b341-49f2-bae1-a46be69dd2df -->
# Fix Frontend-Backend Sync Issue

## Problem

Backend operations succeed but UI doesn't update because React Query's staleTime (5 minutes) prevents refetches after invalidation, and mutations don't wait for refetch completion.

## Solution

Create a reusable `useMutationWithRefetch` hook that:

- Keeps the 5-minute staleTime for performance
- Forces immediate refetch after mutations
- Waits for refetch to complete before showing success
- Standardizes error handling with toast notifications

## Implementation Steps

### 1. Create Reusable Mutation Hook

**File**: `frontend/src/hooks/useMutationWithRefetch.js`

Create a custom hook that wraps React Query's `useMutation`:

```javascript
export const useMutationWithRefetch = ({
  mutationFn,
  queryKeys,        // Array of query keys to invalidate
  onSuccessMessage, // Success toast message
  onErrorMessage,   // Error toast message (or function)
  onSuccessCallback, // Additional success logic
  onErrorCallback    // Additional error logic
}) => {
  const queryClient = useQueryClient()
  const [toast, setToast] = useState(...)
  
  return useMutation({
    mutationFn,
    onSuccess: async (data, variables, context) => {
      // Invalidate all specified queries
      for (const key of queryKeys) {
        await queryClient.invalidateQueries({ queryKey: key, exact: false })
        await queryClient.refetchQueries({ queryKey: key })
      }
      
      // Show success toast
      if (onSuccessMessage) showToast(onSuccessMessage, 'success')
      
      // Run callback
      if (onSuccessCallback) await onSuccessCallback(data, variables, context)
    },
    onError: async (error, variables, context) => {
      const message = error.response?.data?.message || onErrorMessage
      showToast(message, 'error')
      
      if (onErrorCallback) await onErrorCallback(error, variables, context)
    }
  })
}
```

### 2. Update AppointmentsPage

**File**: `frontend/src/pages/AppointmentsPage.jsx`

Replace mutation definitions (lines 44-68) with:

```javascript
const updateAppointmentMutation = useMutationWithRefetch({
  mutationFn: ({ id, data }) => appointmentsApi.updateAppointment(id, data),
  queryKeys: [['appointments'], ['dashboard-stats']],
  onSuccessMessage: 'Appointment updated successfully',
  onErrorMessage: 'Failed to update appointment',
  onSuccessCallback: () => {
    setIsEditModalOpen(false)
    setSelectedAppointment(null)
  }
})

const cancelAppointmentMutation = useMutationWithRefetch({
  mutationFn: (id) => appointmentsApi.cancelAppointment(id),
  queryKeys: [['appointments'], ['dashboard-stats']],
  onSuccessMessage: 'Appointment cancelled successfully',
  onErrorMessage: 'Failed to cancel appointment. Only confirmed appointments can be cancelled.'
})
```

### 3. Update PatientsListPage

**File**: `frontend/src/pages/PatientsListPage.jsx`

Replace mutation definitions (lines 45-103) and remove manual toast state management:

```javascript
const createPatientMutation = useMutationWithRefetch({
  mutationFn: (data) => patientsApi.createPatient(data),
  queryKeys: [['patients']],
  onSuccessMessage: 'Patient created successfully',
  onErrorMessage: 'Failed to create patient',
  onSuccessCallback: () => {
    setIsCreateModalOpen(false)
    setNewPatientData({ name: '', phone: '', address: '', age: '', gender: 'male', medical_history: '' })
  }
})

const updatePatientMutation = useMutationWithRefetch({
  mutationFn: ({ id, data }) => patientsApi.updatePatient(id, data),
  queryKeys: [['patients']],
  onSuccessMessage: 'Patient updated successfully',
  onErrorMessage: 'Failed to update patient',
  onSuccessCallback: () => {
    setIsEditModalOpen(false)
    setSelectedPatient(null)
  }
})

const deletePatientMutation = useMutationWithRefetch({
  mutationFn: (id) => patientsApi.deletePatient(id),
  queryKeys: [['patients']],
  onSuccessMessage: 'Patient deleted successfully',
  onErrorMessage: 'Failed to delete patient. This patient may have existing appointments or visits.',
  onSuccessCallback: () => setSelectedPatient(null)
})
```

### 4. Update PaymentsPage

**File**: `frontend/src/pages/PaymentsPage.jsx`

Replace mutation definitions (lines 32-49) and add toast notifications:

```javascript
const processPaymentMutation = useMutationWithRefetch({
  mutationFn: ({ id, amount, method }) => paymentsApi.processExistingPayment(id, { amount_paid: amount, payment_method: method }),
  queryKeys: [['payments'], ['dashboard-stats']],
  onSuccessMessage: 'Payment processed successfully',
  onErrorMessage: 'Failed to process payment'
})

const refundPaymentMutation = useMutationWithRefetch({
  mutationFn: (id) => paymentsApi.refundPayment(id),
  queryKeys: [['payments'], ['dashboard-stats']],
  onSuccessMessage: 'Payment refunded successfully',
  onErrorMessage: 'Failed to refund payment',
  onSuccessCallback: () => {
    setIsRefundModalOpen(false)
    setSelectedPatient(null)
  }
})
```

### 5. Update QueueManagement

**File**: `frontend/src/components/QueueManagement.jsx`

Replace mutation definitions (lines 44-61):

```javascript
const checkinPatientMutation = useMutationWithRefetch({
  mutationFn: (appointmentId) => queueApi.checkinPatient(appointmentId),
  queryKeys: [['queue-phases'], ['dashboard-stats']],
  onSuccessMessage: 'Patient checked in successfully',
  onErrorMessage: 'Failed to check in patient',
  onSuccessCallback: () => onQueueUpdate?.()
})

const movePatientMutation = useMutationWithRefetch({
  mutationFn: ({ visitId, fromPhase, toPhase }) => queueApi.movePatientPhase(visitId, fromPhase, toPhase),
  queryKeys: [['queue-phases'], ['dashboard-stats']],
  onSuccessMessage: 'Patient moved successfully',
  onErrorMessage: 'Failed to move patient',
  onSuccessCallback: () => onQueueUpdate?.()
})
```

### 6. Update BookingWizard

**File**: `frontend/src/components/BookingWizard.jsx`

Replace mutation definition (around line 142):

```javascript
const createAppointmentMutation = useMutationWithRefetch({
  mutationFn: (data) => appointmentsApi.createAppointment(data),
  queryKeys: [['appointments'], ['dashboard-stats'], ['queue-phases']],
  onSuccessMessage: 'Appointment created successfully',
  onErrorMessage: 'Failed to create appointment',
  onSuccessCallback: (response) => {
    onSuccess?.(response.data)
    handleClose()
  }
})
```

### 7. Update Other Components

Apply the same pattern to:

- `frontend/src/components/WalkInModal.jsx`
- `frontend/src/components/DoctorQueue.jsx`
- Any other components with mutations

## Key Benefits

1. **Guaranteed UI updates**: Awaits refetch before showing success
2. **Consistent UX**: Standardized toast notifications across all pages
3. **Maintainable**: Single source of truth for mutation logic
4. **Performance**: Keeps 5-minute staleTime but forces refetch when needed
5. **Error handling**: Centralized error message extraction and display

## Testing Checklist

After implementation, verify:

- [ ] Delete appointment → UI updates immediately
- [ ] Edit patient → Changes appear without refresh
- [ ] Create appointment → Shows in list instantly
- [ ] Process payment → Status updates in real-time
- [ ] Queue transitions → Cards move between phases
- [ ] All success toasts appear after UI updates
- [ ] Error toasts show backend error messages

### To-dos

- [ ] Create database backup and verify environment is running
- [ ] Fix BookingWizard: clinic selection, patient creation, appointment flow
- [ ] Fix QueueManagement: phase transitions, drag-drop, socket updates
- [ ] Fix Patients page: CRUD operations, search, history view
- [ ] Fix Appointments page: filters, edit, cancel, real-time sync
- [ ] Fix Payments page: process payment, history, filters, calculations
- [ ] Fix Socket.IO: connection, rooms, events, cross-tab updates
- [ ] Fix dashboard counters and stats auto-refresh
- [ ] Add/strengthen backend validation and error handling
- [ ] Run complete end-to-end testing and fix any remaining issues