import { useEffect, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { useAuthStore } from '../stores/authStore'

export const useSocket = () => {
  const { token, isAuthenticated } = useAuthStore()
  const socketRef = useRef(null)
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    if (isAuthenticated && token && !socketRef.current) {
      // Initialize socket connection
      socketRef.current = io('http://localhost:5000', {
        auth: {
          token: token
        },
        transports: ['websocket', 'polling']
      })

      // Connection event handlers
      socketRef.current.on('connect', () => {
        console.log('Socket connected')
        setIsConnected(true)
      })

      socketRef.current.on('disconnect', () => {
        console.log('Socket disconnected')
        setIsConnected(false)
      })

      socketRef.current.on('error', (error) => {
        console.error('Socket error:', error)
        setIsConnected(false)
      })

      socketRef.current.on('connected', (data) => {
        console.log('Socket authenticated:', data)
        setIsConnected(true)
      })
    }

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
        socketRef.current = null
      }
    }
  }, [isAuthenticated, token])

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

  const removeAllListeners = () => {
    if (socketRef.current) {
      socketRef.current.removeAllListeners()
    }
  }

  return {
    socket: socketRef.current,
    isConnected,
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
    removeAllListeners
  }
}
