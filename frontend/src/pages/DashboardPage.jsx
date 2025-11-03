/**
 * Dashboard Page - Redesigned with UI Kit
 * 
 * Modern dashboard page using the unified design system.
 * Preserves all API calls, data flow, and functionality.
 */

import React, { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { 
  Calendar, Users, DollarSign, Building2, Stethoscope, CreditCard,
  TrendingUp, Activity, Clock, CheckCircle, XCircle, AlertCircle,
  Plus, Eye, ArrowRight, ChevronDown
} from 'lucide-react'
import { 
  appointmentsApi, queueApi, patientsApi, paymentsApi, 
  clinicsApi, doctorsApi 
} from '../api'
import { useQueueStore } from '../stores/queueStore'
import { useDoctorFilters } from '../hooks/useDoctorFilters'
import StatCard from '../components/dashboard/StatCard'
import PageContainer from '../components/layout/PageContainer'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui-kit'
import { Button, Badge } from '../ui-kit'
import { AppointmentTrendChart } from '../components/dashboard/AppointmentTrendChart'
import { RevenueChart } from '../components/dashboard/RevenueChart'
import { Skeleton } from '../ui-kit'

const DashboardPage = () => {
  const navigate = useNavigate()
  const { selectedClinic, setSelectedClinic } = useQueueStore()
  const { clinicId, isDoctor, addFilters } = useDoctorFilters()
  
  // Get today's date
  const today = new Date().toISOString().split('T')[0]
  
  // Fetch all statistics with doctor/clinic filters - optimized caching
  const { data: appointmentStats, isLoading: loadingAppointments } = useQuery({
    queryKey: ['appointment-statistics', today, clinicId, isDoctor],
    queryFn: () => appointmentsApi.getStatistics(addFilters({ date: today })),
    refetchInterval: 30000,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000
  })
  
  const effectiveClinicId = isDoctor ? clinicId : selectedClinic
  
  const { data: queueStats, isLoading: loadingQueue } = useQuery({
    queryKey: ['queue-statistics', effectiveClinicId, today],
    queryFn: () => queueApi.getQueueStatistics(effectiveClinicId || 1, today),
    enabled: !!effectiveClinicId,
    refetchInterval: 30000,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000
  })
  
  const { data: patientStats, isLoading: loadingPatients } = useQuery({
    queryKey: ['patient-statistics', clinicId, isDoctor],
    queryFn: () => patientsApi.getStatistics(addFilters()),
    refetchInterval: 60000,
    staleTime: 3 * 60 * 1000,
    gcTime: 10 * 60 * 1000
  })
  
  const { data: paymentStats, isLoading: loadingPayments } = useQuery({
    queryKey: ['payment-statistics', clinicId, isDoctor],
    queryFn: () => paymentsApi.getStatistics(addFilters()),
    refetchInterval: 30000,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000
  })
  
  const { data: clinicStats, isLoading: loadingClinics } = useQuery({
    queryKey: ['clinic-statistics', clinicId, isDoctor],
    queryFn: () => clinicsApi.getStatistics(addFilters()),
    refetchInterval: 60000,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000
  })
  
  const { data: doctorStats, isLoading: loadingDoctors } = useQuery({
    queryKey: ['doctor-statistics', clinicId, isDoctor],
    queryFn: () => doctorsApi.getStatistics(addFilters()),
    refetchInterval: 60000,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000
  })
  
  const { data: clinicsData } = useQuery({
    queryKey: ['clinics'],
    queryFn: () => clinicsApi.getClinics()
  })
  
  const clinics = clinicsData?.clinics || []
  
  useEffect(() => {
    if (!isDoctor && clinics.length > 0 && !selectedClinic) {
      setSelectedClinic(clinics[0].id)
    }
  }, [clinics, selectedClinic, setSelectedClinic, isDoctor])

  return (
    <PageContainer className="space-y-6" aria-label="لوحة التحكم">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 font-arabic">
            لوحة التحكم
          </h1>
          <p className="text-sm text-gray-600 font-arabic">نظرة عامة على جميع الأنشطة والإحصائيات</p>
        </div>
        {clinics.length > 0 && !isDoctor && (
          <div className="relative w-full sm:w-auto">
            <label htmlFor="clinic-selector" className="sr-only">اختر العيادة</label>
            <select
              id="clinic-selector"
              value={selectedClinic || ''}
              onChange={(e) => setSelectedClinic(parseInt(e.target.value))}
              className="w-full sm:w-auto px-4 py-2 pr-10 pl-10 border border-gray-300 rounded-lg text-sm font-medium focus:border-medical-blue-500 focus:ring-2 focus:ring-medical-blue-100 bg-white text-gray-900 cursor-pointer appearance-none font-arabic"
              aria-label="اختر العيادة"
            >
              {clinics.map((clinic) => (
                <option key={clinic.id} value={clinic.id}>
                  {clinic.name}
                </option>
              ))}
            </select>
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" aria-hidden="true" />
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" aria-hidden="true" />
          </div>
        )}
        {isDoctor && clinicId && (
          <div className="px-4 py-2 border border-medical-blue-200 rounded-lg text-sm font-medium bg-medical-blue-50 text-gray-900 font-arabic">
            {clinics.find(c => c.id === clinicId)?.name || 'عيادة'}
          </div>
        )}
      </div>

      {/* Appointments Statistics */}
      <section className="space-y-4" aria-labelledby="appointments-heading">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 id="appointments-heading" className="text-xl font-bold text-gray-900 font-arabic">
              إحصائيات المواعيد
            </h2>
            <p className="text-xs text-gray-600 mt-1 font-arabic">نظرة شاملة على مواعيد اليوم</p>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/reception/appointments')}
            className="text-xs"
            aria-label="عرض جميع المواعيد"
          >
            عرض الكل <ArrowRight className="mr-1 h-3 w-3" aria-hidden="true" />
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
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
      </section>

      {/* Queue Statistics */}
      {queueStats && selectedClinic && (
        <section className="space-y-4" aria-labelledby="queue-heading">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h2 id="queue-heading" className="text-xl font-bold text-gray-900 font-arabic">
                إحصائيات الطوابير
              </h2>
              <p className="text-xs text-gray-600 mt-1 font-arabic">مراقبة الطوابير والأوقات</p>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/reception/queue')}
              className="text-xs"
              aria-label="عرض جميع الطوابير"
            >
              عرض الكل <ArrowRight className="mr-1 h-3 w-3" aria-hidden="true" />
            </Button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
        </section>
      )}

      {/* Patients Statistics */}
      <section className="space-y-4" aria-labelledby="patients-heading">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 id="patients-heading" className="text-xl font-bold text-gray-900 font-arabic">
              إحصائيات المرضى
            </h2>
            <p className="text-xs text-gray-600 mt-1 font-arabic">بيانات شاملة عن قاعدة المرضى</p>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/reception/patients')}
            className="text-xs"
            aria-label="عرض جميع المرضى"
          >
            عرض الكل <ArrowRight className="mr-1 h-3 w-3" aria-hidden="true" />
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
      </section>

      {/* Payments Statistics */}
      <section className="space-y-4" aria-labelledby="payments-heading">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 id="payments-heading" className="text-xl font-bold text-gray-900 font-arabic">
              إحصائيات المدفوعات
            </h2>
            <p className="text-xs text-gray-600 mt-1 font-arabic">نظرة شاملة على المدفوعات والإيرادات</p>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/reception/payments')}
            className="text-xs"
            aria-label="عرض جميع المدفوعات"
          >
            عرض الكل <ArrowRight className="mr-1 h-3 w-3" aria-hidden="true" />
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
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
      </section>

      {/* Clinics & Doctors Statistics */}
      <section className="space-y-4" aria-labelledby="clinics-doctors-heading">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 id="clinics-doctors-heading" className="text-xl font-bold text-gray-900 font-arabic">
              إحصائيات العيادات والأطباء
            </h2>
            <p className="text-xs text-gray-600 mt-1 font-arabic">نظرة شاملة على العيادات والأطباء والخدمات</p>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate('/reception/clinics-doctors')}
            className="text-xs"
            aria-label="عرض العيادات والأطباء"
          >
            عرض الكل <ArrowRight className="mr-1 h-3 w-3" aria-hidden="true" />
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
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
      </section>

      {/* Charts Row */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4" aria-label="الرسوم البيانية">
        <Card className="overflow-hidden border border-gray-200 shadow-md hover:shadow-lg transition-shadow">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-medical-blue-500 to-medical-green-500" aria-hidden="true" />
          <CardHeader className="pb-4 pt-6">
            <CardTitle className="text-lg font-bold text-gray-900 font-arabic">اتجاه المواعيد</CardTitle>
            <CardDescription className="text-xs text-gray-600 font-arabic">آخر 7 أيام</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pb-6">
            <AppointmentTrendChart />
          </CardContent>
        </Card>

        <Card className="overflow-hidden border border-gray-200 shadow-md hover:shadow-lg transition-shadow">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-medical-green-500 to-medical-blue-500" aria-hidden="true" />
          <CardHeader className="pb-4 pt-6">
            <CardTitle className="text-lg font-bold text-gray-900 font-arabic">نظرة عامة على الإيرادات</CardTitle>
            <CardDescription className="text-xs text-gray-600 font-arabic">هذا الشهر</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pb-6">
            <RevenueChart />
          </CardContent>
        </Card>
      </section>

      {/* Quick Actions */}
      <section aria-labelledby="quick-actions-heading">
        <Card className="border border-gray-200 shadow-md">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-medical-blue-500 via-medical-green-500 to-medical-blue-500" aria-hidden="true" />
          <CardHeader className="pb-4 pt-6">
            <CardTitle id="quick-actions-heading" className="text-lg font-bold text-gray-900 font-arabic">إجراءات سريعة</CardTitle>
            <CardDescription className="text-xs text-gray-600 font-arabic">الوصول السريع للعمليات المهمة</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pb-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Button 
                className="w-full h-20 flex-col gap-2 text-sm rounded-lg bg-gradient-to-br from-medical-blue-500 to-medical-blue-600 hover:from-medical-blue-600 hover:to-medical-blue-700 shadow-md hover:shadow-lg transition-all text-white"
                onClick={() => navigate('/reception/appointments')}
                aria-label="إدارة المواعيد"
              >
                <Calendar className="h-5 w-5" aria-hidden="true" />
                <span>المواعيد</span>
              </Button>
              <Button 
                variant="outline"
                className="w-full h-20 flex-col gap-2 text-sm rounded-lg border border-gray-200 hover:border-medical-blue-300 hover:bg-medical-blue-50 transition-all"
                onClick={() => navigate('/reception/queue')}
                aria-label="إدارة الطوابير"
              >
                <Users className="h-5 w-5" aria-hidden="true" />
                <span>إدارة الطوابير</span>
              </Button>
              <Button 
                variant="outline"
                className="w-full h-20 flex-col gap-2 text-sm rounded-lg border border-gray-200 hover:border-medical-green-300 hover:bg-medical-green-50 transition-all"
                onClick={() => navigate('/reception/patients')}
                aria-label="إدارة المرضى"
              >
                <Users className="h-5 w-5" aria-hidden="true" />
                <span>المرضى</span>
              </Button>
              <Button 
                variant="outline"
                className="w-full h-20 flex-col gap-2 text-sm rounded-lg border border-gray-200 hover:border-medical-blue-300 hover:bg-medical-blue-50 transition-all"
                onClick={() => navigate('/reception/payments')}
                aria-label="إدارة المدفوعات"
              >
                <CreditCard className="h-5 w-5" aria-hidden="true" />
                <span>المدفوعات</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </PageContainer>
  )
}

export default DashboardPage
