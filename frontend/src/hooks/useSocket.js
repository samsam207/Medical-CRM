import { useEffect, useRef, useState, useCallback } from 'react'
import { io } from 'socket.io-client'
import { useAuthStore } from '../stores/authStore'

export const useSocket = () => {
  const { token, isAuthenticated } = useAuthStore()
  const socketRef = useRef(null)
  const [isConnected, setIsConnected] = useState(false)
  const [connectionError, setConnectionError] = useState(null)
  const reconnectTimeoutRef = useRef(null)
  const reconnectAttemptsRef = useRef(0)
  const maxReconnectAttempts = 5
  const baseReconnectDelay = 1000 // 1 second

  const connect = useCallback(() => {
    if (!isAuthenticated || !token || socketRef.current) return

    console.log('Attempting socket connection...')
    setConnectionError(null)

    socketRef.current = io('http://localhost:5000', {
      auth: { token: token },
      transports: ['websocket', 'polling'],
      timeout: 10000,
      forceNew: true
    })

    // Connection event handlers
    socketRef.current.on('connect', () => {
      console.log('Socket connected')
      setIsConnected(true)
      setConnectionError(null)
      reconnectAttemptsRef.current = 0
    })

    socketRef.current.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason)
      setIsConnected(false)
      
      // Only attempt reconnection if it wasn't a manual disconnect
      if (reason !== 'io client disconnect' && reason !== 'io server disconnect') {
        scheduleReconnect()
      }
    })

    socketRef.current.on('connect_error', (error) => {
      console.error('Socket connection error:', error)
      setConnectionError(error.message || 'Connection failed')
      setIsConnected(false)
      scheduleReconnect()
    })

    socketRef.current.on('error', (error) => {
      console.error('Socket error:', error)
      setConnectionError(error.message || 'Socket error')
      setIsConnected(false)
    })

    socketRef.current.on('connected', (data) => {
      console.log('Socket authenticated:', data)
      setIsConnected(true)
      setConnectionError(null)
    })
  }, [isAuthenticated, token])

  const scheduleReconnect = useCallback(() => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.error('Max reconnection attempts reached')
      setConnectionError('Unable to connect after multiple attempts')
      return
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
    }

    const delay = baseReconnectDelay * Math.pow(2, reconnectAttemptsRef.current)
    console.log(`Scheduling reconnection attempt ${reconnectAttemptsRef.current + 1} in ${delay}ms`)
    
    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectAttemptsRef.current++
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
      connect()
    }, delay)
  }, [connect])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    
    if (socketRef.current) {
      socketRef.current.disconnect()
      socketRef.current = null
    }
    
    setIsConnected(false)
    setConnectionError(null)
    reconnectAttemptsRef.current = 0
  }, [])

  useEffect(() => {
    if (isAuthenticated && token) {
      connect()
    } else {
      disconnect()
    }

    return () => {
      disconnect()
    }
  }, [isAuthenticated, token, connect, disconnect])

  const joinQueueRoom = (clinicId) => {
    if (socketRef.current) {
      socketRef.current.emit('join_queue_room', { 
        clinic_id: clinicId,
        token: token 
      })
    }
  }

  const leaveQueueRoom = (clinicId) => {
    if (socketRef.current) {
      socketRef.current.emit('leave_queue_room', { 
        clinic_id: clinicId,
        token: token 
      })
    }
  }

  const joinDoctorRoom = (doctorId) => {
    if (socketRef.current) {
      socketRef.current.emit('join_doctor_room', { 
        doctor_id: doctorId,
        token: token 
      })
    }
  }

  const leaveDoctorRoom = (doctorId) => {
    if (socketRef.current) {
      socketRef.current.emit('leave_doctor_room', { 
        doctor_id: doctorId,
        token: token 
      })
    }
  }

  const onQueueUpdate = (callback) => {
    if (socketRef.current) {
      socketRef.current.on('queue_updated', callback)
    }
  }

  const onNewCheckin = (callback) => {
    if (socketRef.current) {
      socketRef.current.on('new_checkin', callback)
    }
  }

  const onVisitStatusChange = (callback) => {
    if (socketRef.current) {
      socketRef.current.on('visit_status_changed', callback)
    }
  }

  const onAppointmentCreated = (callback) => {
    if (socketRef.current) {
      socketRef.current.on('appointment_created', callback)
    }
  }

  const onAppointmentUpdated = (callback) => {
    if (socketRef.current) {
      socketRef.current.on('appointment_updated', callback)
    }
  }

  const onAppointmentCancelled = (callback) => {
    if (socketRef.current) {
      socketRef.current.on('appointment_cancelled', callback)
    }
  }

  const onQueueReordered = (callback) => {
    if (socketRef.current) {
      socketRef.current.on('queue_reordered', callback)
    }
  }

  const onWalkinAdded = (callback) => {
    if (socketRef.current) {
      socketRef.current.on('walkin_added', callback)
    }
  }

  const onVisitCancelled = (callback) => {
    if (socketRef.current) {
      socketRef.current.on('visit_cancelled', callback)
    }
  }

  const removeAllListeners = () => {
    if (socketRef.current) {
      socketRef.current.removeAllListeners()
    }
  }

  return {
    socket: socketRef.current,
    isConnected,
    connectionError,
    reconnect: connect,
    disconnect,
    joinQueueRoom,
    leaveQueueRoom,
    joinDoctorRoom,
    leaveDoctorRoom,
    onQueueUpdate,
    onNewCheckin,
    onVisitStatusChange,
    onAppointmentCreated,
    onAppointmentUpdated,
    onAppointmentCancelled,
    onQueueReordered,
    onWalkinAdded,
    onVisitCancelled,
    removeAllListeners
  }
}
