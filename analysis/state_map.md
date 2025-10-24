# Frontend State Management Map

## State Management Architecture

### Primary State Management: Zustand
- **Library**: Zustand v4.4.1
- **Pattern**: Multiple focused stores instead of single global store
- **Persistence**: Used for authentication state only

### Secondary State Management: React Query
- **Library**: @tanstack/react-query v4.24.6
- **Purpose**: Server state management, caching, synchronization
- **Configuration**: 5-minute stale time, 1 retry, no refetch on window focus

## Store Implementations

### 1. Authentication Store (`authStore.js`)
- **Purpose**: User authentication and session management
- **Persistence**: Yes (localStorage via zustand/middleware)
- **State**:
  - `user`: User object with role normalization
  - `token`: JWT access token
  - `isAuthenticated`: Boolean authentication status
  - `isLoading`: Loading state for auth operations
  - `error`: Error messages
- **Actions**:
  - `login(credentials)`: Authenticate user
  - `logout()`: Clear session and call logout API
  - `refreshToken()`: Refresh JWT token
  - `clearError()`: Clear error state
  - `initializeAuth()`: Initialize from stored token
- **Features**:
  - Role normalization (converts to lowercase)
  - Automatic API client token management
  - Token refresh with fallback to logout
  - Persistent storage with partialize

### 2. Queue Store (`queueStore.js`)
- **Purpose**: Real-time queue data management
- **Persistence**: No (in-memory only)
- **State**:
  - `clinicQueues`: Object mapping clinicId to queue data
  - `doctorQueues`: Object mapping doctorId to queue data
  - `selectedClinic`: Currently selected clinic ID
  - `selectedDoctor`: Currently selected doctor ID
  - `isConnected`: Socket connection status
- **Actions**:
  - `setSelectedClinic(clinicId)`: Set active clinic
  - `setSelectedDoctor(doctorId)`: Set active doctor
  - `setConnected(connected)`: Update connection status
  - `updateClinicQueue(clinicId, data)`: Update clinic queue data
  - `updateDoctorQueue(doctorId, data)`: Update doctor queue data
  - `getCurrentQueue()`: Get current active queue
  - `clearQueues()`: Clear all queue data
- **Features**:
  - Separate clinic and doctor queue management
  - Dynamic queue selection
  - Real-time data updates

### 3. Notification Store (`notificationStore.js`)
- **Purpose**: In-app notification management
- **Persistence**: No (in-memory only)
- **State**:
  - `notifications`: Array of notification objects
  - `unreadCount`: Count of unread notifications
- **Actions**:
  - `addNotification(notification)`: Add new notification
  - `markAsRead(notificationId)`: Mark specific notification as read
  - `markAllAsRead()`: Mark all notifications as read
  - `clearNotifications()`: Clear all notifications
  - `setNotifications(notifications)`: Set notification list
- **Features**:
  - Automatic unread count management
  - Individual and bulk read operations

## React Query Usage

### Query Client Configuration
- **File**: `frontend/src/main.jsx`
- **Configuration**:
  - `retry: 1`: Single retry on failure
  - `refetchOnWindowFocus: false`: No refetch on window focus
  - `staleTime: 5 * 60 * 1000`: 5-minute stale time

### Query Usage Patterns

#### 1. Data Fetching Queries
- **Dashboard Stats**: `useQuery` for statistics
- **Lists**: `useQuery` for appointments, patients, payments
- **Details**: `useQuery` for specific records
- **Search**: `useQuery` for patient search with debouncing

#### 2. Mutation Patterns
- **Create Operations**: `useMutation` for creating appointments, patients
- **Update Operations**: `useMutation` for updating records
- **Delete Operations**: `useMutation` for deleting records
- **Status Changes**: `useMutation` for visit status updates

#### 3. Cache Management
- **Query Invalidation**: `queryClient.invalidateQueries()` after mutations
- **Optimistic Updates**: Not implemented (uses refetch pattern)
- **Background Refetch**: Automatic with React Query

### Component-Specific State

#### Reception Dashboard
- **Queries**: Stats, clinics, queue data
- **Mutations**: Check-in, appointment management
- **Real-time**: Socket events trigger refetch

#### Doctor Dashboard
- **Queries**: Stats, doctor queue
- **Mutations**: Visit status changes, patient calls
- **Real-time**: Socket events trigger refetch

#### Booking Wizard
- **Queries**: Clinics, doctors, services, patients, available slots
- **Mutations**: Create appointment, create patient
- **State**: Form state managed locally

#### Queue Management
- **Queries**: Queue data, confirmed appointments
- **Mutations**: Check-in, call, start, complete, skip
- **Real-time**: Socket events for live updates

## State Flow Analysis

### Authentication Flow
1. **Login**: User credentials → API call → Auth store update → Token storage
2. **Token Refresh**: Automatic refresh on API calls → Auth store update
3. **Logout**: API call → Clear auth store → Clear token storage

### Real-time Data Flow
1. **Socket Connection**: Auth store token → Socket connection
2. **Room Joins**: User role → Join appropriate rooms
3. **Event Handling**: Socket events → Store updates → Component re-renders
4. **Data Sync**: Socket events → Query invalidation → Fresh data fetch

### Queue Management Flow
1. **Queue Selection**: User action → Queue store update
2. **Data Fetching**: Queue store state → React Query → API call
3. **Real-time Updates**: Socket events → Queue store update → UI update
4. **Actions**: User action → Mutation → API call → Query invalidation

## State Management Issues Identified

### 1. State Synchronization
- **Problem**: Socket events trigger refetch instead of direct state updates
- **Impact**: Potential race conditions and unnecessary API calls
- **Solution**: Direct state updates from socket events

### 2. Cache Management
- **Problem**: Aggressive cache invalidation may cause unnecessary refetches
- **Impact**: Performance degradation and potential UI flicker
- **Solution**: More granular cache invalidation

### 3. Error Handling
- **Problem**: Limited error state management in stores
- **Impact**: Poor user experience on failures
- **Solution**: Comprehensive error handling in all stores

### 4. Memory Management
- **Problem**: No cleanup of socket listeners on component unmount
- **Impact**: Memory leaks and duplicate event handlers
- **Solution**: Proper cleanup in useEffect hooks

### 5. State Persistence
- **Problem**: Only auth state is persisted
- **Impact**: Loss of UI state on page refresh
- **Solution**: Consider persisting more UI state

## Recommendations

### 1. Implement Direct State Updates
- Update stores directly from socket events
- Reduce dependency on query invalidation
- Improve real-time responsiveness

### 2. Optimize Cache Strategy
- Use more specific query keys
- Implement optimistic updates for better UX
- Consider background refetch strategies

### 3. Enhance Error Handling
- Add error states to all stores
- Implement retry mechanisms
- Provide user-friendly error messages

### 4. Improve Memory Management
- Clean up socket listeners properly
- Implement store cleanup on logout
- Monitor for memory leaks

### 5. Consider State Normalization
- Normalize nested data structures
- Implement selectors for derived state
- Reduce data duplication across stores