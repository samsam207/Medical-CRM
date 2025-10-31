import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, Calendar, Users, DollarSign, AlertCircle, TrendingUp } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { dashboardApi } from '../api/dashboard'
import { appointmentsApi } from '../api/appointments'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import StatCard from '../components/dashboard/StatCard'
import PageContainer from '../components/layout/PageContainer'
import { AppointmentTrendChart } from '../components/dashboard/AppointmentTrendChart'
import { RevenueChart } from '../components/dashboard/RevenueChart'
import { Separator } from '../components/ui/separator'

const DashboardPage = () => {
  const navigate = useNavigate()
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: dashboardApi.getStats,
    refetchInterval: 10000
  })

  // Get recent activity
  const { data: recentAppointments = [] } = useQuery({
    queryKey: ['recent-appointments'],
    queryFn: async () => {
      const result = await appointmentsApi.getAppointments({ page: 1, per_page: 5 })
      return result?.appointments || []
    }
  })

  const handleQuickAction = (action) => {
    switch (action) {
      case 'new-appointment':
        // Trigger booking wizard
        break
      case 'view-queue':
        navigate('/reception/queue')
        break
      case 'view-appointments':
        navigate('/reception/appointments')
        break
      case 'view-payments':
        navigate('/reception/payments')
        break
      default:
        break
    }
  }

  return (
    <PageContainer className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">لوحة التحكم</h1>
        <p className="text-gray-600">نظرة عامة على النشاط اليومي والمواعيد</p>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="مواعيد اليوم"
          value={stats?.today_appointments || 0}
          subtitle="إجمالي المواعيد"
          icon={Calendar}
          iconColor="blue"
          loading={isLoading}
        />
        <StatCard
          title="المرضى المنتظرين"
          value={stats?.waiting_patients || 0}
          subtitle="في قائمة الانتظار"
          icon={Users}
          iconColor="green"
          loading={isLoading}
        />
        <StatCard
          title="مدفوعات معلقة"
          value={`$${stats?.pending_payments || 0}`}
          subtitle="في انتظار الدفع"
          icon={DollarSign}
          iconColor="amber"
          loading={isLoading}
        />
        <StatCard
          title="التنبيهات"
          value={stats?.alerts_count || 0}
          subtitle="تنبيهات مهمة"
          icon={AlertCircle}
          iconColor="red"
          loading={isLoading}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>اتجاه المواعيد</CardTitle>
            <CardDescription>آخر 7 أيام</CardDescription>
          </CardHeader>
          <CardContent>
            <AppointmentTrendChart />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>نظرة عامة على الإيرادات</CardTitle>
            <CardDescription>هذا الشهر</CardDescription>
          </CardHeader>
          <CardContent>
            <RevenueChart />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>إجراءات سريعة</CardTitle>
            <CardDescription>الوصول السريع للعمليات المهمة</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button 
              className="w-full justify-start" 
              onClick={() => handleQuickAction('new-appointment')}
            >
              <Plus className="mr-2 h-4 w-4" />
              حجز جديد
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start" 
              onClick={() => handleQuickAction('view-queue')}
            >
              <Users className="mr-2 h-4 w-4" />
              إدارة الطوابير
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start" 
              onClick={() => handleQuickAction('view-appointments')}
            >
              <Calendar className="mr-2 h-4 w-4" />
              عرض المواعيد
            </Button>
            <Button 
              variant="outline" 
              className="w-full justify-start" 
              onClick={() => handleQuickAction('view-payments')}
            >
              <DollarSign className="mr-2 h-4 w-4" />
              المدفوعات
            </Button>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>النشاط الأخير</CardTitle>
            <CardDescription>آخر التحديثات والأنشطة</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentAppointments.map((appointment, index) => (
                <div key={appointment.id}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {appointment.patient?.name || 'مريض'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {appointment.doctor?.name || 'طبيب'} - {appointment.clinic?.name || 'عيادة'}
                        </p>
                      </div>
                    </div>
                    <Badge variant={appointment.status === 'CONFIRMED' ? 'success' : 'secondary'}>
                      {appointment.status}
                    </Badge>
                  </div>
                  {index < recentAppointments.length - 1 && (
                    <Separator className="mt-4" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}

export default DashboardPage

