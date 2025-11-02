import React, { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { 
  Calendar, Users, DollarSign, Building2, Stethoscope, CreditCard,
  TrendingUp, Activity, Clock, CheckCircle, XCircle, AlertCircle,
  Plus, Eye, ArrowRight
} from 'lucide-react'
import { 
  appointmentsApi, queueApi, patientsApi, paymentsApi, 
  clinicsApi, doctorsApi 
} from '../api'
import { useQueueStore } from '../stores/queueStore'
import { useDoctorFilters } from '../hooks/useDoctorFilters'
import StatCard from '../components/dashboard/StatCard'
import PageContainer from '../components/layout/PageContainer'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { AppointmentTrendChart } from '../components/dashboard/AppointmentTrendChart'
import { RevenueChart } from '../components/dashboard/RevenueChart'

const DashboardPage = () => {
  const navigate = useNavigate()
  const { selectedClinic, setSelectedClinic } = useQueueStore()
  const { clinicId, isDoctor, addFilters } = useDoctorFilters()
  
  // Get today's date
  const today = new Date().toISOString().split('T')[0]
  
  // Fetch all statistics with doctor/clinic filters
  const { data: appointmentStats, isLoading: loadingAppointments } = useQuery({
    queryKey: ['appointment-statistics', today, clinicId, isDoctor],
    queryFn: () => appointmentsApi.getStatistics(addFilters({ date: today })),
    refetchInterval: 30000
  })
  
  // For queue stats, use selected clinic or doctor's clinic
  const effectiveClinicId = isDoctor ? clinicId : selectedClinic
  
  const { data: queueStats, isLoading: loadingQueue } = useQuery({
    queryKey: ['queue-statistics', effectiveClinicId, today],
    queryFn: () => queueApi.getQueueStatistics(effectiveClinicId || 1, today),
    enabled: !!effectiveClinicId,
    refetchInterval: 30000
  })
  
  const { data: patientStats, isLoading: loadingPatients } = useQuery({
    queryKey: ['patient-statistics', clinicId, isDoctor],
    queryFn: () => patientsApi.getStatistics(addFilters()),
    refetchInterval: 60000
  })
  
  const { data: paymentStats, isLoading: loadingPayments } = useQuery({
    queryKey: ['payment-statistics', clinicId, isDoctor],
    queryFn: () => paymentsApi.getStatistics(addFilters()),
    refetchInterval: 30000
  })
  
  const { data: clinicStats, isLoading: loadingClinics } = useQuery({
    queryKey: ['clinic-statistics', clinicId, isDoctor],
    queryFn: () => clinicsApi.getStatistics(addFilters()),
    refetchInterval: 60000
  })
  
  const { data: doctorStats, isLoading: loadingDoctors } = useQuery({
    queryKey: ['doctor-statistics', clinicId, isDoctor],
    queryFn: () => doctorsApi.getStatistics(addFilters()),
    refetchInterval: 60000
  })
  
  // Get clinics for clinic selector
  const { data: clinicsData } = useQuery({
    queryKey: ['clinics'],
    queryFn: () => clinicsApi.getClinics()
  })
  
  const clinics = clinicsData?.clinics || []
  
  // Auto-select first clinic for receptionist/admin if none selected
  // Note: Doctor clinic is handled by useDoctorFilters hook
  useEffect(() => {
    if (!isDoctor && clinics.length > 0 && !selectedClinic) {
      // Receptionist/Admin: auto-select first clinic
      setSelectedClinic(clinics[0].id)
    }
  }, [clinics, selectedClinic, setSelectedClinic, isDoctor])
  
  const isLoading = loadingAppointments || loadingQueue || loadingPatients || 
                    loadingPayments || loadingClinics || loadingDoctors

  return (
    <PageContainer className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">لوحة التحكم</h1>
          <p className="text-gray-600">نظرة عامة على جميع الأنشطة والإحصائيات</p>
        </div>
        {clinics.length > 0 && !isDoctor && (
          <select
            value={selectedClinic || ''}
            onChange={(e) => setSelectedClinic(parseInt(e.target.value))}
            className="px-4 py-2 border-2 border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            {clinics.map((clinic) => (
              <option key={clinic.id} value={clinic.id}>
                {clinic.name}
              </option>
            ))}
          </select>
        )}
        {isDoctor && clinicId && (
          <div className="px-4 py-2 border-2 border-gray-300 rounded-lg text-sm bg-gray-100 text-gray-700">
            {clinics.find(c => c.id === clinicId)?.name || 'عيادة'}
          </div>
        )}
      </div>

      {/* Appointments Statistics */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">إحصائيات المواعيد</h2>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/reception/appointments')}
          >
            عرض الكل <ArrowRight className="mr-2 h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            title="إجمالي المواعيد اليوم"
            value={appointmentStats?.total || 0}
            subtitle="جميع المواعيد"
            icon={Calendar}
            iconColor="blue"
            loading={loadingAppointments}
          />
          <StatCard
            title="مؤكد"
            value={appointmentStats?.by_status?.confirmed || 0}
            subtitle="مواعيد مؤكدة"
            icon={CheckCircle}
            iconColor="green"
            loading={loadingAppointments}
          />
          <StatCard
            title="تم الحضور"
            value={appointmentStats?.by_status?.checked_in || 0}
            subtitle="حضور مؤكد"
            icon={Users}
            iconColor="amber"
            loading={loadingAppointments}
          />
          <StatCard
            title="مكتمل"
            value={appointmentStats?.by_status?.completed || 0}
            subtitle="استشارات مكتملة"
            icon={CheckCircle}
            iconColor="green"
            loading={loadingAppointments}
          />
          <StatCard
            title="ملغي"
            value={appointmentStats?.by_status?.cancelled || 0}
            subtitle="مواعيد ملغاة"
            icon={XCircle}
            iconColor="red"
            loading={loadingAppointments}
          />
        </div>
      </div>

      {/* Queue Statistics */}
      {queueStats && selectedClinic && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">إحصائيات الطوابير</h2>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/reception/queue')}
            >
              عرض الكل <ArrowRight className="mr-2 h-4 w-4" />
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="إجمالي وقت الانتظار"
              value={`${queueStats.total_waiting_time || 0} دقيقة`}
              subtitle="مجموع أوقات الانتظار"
              icon={Clock}
              iconColor="blue"
              loading={loadingQueue}
            />
            <StatCard
              title="متوسط وقت الاستشارة"
              value={`${queueStats.avg_consultation_time || 0} دقيقة`}
              subtitle="متوسط المدة"
              icon={Activity}
              iconColor="green"
              loading={loadingQueue}
            />
            <StatCard
              title="المرضى المنتظرين"
              value={queueStats.waiting_count || 0}
              subtitle="في قائمة الانتظار"
              icon={Users}
              iconColor="amber"
              loading={loadingQueue}
            />
            <StatCard
              title="مع الطبيب"
              value={queueStats.in_progress_count || 0}
              subtitle="جاري الاستشارة"
              icon={Stethoscope}
              iconColor="green"
              loading={loadingQueue}
            />
          </div>
        </div>
      )}

      {/* Patients Statistics */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">إحصائيات المرضى</h2>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/reception/patients')}
          >
            عرض الكل <ArrowRight className="mr-2 h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="إجمالي المرضى"
            value={patientStats?.total || 0}
            subtitle="جميع المرضى المسجلين"
            icon={Users}
            iconColor="blue"
            loading={loadingPatients}
          />
          <StatCard
            title="ذكور"
            value={patientStats?.by_gender?.male || 0}
            subtitle="مرضى ذكور"
            icon={Users}
            iconColor="blue"
            loading={loadingPatients}
          />
          <StatCard
            title="إناث"
            value={patientStats?.by_gender?.female || 0}
            subtitle="مرضى إناث"
            icon={Users}
            iconColor="red"
            loading={loadingPatients}
          />
          <StatCard
            title="جدد (30 يوم)"
            value={patientStats?.recent || 0}
            subtitle="سجلات حديثة"
            icon={TrendingUp}
            iconColor="green"
            loading={loadingPatients}
          />
        </div>
      </div>

      {/* Payments Statistics */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">إحصائيات المدفوعات</h2>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/reception/payments')}
          >
            عرض الكل <ArrowRight className="mr-2 h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            title="إجمالي المدفوعات"
            value={paymentStats?.total_payments || 0}
            subtitle="جميع المدفوعات"
            icon={CreditCard}
            iconColor="blue"
            loading={loadingPayments}
          />
          <StatCard
            title="إجمالي الإيرادات"
            value={`${paymentStats?.total_revenue || 0} دينار`}
            subtitle="إيرادات مدفوعة"
            icon={DollarSign}
            iconColor="green"
            loading={loadingPayments}
          />
          <StatCard
            title="معلقة"
            value={paymentStats?.pending_count || 0}
            subtitle="في انتظار الدفع"
            icon={AlertCircle}
            iconColor="amber"
            loading={loadingPayments}
          />
          <StatCard
            title="مدفوعة"
            value={paymentStats?.paid_count || 0}
            subtitle="مدفوعات مكتملة"
            icon={CheckCircle}
            iconColor="green"
            loading={loadingPayments}
          />
          <StatCard
            title="مبلغ معلق"
            value={`${paymentStats?.pending_amount || 0} دينار`}
            subtitle="إجمالي المبلغ المعلق"
            icon={DollarSign}
            iconColor="red"
            loading={loadingPayments}
          />
        </div>
      </div>

      {/* Clinics & Doctors Statistics */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">إحصائيات العيادات والأطباء</h2>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/reception/clinics-doctors')}
          >
            عرض الكل <ArrowRight className="mr-2 h-4 w-4" />
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            title="إجمالي العيادات"
            value={clinicStats?.total_clinics || 0}
            subtitle="جميع العيادات"
            icon={Building2}
            iconColor="blue"
            loading={loadingClinics}
          />
          <StatCard
            title="عيادات نشطة"
            value={clinicStats?.active_clinics || 0}
            subtitle="عيادات قيد العمل"
            icon={Building2}
            iconColor="green"
            loading={loadingClinics}
          />
          <StatCard
            title="إجمالي الأطباء"
            value={doctorStats?.total_doctors || 0}
            subtitle="جميع الأطباء"
            icon={Stethoscope}
            iconColor="blue"
            loading={loadingDoctors}
          />
          <StatCard
            title="إجمالي الخدمات"
            value={clinicStats?.total_services || 0}
            subtitle="جميع الخدمات"
            icon={Activity}
            iconColor="blue"
            loading={loadingClinics}
          />
          <StatCard
            title="خدمات نشطة"
            value={clinicStats?.active_services || 0}
            subtitle="خدمات متاحة"
            icon={Activity}
            iconColor="green"
            loading={loadingClinics}
          />
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>اتجاه المواعيد</CardTitle>
            <p className="text-sm text-gray-500 mt-1">آخر 7 أيام</p>
          </CardHeader>
          <CardContent>
            <AppointmentTrendChart />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>نظرة عامة على الإيرادات</CardTitle>
            <p className="text-sm text-gray-500 mt-1">هذا الشهر</p>
          </CardHeader>
          <CardContent>
            <RevenueChart />
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>إجراءات سريعة</CardTitle>
          <p className="text-sm text-gray-500 mt-1">الوصول السريع للعمليات المهمة</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button 
              className="w-full h-20 flex-col gap-2"
              onClick={() => navigate('/reception/appointments')}
            >
              <Calendar className="h-6 w-6" />
              <span>المواعيد</span>
            </Button>
            <Button 
              variant="outline"
              className="w-full h-20 flex-col gap-2"
              onClick={() => navigate('/reception/queue')}
            >
              <Users className="h-6 w-6" />
              <span>إدارة الطوابير</span>
            </Button>
            <Button 
              variant="outline"
              className="w-full h-20 flex-col gap-2"
              onClick={() => navigate('/reception/patients')}
            >
              <Users className="h-6 w-6" />
              <span>المرضى</span>
            </Button>
            <Button 
              variant="outline"
              className="w-full h-20 flex-col gap-2"
              onClick={() => navigate('/reception/payments')}
            >
              <CreditCard className="h-6 w-6" />
              <span>المدفوعات</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  )
}

export default DashboardPage
