import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { useSocket } from '../hooks/useSocket'
import { useQueueStore } from '../stores/queueStore'
import { dashboardApi } from '../api/dashboard'
import { clinicsApi } from '../api/clinics'
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card'
import Button from '../components/common/Button'
import BookingWizard from '../components/BookingWizard'
import QueueManagement from '../components/QueueManagement'
import ClinicsAndDoctorsPage from './ClinicsAndDoctorsPage'
import { Plus, Users, Calendar, CreditCard, AlertCircle, Stethoscope, Wifi, WifiOff, Building2 } from 'lucide-react'

const ReceptionDashboard = () => {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  const { socket, isConnected, connectionError, reconnect, joinQueueRoom, leaveQueueRoom } = useSocket()
  const { selectedClinic, setSelectedClinic } = useQueueStore()
  
  // Debounced refetch to prevent excessive API calls
  const debounceTimeoutRef = useRef(null)
  const pendingEventsRef = useRef(new Set())
  const [lastUpdateTime, setLastUpdateTime] = useState(null)

  const { data: stats, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: dashboardApi.getStats,
    refetchInterval: 10000 // Refresh every 10 seconds
  })

  // Fetch clinics for selection
  const { data: clinics = [] } = useQuery({
    queryKey: ['clinics'],
    queryFn: async () => {
      const result = await clinicsApi.getClinics()
      return result?.clinics || []
    }
  })

  // Debounced refetch function to prevent excessive API calls
  const debouncedRefetch = useCallback((eventType, data) => {
    // Add event to pending set
    pendingEventsRef.current.add(eventType)
    
    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }
    
    // Set new timeout for batched refetch
    debounceTimeoutRef.current = setTimeout(() => {
      console.log(`Batched refetch triggered by events: ${Array.from(pendingEventsRef.current).join(', ')}`)
      pendingEventsRef.current.clear()
      setLastUpdateTime(new Date().toLocaleTimeString())
      refetch()
    }, 500) // 500ms debounce delay
  }, [refetch])

  // Set up real-time updates with event batching
  useEffect(() => {
    if (socket && isConnected) {
      // Listen for queue updates
      socket.on('queue_updated', (data) => {
        console.log('Queue updated:', data)
        debouncedRefetch('queue_updated', data)
      })

      // Listen for new check-ins
      socket.on('new_checkin', (data) => {
        console.log('New check-in:', data)
        debouncedRefetch('new_checkin', data)
      })

      // Listen for visit status changes
      socket.on('visit_status_changed', (data) => {
        console.log('Visit status changed:', data)
        debouncedRefetch('visit_status_changed', data)
      })

      // Listen for appointment events
      socket.on('appointment_created', (data) => {
        console.log('Appointment created:', data)
        debouncedRefetch('appointment_created', data)
      })

      socket.on('appointment_updated', (data) => {
        console.log('Appointment updated:', data)
        debouncedRefetch('appointment_updated', data)
      })

      socket.on('appointment_cancelled', (data) => {
        console.log('Appointment cancelled:', data)
        debouncedRefetch('appointment_cancelled', data)
      })

      // Listen for patient events
      socket.on('patient_created', (data) => {
        console.log('Patient created:', data)
        debouncedRefetch('patient_created', data)
      })

      socket.on('patient_updated', (data) => {
        console.log('Patient updated:', data)
        debouncedRefetch('patient_updated', data)
      })

      // Listen for payment events
      socket.on('payment_processed', (data) => {
        console.log('Payment processed:', data)
        debouncedRefetch('payment_processed', data)
      })

      return () => {
        socket.off('queue_updated')
        socket.off('new_checkin')
        socket.off('visit_status_changed')
        socket.off('appointment_created')
        socket.off('appointment_updated')
        socket.off('appointment_cancelled')
        socket.off('patient_created')
        socket.off('patient_updated')
        socket.off('payment_processed')
      }
    }
  }, [socket, isConnected, debouncedRefetch])

  // Join clinic room when clinic is selected
  useEffect(() => {
    if (socket && isConnected && selectedClinic) {
      console.log('Joining clinic room:', selectedClinic)
      joinQueueRoom(selectedClinic)
      
      return () => {
        console.log('Leaving clinic room:', selectedClinic)
        leaveQueueRoom(selectedClinic)
      }
    }
  }, [selectedClinic]) // Only depend on selectedClinic to prevent excessive joins

  // Auto-select first clinic if none selected
  useEffect(() => {
    if (clinics.length > 0 && !selectedClinic) {
      setSelectedClinic(clinics[0].id)
    }
  }, [clinics, selectedClinic, setSelectedClinic])

  const handleLogout = useCallback(() => {
    logout()
  }, [logout])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background-500 via-background-400 to-background-600">
        <div className="text-center">
          <div className="animate-spin rounded-full h-20 w-20 border-4 border-primary-200 border-t-primary-500 mx-auto mb-4"></div>
          <p className="text-lg font-arabic text-primary-600">جاري تحميل لوحة التحكم...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background-500 via-background-400 to-background-600">
        <div className="text-center">
          <div className="bg-white rounded-3xl p-8 shadow-soft-lg max-w-md">
            <AlertCircle className="h-16 w-16 text-error-500 mx-auto mb-6" />
            <h2 className="text-2xl font-bold font-arabic text-gray-900 mb-4">خطأ في تحميل لوحة التحكم</h2>
            <p className="text-gray-600 mb-6 font-arabic">{error.message}</p>
            <Button onClick={() => window.location.reload()} size="lg">إعادة المحاولة</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background-500 via-background-400 to-background-600">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-sm shadow-soft border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-soft">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-2xl font-bold font-arabic text-primary-500">نظام إدارة العيادة الطبية</h1>
                <p className="text-sm font-arabic text-secondary-600">لوحة تحكم الاستقبال</p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-2xl">
                  {isConnected ? (
                    <Wifi className="w-5 h-5 text-success-500" />
                  ) : (
                    <WifiOff className="w-5 h-5 text-error-500" />
                  )}
                  <span className="text-sm font-arabic text-gray-600">
                    {isConnected ? 'متصل' : 'غير متصل'}
                  </span>
                  {connectionError && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={reconnect}
                      className="text-xs"
                    >
                      إعادة الاتصال
                    </Button>
                  )}
                </div>
                {lastUpdateTime && (
                  <span className="text-xs font-arabic text-gray-400">
                    آخر تحديث: {lastUpdateTime}
                  </span>
                )}
              </div>
              {clinics.length > 0 && (
                <select
                  value={selectedClinic || ''}
                  onChange={(e) => setSelectedClinic(parseInt(e.target.value))}
                  className="px-4 py-2 border-2 border-gray-200 rounded-2xl text-sm font-arabic focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all duration-300"
                >
                  {clinics.map((clinic) => (
                    <option key={clinic.id} value={clinic.id}>
                      {clinic.name}
                    </option>
                  ))}
                </select>
              )}
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-arabic text-gray-600">مرحباً،</p>
                  <p className="text-sm font-bold font-arabic text-primary-600">{user?.username}</p>
                </div>
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  تسجيل الخروج
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold font-arabic text-primary-500 mb-2">لوحة تحكم الاستقبال</h2>
          <p className="text-lg font-arabic text-secondary-600">إدارة المواعيد والمرضى والمدفوعات</p>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="bg-white rounded-3xl p-2 shadow-soft">
            <nav className="flex gap-2">
              <button
                onClick={() => setActiveTab('overview')}
                className={`flex-1 py-4 px-6 rounded-2xl font-bold font-arabic text-sm transition-all duration-300 ${
                  activeTab === 'overview'
                    ? 'bg-primary-500 text-white shadow-soft-lg'
                    : 'text-gray-600 hover:text-primary-500 hover:bg-primary-50'
                }`}
              >
                نظرة عامة
              </button>
              <button
                onClick={() => setActiveTab('queue')}
                className={`flex-1 py-4 px-6 rounded-2xl font-bold font-arabic text-sm transition-all duration-300 ${
                  activeTab === 'queue'
                    ? 'bg-primary-500 text-white shadow-soft-lg'
                    : 'text-gray-600 hover:text-primary-500 hover:bg-primary-50'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Stethoscope className="w-5 h-5" />
                  إدارة الطوابير
                </div>
              </button>
              <button
                onClick={() => setActiveTab('clinics')}
                className={`flex-1 py-4 px-6 rounded-2xl font-bold font-arabic text-sm transition-all duration-300 ${
                  activeTab === 'clinics'
                    ? 'bg-primary-500 text-white shadow-soft-lg'
                    : 'text-gray-600 hover:text-primary-500 hover:bg-primary-50'
                }`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Building2 className="w-5 h-5" />
                  العيادات والأطباء
                </div>
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <>
            {/* Quick Actions */}
            <div className="mb-8">
              <h3 className="text-2xl font-bold font-arabic text-primary-500 mb-6">إجراءات سريعة</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card className="group cursor-pointer hover:scale-105 transition-all duration-300" onClick={() => setShowBookingModal(true)}>
                  <CardContent className="text-center py-8">
                    <div className="h-16 w-16 bg-gradient-primary rounded-3xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                      <Plus className="h-8 w-8 text-white" />
                    </div>
                    <h4 className="text-lg font-bold font-arabic text-primary-600 mb-2">حجز جديد</h4>
                    <p className="text-sm font-arabic text-gray-600">إضافة موعد جديد للمريض</p>
                  </CardContent>
                </Card>
                
                <Card className="group cursor-pointer hover:scale-105 transition-all duration-300" onClick={() => navigate('/patients')}>
                  <CardContent className="text-center py-8">
                    <div className="h-16 w-16 bg-gradient-secondary rounded-3xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                      <Users className="h-8 w-8 text-white" />
                    </div>
                    <h4 className="text-lg font-bold font-arabic text-secondary-600 mb-2">قائمة المرضى</h4>
                    <p className="text-sm font-arabic text-gray-600">عرض وإدارة بيانات المرضى</p>
                  </CardContent>
                </Card>
                
                <Card className="group cursor-pointer hover:scale-105 transition-all duration-300" onClick={() => navigate('/appointments')}>
                  <CardContent className="text-center py-8">
                    <div className="h-16 w-16 bg-gradient-accent rounded-3xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                      <Calendar className="h-8 w-8 text-white" />
                    </div>
                    <h4 className="text-lg font-bold font-arabic text-accent-600 mb-2">المواعيد</h4>
                    <p className="text-sm font-arabic text-gray-600">إدارة جدول المواعيد</p>
                  </CardContent>
                </Card>
                
                <Card className="group cursor-pointer hover:scale-105 transition-all duration-300" onClick={() => navigate('/payments')}>
                  <CardContent className="text-center py-8">
                    <div className="h-16 w-16 bg-gradient-to-br from-success-500 to-success-600 rounded-3xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                      <CreditCard className="h-8 w-8 text-white" />
                    </div>
                    <h4 className="text-lg font-bold font-arabic text-success-600 mb-2">المدفوعات</h4>
                    <p className="text-sm font-arabic text-gray-600">إدارة المدفوعات والفواتير</p>
                  </CardContent>
                </Card>
              </div>
            </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card variant="primary" className="animate-fade-in">
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-bold font-arabic text-primary-600 mb-2">مواعيد اليوم</p>
                    <p className="text-3xl font-bold text-primary-700">
                      {stats.appointments?.total || 0}
                    </p>
                    <p className="text-xs font-arabic text-primary-500 mt-1">إجمالي المواعيد</p>
                  </div>
                  <div className="h-16 w-16 bg-gradient-to-br from-primary-100 to-primary-200 rounded-3xl flex items-center justify-center">
                    <Calendar className="h-8 w-8 text-primary-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card variant="success" className="animate-fade-in">
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-bold font-arabic text-success-600 mb-2">المرضى المنتظرين</p>
                    <p className="text-3xl font-bold text-success-700">
                      {stats.visits?.waiting || 0}
                    </p>
                    <p className="text-xs font-arabic text-success-500 mt-1">في قائمة الانتظار</p>
                  </div>
                  <div className="h-16 w-16 bg-gradient-to-br from-success-100 to-success-200 rounded-3xl flex items-center justify-center">
                    <Users className="h-8 w-8 text-success-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card variant="warning" className="animate-fade-in">
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-bold font-arabic text-warning-600 mb-2">مدفوعات معلقة</p>
                    <p className="text-3xl font-bold text-warning-700">
                      {stats.visits?.pending_payment || 0}
                    </p>
                    <p className="text-xs font-arabic text-warning-500 mt-1">في انتظار الدفع</p>
                  </div>
                  <div className="h-16 w-16 bg-gradient-to-br from-warning-100 to-warning-200 rounded-3xl flex items-center justify-center">
                    <CreditCard className="h-8 w-8 text-warning-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card variant="error" className="animate-fade-in">
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm font-bold font-arabic text-error-600 mb-2">التنبيهات</p>
                    <p className="text-3xl font-bold text-error-700">
                      {stats.alerts?.length || 0}
                    </p>
                    <p className="text-xs font-arabic text-error-500 mt-1">تنبيهات مهمة</p>
                  </div>
                  <div className="h-16 w-16 bg-gradient-to-br from-error-100 to-error-200 rounded-3xl flex items-center justify-center">
                    <AlertCircle className="h-8 w-8 text-error-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Alerts */}
        {stats?.alerts && stats.alerts.length > 0 && (
          <Card variant="warning" className="mb-8 animate-slide-in">
            <CardHeader>
              <CardTitle className="flex items-center text-xl">
                <AlertCircle className="h-6 w-6 text-warning-500 ml-3" />
                <span className="font-arabic">التنبيهات المهمة</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.alerts.map((alert, index) => (
                  <div key={index} className="p-4 bg-gradient-to-r from-warning-50 to-warning-100 border-2 border-warning-200 rounded-2xl">
                    <div className="flex items-start gap-3">
                      <div className="h-6 w-6 bg-warning-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                        <AlertCircle className="h-4 w-4 text-white" />
                      </div>
                      <p className="text-sm font-arabic text-warning-800">{alert.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

            {/* Recent Activity */}
            <Card className="animate-slide-in">
              <CardHeader>
                <CardTitle className="text-xl font-arabic">النشاط الأخير</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <div className="h-16 w-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl flex items-center justify-center mx-auto mb-4">
                    <svg className="h-8 w-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 font-arabic">سيتم عرض النشاط الأخير هنا...</p>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Queue Management Tab */}
        {activeTab === 'queue' && selectedClinic && (
          <QueueManagement 
            clinicId={selectedClinic} 
            onQueueUpdate={() => refetch()} 
          />
        )}

        {activeTab === 'queue' && !selectedClinic && (
          <Card>
            <CardContent className="p-6">
              <div className="text-center text-gray-500">
                <Stethoscope className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p>Please select a clinic to manage the queue</p>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'clinics' && <ClinicsAndDoctorsPage />}
      </main>

      {/* Booking Wizard Modal */}
      <BookingWizard
        isOpen={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        onSuccess={(data) => {
          console.log('Appointment created:', data)
          setShowBookingModal(false)
        }}
      />
    </div>
  )
}

export default ReceptionDashboard
