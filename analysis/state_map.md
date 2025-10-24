# Frontend State Management Mapping

## State Management Architecture

### Primary State Management: Zustand
- **Library**: Zustand v4.4.1
- **Pattern**: Multiple specialized stores for different domains
- **Persistence**: Local storage persistence for auth state

### Server State Management: React Query
- **Library**: TanStack React Query v4.24.6
- **Configuration**: 5-minute stale time, 1 retry, no window focus refetch
- **Purpose**: Server state caching, background updates, optimistic updates

## Store Implementations

### 1. Authentication Store (`authStore.js`)

#### State Structure
```javascript
{
  user: null,                    // Current user object
  token: null,                   // JWT access token
  isAuthenticated: false,        // Authentication status
  isLoading: false,              // Loading state
  error: null                    // Error message
}
```

#### Key Actions
- **`login(credentials)`**: Authenticate user, set token, normalize role
- **`logout()`**: Clear auth state, blacklist token on server
- **`refreshToken()`**: Refresh expired token
- **`initializeAuth()`**: Restore auth state from localStorage
- **`clearError()`**: Clear error messages

#### Persistence
- **Storage**: localStorage with key 'auth-storage'
- **Persisted Fields**: user, token, isAuthenticated
- **Role Normalization**: Converts role to lowercase for consistent checks

#### API Integration
- **Token Management**: Automatically sets Authorization header
- **Error Handling**: Graceful error handling with user feedback

### 2. Notification Store (`notificationStore.js`)

#### State Structure
```javascript
{
  notifications: [],             // Array of notification objects
  unreadCount: 0                // Count of unread notifications
}
```

#### Key Actions
- **`addNotification(notification)`**: Add new notification
- **`markAsRead(notificationId)`**: Mark specific notification as read
- **`markAllAsRead()`**: Mark all notifications as read
- **`clearNotifications()`**: Clear all notifications
- **`setNotifications(notifications)`**: Set notifications array

#### Use Cases
- Real-time notifications from SocketIO events
- System alerts and updates
- User action confirmations

### 3. Queue Store (`queueStore.js`)

#### State Structure
```javascript
{
  clinicQueues: {},             // { clinicId: queueData }
  doctorQueues: {},             // { doctorId: queueData }
  selectedClinic: null,         // Currently selected clinic ID
  selectedDoctor: null,         // Currently selected doctor ID
  isConnected: false            // SocketIO connection status
}
```

#### Key Actions
- **`setSelectedClinic(clinicId)`**: Set active clinic for queue view
- **`setSelectedDoctor(doctorId)`**: Set active doctor for queue view
- **`setConnected(connected)`**: Update SocketIO connection status
- **`updateClinicQueue(clinicId, queueData)`**: Update clinic queue data
- **`updateDoctorQueue(doctorId, queueData)`**: Update doctor queue data
- **`getCurrentQueue()`**: Get current queue based on selection
- **`clearQueues()`**: Clear all queue data

#### Real-time Integration
- Receives queue updates from SocketIO events
- Manages multiple clinic and doctor queues simultaneously
- Provides current queue context for UI components

## State Management Patterns

### 1. Separation of Concerns
- **Auth Store**: Authentication and user management
- **Notification Store**: Real-time notifications
- **Queue Store**: Queue management and real-time updates
- **React Query**: Server state and API caching

### 2. Persistence Strategy
- **Auth State**: Persisted to localStorage for session recovery
- **Queue State**: In-memory only (real-time updates)
- **Notification State**: In-memory only (real-time updates)

### 3. Real-time Integration
- **SocketIO Events**: Update Zustand stores directly
- **Queue Updates**: Real-time queue state synchronization
- **Notification Updates**: Real-time notification delivery

### 4. Error Handling
- **Auth Errors**: Stored in auth store, displayed to user
- **API Errors**: Handled by React Query with retry logic
- **SocketIO Errors**: Handled by useSocket hook

## Component Integration

### Authentication Flow
1. **Login Component**: Uses `useAuthStore.login()`
2. **Protected Routes**: Check `useAuthStore.isAuthenticated`
3. **API Calls**: Automatic token attachment via store
4. **Logout**: Uses `useAuthStore.logout()`

### Queue Management Flow
1. **Queue Components**: Use `useQueueStore` for queue data
2. **SocketIO Hook**: Updates queue store on real-time events
3. **Selection State**: Managed by queue store
4. **Real-time Updates**: Automatic UI updates via store subscriptions

### Notification Flow
1. **SocketIO Events**: Add notifications to notification store
2. **Notification Components**: Display notifications from store
3. **Read Status**: Managed by notification store actions
4. **Badge Counts**: Derived from unread count in store

## State Synchronization

### Real-time Updates
- **SocketIO Connection**: Managed by useSocket hook
- **Event Handlers**: Update relevant Zustand stores
- **UI Reactivity**: Automatic re-renders via store subscriptions

### Server State Synchronization
- **React Query**: Handles server state caching and updates
- **Optimistic Updates**: Supported for user actions
- **Background Refetch**: Automatic data freshness

### Cross-Store Communication
- **Auth Store**: Provides user context to other stores
- **Queue Store**: Receives clinic/doctor selection from auth context
- **Notification Store**: Receives user-specific notifications

---
**Status**: Frontend state management architecture mapped and documented
