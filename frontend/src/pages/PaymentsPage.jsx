/**
 * Payments Page - Redesigned with UI Kit
 * 
 * Modern payments page using the unified design system.
 * Preserves all API calls, data flow, and functionality.
 */

import React, { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import { 
  CreditCard, DollarSign, Calendar, User, Search, Filter, Eye, RefreshCw, FileSpreadsheet,
  ChevronLeft, ChevronRight, TrendingUp, Activity, Printer, Building2, Stethoscope
} from 'lucide-react'
import { Button, Badge } from '../ui-kit'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui-kit'
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui-kit'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../ui-kit'
import { Input, Label } from '../ui-kit'
import { Skeleton } from '../ui-kit'
import PageContainer from '../components/layout/PageContainer'
import { paymentsApi } from '../api'
import { clinicsApi, doctorsApi } from '../api'
import { formatDate, formatTime, formatCurrency } from '../utils/formatters'
import { useMutationWithRefetch } from '../hooks/useMutationWithRefetch'
import { useDoctorFilters } from '../hooks/useDoctorFilters'
import StatCard from '../components/dashboard/StatCard'

const PaymentsPage = () => {
  const { doctorId, clinicId, isDoctor, addFilters } = useDoctorFilters()
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [methodFilter, setMethodFilter] = useState('all')
  const [doctorFilter, setDoctorFilter] = useState('all')
  const [clinicFilter, setClinicFilter] = useState('all')
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [selectedPayment, setSelectedPayment] = useState(null)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false)
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false)
  
  // Auto-set filters for doctors
  useEffect(() => {
    if (isDoctor) {
      if (clinicId) setClinicFilter(clinicId.toString())
      if (doctorId) setDoctorFilter(doctorId.toString())
    }
  }, [isDoctor, clinicId, doctorId])
  
  // Processing modal form state
  const [processingForm, setProcessingForm] = useState({
    discount_amount: 0,
    amount_paid: 0,
    payment_method: 'CASH'
  })

  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()
  const hasProcessedUrlParams = useRef(false)

  // Fetch clinics and doctors for filters
  const { data: clinicsResponse } = useQuery({
    queryKey: ['clinics-for-filters'],
    queryFn: () => clinicsApi.getClinics(),
    refetchOnWindowFocus: false
  })
  const clinics = clinicsResponse?.clinics || []

  const { data: doctorsResponse } = useQuery({
    queryKey: ['doctors-for-filters'],
    queryFn: () => doctorsApi.getDoctors(),
    refetchOnWindowFocus: false
  })
  const doctors = doctorsResponse?.doctors || []

  // Determine date range for query
  let queryParams = {
    status: statusFilter !== 'all' ? statusFilter : undefined,
    method: methodFilter !== 'all' ? methodFilter.toLowerCase() : undefined,
    clinic_id: clinicFilter !== 'all' ? parseInt(clinicFilter) : undefined,
    doctor_id: doctorFilter !== 'all' ? parseInt(doctorFilter) : undefined,
    page: currentPage,
    per_page: perPage
  }

  if (startDate && endDate) {
    queryParams.start_date = startDate
    queryParams.end_date = endDate
  } else {
    queryParams.date = selectedDate.toISOString().split('T')[0]
  }

  queryParams = addFilters(queryParams)

  // Fetch payments with pagination
  const { data: paymentsData, isLoading } = useQuery({
    queryKey: ['payments', queryParams],
    queryFn: () => paymentsApi.getPayments(queryParams)
  })

  const payments = paymentsData?.payments || []
  const total = paymentsData?.total || 0
  const pages = paymentsData?.pages || 1
  const currentPageNum = paymentsData?.current_page || 1

  // Fetch statistics
  const { data: statistics } = useQuery({
    queryKey: ['payment-statistics'],
    queryFn: () => paymentsApi.getStatistics(addFilters()),
    refetchOnWindowFocus: false
  })

  // Check for paymentId or visitId in URL params
  useEffect(() => {
    const paymentId = searchParams.get('paymentId')
    const visitId = searchParams.get('visitId')
    
    if (!paymentId && !visitId) {
      hasProcessedUrlParams.current = false
      return
    }
    
    const currentParams = `${paymentId || ''}_${visitId || ''}`
    if (hasProcessedUrlParams.current === currentParams) {
      return
    }
    
    if (paymentId) {
      const existingPayment = payments.find(p => p.id === parseInt(paymentId))
      if (existingPayment) {
        setSelectedPayment(existingPayment)
        setIsProcessModalOpen(true)
        hasProcessedUrlParams.current = currentParams
        const newSearchParams = new URLSearchParams(searchParams)
        newSearchParams.delete('paymentId')
        window.history.replaceState({}, '', `${window.location.pathname}${newSearchParams.toString() ? '?' + newSearchParams.toString() : ''}`)
        return
      }
      
      hasProcessedUrlParams.current = currentParams
      paymentsApi.getPayment(parseInt(paymentId))
        .then(response => {
          if (response?.payment) {
            setSelectedPayment(response.payment)
            setIsProcessModalOpen(true)
            const newSearchParams = new URLSearchParams(searchParams)
            newSearchParams.delete('paymentId')
            window.history.replaceState({}, '', `${window.location.pathname}${newSearchParams.toString() ? '?' + newSearchParams.toString() : ''}`)
          }
        })
        .catch(error => {
          console.error('Error fetching payment:', error)
          hasProcessedUrlParams.current = false
        })
    } else if (visitId) {
      const existingPayment = payments.find(p => p.visit?.id === parseInt(visitId))
      if (existingPayment) {
        setSelectedPayment(existingPayment)
        setIsProcessModalOpen(true)
        hasProcessedUrlParams.current = currentParams
        const newSearchParams = new URLSearchParams(searchParams)
        newSearchParams.delete('visitId')
        window.history.replaceState({}, '', `${window.location.pathname}${newSearchParams.toString() ? '?' + newSearchParams.toString() : ''}`)
        return
      }
      
      hasProcessedUrlParams.current = currentParams
      paymentsApi.getPayments({ visit_id: parseInt(visitId) })
        .then(response => {
          const foundPayments = response?.payments || []
          if (foundPayments.length > 0) {
            setSelectedPayment(foundPayments[0])
            setIsProcessModalOpen(true)
            const newSearchParams = new URLSearchParams(searchParams)
            newSearchParams.delete('visitId')
            window.history.replaceState({}, '', `${window.location.pathname}${newSearchParams.toString() ? '?' + newSearchParams.toString() : ''}`)
          }
        })
        .catch(error => {
          console.error('Error fetching payment by visit:', error)
          hasProcessedUrlParams.current = false
        })
    }
  }, [searchParams, payments, isLoading])

  // Mutations
  const processPaymentMutation = useMutationWithRefetch({
    mutationFn: ({ id, data }) => paymentsApi.processExistingPayment(id, data),
    queryKeys: [['payments'], ['dashboard-stats']],
    onSuccessMessage: 'تم معالجة الدفع بنجاح',
    onErrorMessage: 'فشل معالجة الدفع',
    onSuccessCallback: () => {
      setIsProcessModalOpen(false)
      setSelectedPayment(null)
      setProcessingForm({ discount_amount: 0, amount_paid: 0, payment_method: 'CASH' })
    }
  })

  const refundPaymentMutation = useMutationWithRefetch({
    mutationFn: (id) => paymentsApi.refundPayment(id),
    queryKeys: [['payments'], ['dashboard-stats']],
    onSuccessMessage: 'تم استرداد الدفع بنجاح',
    onErrorMessage: 'فشل استرداد الدفع',
    onSuccessCallback: () => {
      setIsRefundModalOpen(false)
      setSelectedPayment(null)
    }
  })

  // Export payments
  const handleExportPayments = async () => {
    try {
      const params = { ...queryParams }
      const response = await paymentsApi.exportPayments(params)
      
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      let filename = 'payments'
      if (startDate && endDate) {
        filename = `payments_${startDate}_to_${endDate}.xlsx`
      } else {
        filename = `payments_${selectedDate.toISOString().split('T')[0]}.xlsx`
      }
      
      link.download = filename
      link.click()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Export failed:', error)
      alert('فشل تصدير المدفوعات')
    }
  }

  // Filter payments client-side
  const filteredPayments = payments.filter(payment => {
    if (searchQuery) {
      const searchLower = searchQuery.toLowerCase()
      const matchesSearch = (
        payment.visit?.patient?.name?.toLowerCase().includes(searchLower) ||
        payment.visit?.patient?.phone?.includes(searchQuery) ||
        payment.visit?.doctor?.name?.toLowerCase().includes(searchLower) ||
        payment.id.toString().includes(searchQuery)
      )
      if (!matchesSearch) return false
    }
    
    return true
  })

  const handleViewPayment = (payment) => {
    setSelectedPayment(payment)
    setIsViewModalOpen(true)
  }

  const handleOpenProcessModal = (payment) => {
    setSelectedPayment(payment)
    setProcessingForm({
      discount_amount: payment.discount_amount || 0,
      amount_paid: payment.amount_paid || 0,
      payment_method: payment.payment_method || 'CASH'
    })
    setIsProcessModalOpen(true)
  }

  const handleProcessPayment = () => {
    if (!selectedPayment) return
    
    const data = {
      discount_amount: processingForm.discount_amount,
      amount_paid: processingForm.amount_paid,
      payment_method: processingForm.payment_method
    }
    
    processPaymentMutation.mutate({ id: selectedPayment.id, data })
  }

  const handleRefundPayment = (payment) => {
    setSelectedPayment(payment)
    setIsRefundModalOpen(true)
  }

  const handleRefund = () => {
    refundPaymentMutation.mutate(selectedPayment.id)
  }

  const getStatusBadge = (status) => {
    const statusMap = {
      'pending': { label: 'معلق', variant: 'outline' },
      'partially_paid': { label: 'مدفوع جزئياً', variant: 'default' },
      'paid': { label: 'مدفوع', variant: 'success' },
      'refunded': { label: 'مسترد', variant: 'destructive' },
      'failed': { label: 'فاشل', variant: 'secondary' }
    }
    const statusInfo = statusMap[status] || { label: status, variant: 'secondary' }
    return <Badge variant={statusInfo.variant} className="font-arabic">{statusInfo.label}</Badge>
  }

  const getMethodBadge = (method) => {
    const methodUpper = method?.toUpperCase()
    const methodMap = {
      'CASH': { label: 'نقدي', variant: 'success' },
      'VISA': { label: 'فيزا', variant: 'default' },
      'BANK_TRANSFER': { label: 'تحويل بنكي', variant: 'outline' }
    }
    const methodInfo = methodMap[methodUpper] || { label: method, variant: 'secondary' }
    return <Badge variant={methodInfo.variant} className="font-arabic">{methodInfo.label}</Badge>
  }

  // Calculate max allowed payment
  const maxAllowedPayment = selectedPayment 
    ? (selectedPayment.total_amount - (selectedPayment.discount_amount || 0))
    : 0

  if (isLoading) {
    return (
      <PageContainer>
        <div className="flex justify-center items-center h-64">
          <div className="space-y-4 w-full max-w-md">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer className="space-y-6" aria-label="صفحة المدفوعات">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-gray-200">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 font-arabic">
            المدفوعات
          </h1>
          <p className="text-sm text-gray-600 font-arabic">إدارة المدفوعات والإيرادات</p>
        </div>
        <Button
          onClick={handleExportPayments}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
          aria-label="تصدير المدفوعات"
        >
          <FileSpreadsheet className="w-4 h-4" aria-hidden="true" />
          <span className="hidden sm:inline">تصدير Excel</span>
        </Button>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard
            title="إجمالي المدفوعات"
            value={statistics.total || 0}
            subtitle="جميع المدفوعات"
            icon={Activity}
            iconColor="blue"
            loading={false}
          />
          <StatCard
            title="إجمالي الإيرادات"
            value={`${formatCurrency(statistics.totals?.revenue || 0)}`}
            subtitle="إيرادات مدفوعة"
            icon={TrendingUp}
            iconColor="green"
            loading={false}
          />
          <StatCard
            title="معلقة"
            value={statistics.by_status?.pending || 0}
            subtitle="مدفوعات معلقة"
            icon={DollarSign}
            iconColor="amber"
            loading={false}
          />
          <StatCard
            title="مدفوعة"
            value={statistics.by_status?.paid || 0}
            subtitle="مدفوعات مكتملة"
            icon={CreditCard}
            iconColor="green"
            loading={false}
          />
          <StatCard
            title="مبلغ معلق"
            value={`${formatCurrency(statistics.totals?.pending_amount || 0)}`}
            subtitle="إجمالي المبلغ المعلق"
            icon={DollarSign}
            iconColor="red"
            loading={false}
          />
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Date Filter */}
            <div className="space-y-2">
              <Label htmlFor="date-filter" className="font-arabic">التاريخ</Label>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" aria-hidden="true" />
                <Input
                  id="date-filter"
                  type="date"
                  value={selectedDate.toISOString().split('T')[0]}
                  onChange={(e) => {
                    setSelectedDate(new Date(e.target.value))
                    setCurrentPage(1)
                    setStartDate('')
                    setEndDate('')
                  }}
                  className="text-sm font-arabic"
                  aria-label="اختر التاريخ"
                />
              </div>
            </div>

            {/* Date Range */}
            <div className="space-y-2">
              <Label className="font-arabic">نطاق التاريخ</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  placeholder="تاريخ البداية"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value)
                    setCurrentPage(1)
                    if (e.target.value) setSelectedDate(new Date())
                  }}
                  className="flex-1 text-sm font-arabic"
                  aria-label="تاريخ البداية"
                />
                <span className="text-sm text-gray-600 font-arabic">إلى</span>
                <Input
                  type="date"
                  placeholder="تاريخ النهاية"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value)
                    setCurrentPage(1)
                    if (e.target.value) setSelectedDate(new Date())
                  }}
                  className="flex-1 text-sm font-arabic"
                  aria-label="تاريخ النهاية"
                />
              </div>
            </div>

            {/* Search */}
            <div className="space-y-2">
              <Label htmlFor="search-payments" className="font-arabic">البحث</Label>
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" aria-hidden="true" />
                <Input
                  id="search-payments"
                  type="text"
                  placeholder="البحث بالاسم، الطبيب، أو الرقم..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="pr-10 pl-4 font-arabic"
                  aria-label="بحث المدفوعات"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <Label htmlFor="status-filter" className="font-arabic">الحالة</Label>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-400" aria-hidden="true" />
                <select
                  id="status-filter"
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium focus:border-medical-blue-500 focus:ring-2 focus:ring-medical-blue-100 bg-white text-gray-900 font-arabic"
                  aria-label="فلترة حسب الحالة"
                >
                  <option value="all">كل الحالات</option>
                  <option value="pending">معلق</option>
                  <option value="partially_paid">مدفوع جزئياً</option>
                  <option value="paid">مكتمل</option>
                  <option value="refunded">مسترد</option>
                </select>
              </div>
            </div>

            {/* Method Filter */}
            <div className="space-y-2">
              <Label htmlFor="method-filter" className="font-arabic">طريقة الدفع</Label>
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-gray-400" aria-hidden="true" />
                <select
                  id="method-filter"
                  value={methodFilter}
                  onChange={(e) => {
                    setMethodFilter(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium focus:border-medical-blue-500 focus:ring-2 focus:ring-medical-blue-100 bg-white text-gray-900 font-arabic"
                  aria-label="فلترة حسب طريقة الدفع"
                >
                  <option value="all">كل الطرق</option>
                  <option value="CASH">نقدي</option>
                  <option value="VISA">فيزا</option>
                  <option value="BANK_TRANSFER">تحويل بنكي</option>
                </select>
              </div>
            </div>

            {/* Clinic Filter */}
            {!isDoctor && (
              <div className="space-y-2">
                <Label htmlFor="clinic-filter" className="font-arabic">العيادة</Label>
                <div className="flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-gray-400" aria-hidden="true" />
                  <select
                    id="clinic-filter"
                    value={clinicFilter}
                    onChange={(e) => {
                      setClinicFilter(e.target.value)
                      setCurrentPage(1)
                    }}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium focus:border-medical-blue-500 focus:ring-2 focus:ring-medical-blue-100 bg-white text-gray-900 font-arabic"
                    aria-label="فلترة حسب العيادة"
                  >
                    <option value="all">كل العيادات</option>
                    {clinics.map(clinic => (
                      <option key={clinic.id} value={clinic.id}>{clinic.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Doctor Filter */}
            {!isDoctor && (
              <div className="space-y-2">
                <Label htmlFor="doctor-filter" className="font-arabic">الطبيب</Label>
                <div className="flex items-center gap-2">
                  <Stethoscope className="w-4 h-4 text-gray-400" aria-hidden="true" />
                  <select
                    id="doctor-filter"
                    value={doctorFilter}
                    onChange={(e) => {
                      setDoctorFilter(e.target.value)
                      setCurrentPage(1)
                    }}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium focus:border-medical-blue-500 focus:ring-2 focus:ring-medical-blue-100 bg-white text-gray-900 font-arabic"
                    aria-label="فلترة حسب الطبيب"
                  >
                    <option value="all">كل الأطباء</option>
                    {doctors.map(doctor => (
                      <option key={doctor.id} value={doctor.id}>{doctor.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Per Page */}
            <div className="space-y-2">
              <Label htmlFor="per-page" className="font-arabic">لكل صفحة</Label>
              <select
                id="per-page"
                value={perPage}
                onChange={(e) => {
                  setPerPage(Number(e.target.value))
                  setCurrentPage(1)
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium focus:border-medical-blue-500 focus:ring-2 focus:ring-medical-blue-100 bg-white text-gray-900"
                aria-label="عدد العناصر لكل صفحة"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payments Table */}
      {filteredPayments.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <DollarSign className="w-12 h-12 mx-auto text-gray-400 mb-4" aria-hidden="true" />
            <p className="text-gray-600 font-medium font-arabic">لم يتم العثور على مدفوعات للفلتر المحدد</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="font-arabic">رقم الدفعة</TableHead>
                    <TableHead className="font-arabic">المريض</TableHead>
                    <TableHead className="font-arabic">التاريخ</TableHead>
                    <TableHead className="font-arabic">المبلغ الإجمالي</TableHead>
                    <TableHead className="font-arabic">المبلغ المدفوع</TableHead>
                    <TableHead className="font-arabic">الحالة</TableHead>
                    <TableHead className="font-arabic">طريقة الدفع</TableHead>
                    <TableHead className="font-arabic text-center">الإجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment) => (
                    <TableRow key={payment.id} className="hover:bg-gray-50">
                      <TableCell className="font-medium font-arabic">#{payment.id}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="font-medium font-arabic">{payment.visit?.patient?.name}</div>
                          <div className="text-sm text-gray-600 font-arabic">د. {payment.visit?.doctor?.name}</div>
                        </div>
                      </TableCell>
                      <TableCell className="font-arabic">{formatDate(payment.created_at)}</TableCell>
                      <TableCell className="font-arabic font-semibold">{formatCurrency(payment.total_amount)}</TableCell>
                      <TableCell className="font-arabic">{formatCurrency(payment.amount_paid)}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {getStatusBadge(payment.status)}
                          {payment.status === 'partially_paid' && payment.remaining_amount > 0 && (
                            <div className="text-xs text-red-600 font-arabic">متبقي: {formatCurrency(payment.remaining_amount)}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getMethodBadge(payment.payment_method)}</TableCell>
                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewPayment(payment)}
                            className="h-8 w-8 p-0"
                            aria-label={`عرض تفاصيل الدفعة ${payment.id}`}
                          >
                            <Eye className="w-4 h-4" aria-hidden="true" />
                          </Button>
                          {payment.status === 'paid' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                try {
                                  const invoice = await paymentsApi.getInvoice(payment.visit?.id)
                                  const printWindow = window.open('', '_blank')
                                  if (printWindow) {
                                    printWindow.document.write(`
                                      <html>
                                        <head><title>Payment Receipt</title></head>
                                        <body>
                                          <h2>Payment Receipt</h2>
                                          <p>Payment ID: #${payment.id}</p>
                                          <p>Patient: ${payment.visit?.patient?.name}</p>
                                          <p>Date: ${formatDate(payment.created_at)}</p>
                                          <p>Amount: ${formatCurrency(payment.amount_paid)}</p>
                                          <p>Method: ${payment.payment_method}</p>
                                        </body>
                                      </html>
                                    `)
                                    printWindow.document.close()
                                    printWindow.print()
                                  }
                                } catch (error) {
                                  console.error('Error printing receipt:', error)
                                }
                              }}
                              className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              aria-label={`طباعة إيصال الدفعة ${payment.id}`}
                            >
                              <Printer className="w-4 h-4" aria-hidden="true" />
                            </Button>
                          )}
                          {(payment.status === 'pending' || payment.status === 'partially_paid') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenProcessModal(payment)}
                              className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                              disabled={processPaymentMutation.isPending}
                              aria-label={`معالجة الدفعة ${payment.id}`}
                            >
                              <CreditCard className="w-4 h-4" aria-hidden="true" />
                            </Button>
                          )}
                          {payment.status === 'paid' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRefundPayment(payment)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              aria-label={`استرداد الدفعة ${payment.id}`}
                            >
                              <RefreshCw className="w-4 h-4" aria-hidden="true" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="text-sm text-gray-600 font-arabic">
            عرض {((currentPageNum - 1) * perPage) + 1} إلى {Math.min(currentPageNum * perPage, total)} من {total} دفعة
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPageNum === 1}
              aria-label="الصفحة السابقة"
            >
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">السابق</span>
            </Button>
            <div className="flex gap-1">
              {[...Array(pages)].map((_, i) => {
                const pageNum = i + 1
                if (
                  pageNum === 1 ||
                  pageNum === pages ||
                  (pageNum >= currentPageNum - 1 && pageNum <= currentPageNum + 1)
                ) {
                  return (
                    <Button
                      key={pageNum}
                      variant={pageNum === currentPageNum ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPage(pageNum)}
                      aria-label={`الصفحة ${pageNum}`}
                      aria-current={pageNum === currentPageNum ? 'page' : undefined}
                    >
                      {pageNum}
                    </Button>
                  )
                } else if (
                  pageNum === currentPageNum - 2 ||
                  pageNum === currentPageNum + 2
                ) {
                  return <span key={pageNum} className="px-2 text-gray-500">...</span>
                }
                return null
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(pages, prev + 1))}
              disabled={currentPageNum === pages}
              aria-label="الصفحة التالية"
            >
              <span className="hidden sm:inline">التالي</span>
              <ChevronLeft className="w-4 h-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      )}

      {/* View Payment Dialog */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent size="lg" className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-arabic">تفاصيل الدفعة</DialogTitle>
            <DialogDescription className="font-arabic">
              معلومات شاملة عن الدفعة
            </DialogDescription>
          </DialogHeader>
          
          {selectedPayment && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-gray-500 font-arabic mb-1">رقم الدفعة</Label>
                  <p className="text-base font-semibold font-arabic">#{selectedPayment.id}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-500 font-arabic mb-1">الحالة</Label>
                  {getStatusBadge(selectedPayment.status)}
                </div>
                <div>
                  <Label className="text-sm text-gray-500 font-arabic mb-1">المريض</Label>
                  <p className="text-base font-arabic">{selectedPayment.visit?.patient?.name}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-500 font-arabic mb-1">رقم الهاتف</Label>
                  <p className="text-base font-arabic">{selectedPayment.visit?.patient?.phone}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-500 font-arabic mb-1">الطبيب</Label>
                  <p className="text-base font-arabic">د. {selectedPayment.visit?.doctor?.name}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-500 font-arabic mb-1">العيادة</Label>
                  <p className="text-base font-arabic">{selectedPayment.visit?.clinic?.name}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-500 font-arabic mb-1">الخدمة</Label>
                  <p className="text-base font-arabic">{selectedPayment.visit?.service?.name}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-500 font-arabic mb-1">المبلغ الإجمالي</Label>
                  <p className="text-base font-semibold font-arabic">{formatCurrency(selectedPayment.total_amount)}</p>
                </div>
                {selectedPayment.discount_amount > 0 && (
                  <div>
                    <Label className="text-sm text-gray-500 font-arabic mb-1">الخصم</Label>
                    <p className="text-base font-semibold text-red-600 font-arabic">{formatCurrency(selectedPayment.discount_amount)}</p>
                  </div>
                )}
                <div>
                  <Label className="text-sm text-gray-500 font-arabic mb-1">المبلغ المدفوع</Label>
                  <p className="text-base font-semibold font-arabic">{formatCurrency(selectedPayment.amount_paid)}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-500 font-arabic mb-1">المبلغ المتبقي</Label>
                  <p className={`text-base font-semibold font-arabic ${selectedPayment.remaining_amount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {formatCurrency(selectedPayment.remaining_amount)}
                  </p>
                </div>
                <div>
                  <Label className="text-sm text-gray-500 font-arabic mb-1">طريقة الدفع</Label>
                  {getMethodBadge(selectedPayment.payment_method)}
                </div>
                <div>
                  <Label className="text-sm text-gray-500 font-arabic mb-1">نصيب الطبيب</Label>
                  <p className="text-base font-arabic">{formatCurrency(selectedPayment.doctor_share)}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-500 font-arabic mb-1">نصيب المركز</Label>
                  <p className="text-base font-arabic">{formatCurrency(selectedPayment.center_share)}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-500 font-arabic mb-1">التاريخ</Label>
                  <p className="text-base font-arabic">{formatDate(selectedPayment.created_at)}</p>
                </div>
                <div>
                  <Label className="text-sm text-gray-500 font-arabic mb-1">الوقت</Label>
                  <p className="text-base font-arabic">{formatTime(selectedPayment.created_at)}</p>
                </div>
              </div>
              
              {selectedPayment.status === 'refunded' && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <Label className="text-sm font-medium text-red-700 font-arabic mb-1">حالة الاسترداد</Label>
                  <p className="text-red-800 font-semibold font-arabic">تم استرداد هذه الدفعة</p>
                </div>
              )}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
              إغلاق
            </Button>
            {(selectedPayment?.status === 'pending' || selectedPayment?.status === 'partially_paid') && (
              <Button onClick={() => {
                setIsViewModalOpen(false)
                handleOpenProcessModal(selectedPayment)
              }}>
                معالجة الدفعة
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Process Payment Dialog */}
      <Dialog open={isProcessModalOpen} onOpenChange={setIsProcessModalOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle className="font-arabic">معالجة الدفعة</DialogTitle>
            <DialogDescription className="font-arabic">
              قم بإدخال تفاصيل المعالجة
            </DialogDescription>
          </DialogHeader>
          
          {selectedPayment && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-gray-500 font-arabic mb-1">المبلغ الإجمالي</Label>
                    <p className="text-lg font-bold text-blue-900 font-arabic">{formatCurrency(selectedPayment.total_amount)}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500 font-arabic mb-1">المبلغ المدفوع مسبقاً</Label>
                    <p className="text-lg font-semibold font-arabic">{formatCurrency(selectedPayment.amount_paid || 0)}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="discount-amount" className="font-arabic">مبلغ الخصم</Label>
                  <Input
                    id="discount-amount"
                    type="number"
                    step="0.01"
                    value={processingForm.discount_amount}
                    onChange={(e) => {
                      const discount = parseFloat(e.target.value) || 0
                      setProcessingForm({
                        ...processingForm,
                        discount_amount: discount,
                        amount_paid: Math.min(processingForm.amount_paid, selectedPayment.total_amount - discount - (selectedPayment.amount_paid || 0))
                      })
                    }}
                    max={selectedPayment.total_amount}
                    placeholder="أدخل الخصم (اختياري)"
                    className="font-arabic"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount-paid" className="font-arabic">المبلغ المدفوع *</Label>
                  <Input
                    id="amount-paid"
                    type="number"
                    step="0.01"
                    value={processingForm.amount_paid}
                    onChange={(e) => setProcessingForm({ ...processingForm, amount_paid: parseFloat(e.target.value) || 0 })}
                    max={maxAllowedPayment}
                    min={0}
                    placeholder="أدخل المبلغ"
                    className="font-arabic"
                  />
                  <p className="text-xs text-gray-500 font-arabic">الحد الأقصى المسموح: {formatCurrency(maxAllowedPayment)}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payment-method" className="font-arabic">طريقة الدفع *</Label>
                  <select
                    id="payment-method"
                    value={processingForm.payment_method}
                    onChange={(e) => setProcessingForm({ ...processingForm, payment_method: e.target.value })}
                    className="w-full h-12 border-2 border-gray-200 rounded-lg px-4 py-2 text-sm font-medium focus:border-medical-blue-500 focus:ring-2 focus:ring-medical-blue-100 bg-white text-gray-900 font-arabic"
                  >
                    <option value="CASH">نقدي</option>
                    <option value="VISA">فيزا</option>
                    <option value="BANK_TRANSFER">تحويل بنكي</option>
                  </select>
                </div>

                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <Label className="block text-sm font-medium text-gray-700 font-arabic mb-1">المبلغ المتبقي بعد الدفع</Label>
                  <p className="text-lg font-bold text-green-900 font-arabic">
                    {formatCurrency(Math.max(0, maxAllowedPayment - processingForm.amount_paid))}
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsProcessModalOpen(false)
                setSelectedPayment(null)
                setProcessingForm({ discount_amount: 0, amount_paid: 0, payment_method: 'CASH' })
              }}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleProcessPayment}
              disabled={processPaymentMutation.isPending || processingForm.amount_paid <= 0 || processingForm.amount_paid > maxAllowedPayment}
              loading={processPaymentMutation.isPending}
            >
              معالجة الدفعة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Refund Payment Dialog */}
      <Dialog open={isRefundModalOpen} onOpenChange={setIsRefundModalOpen}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle className="font-arabic text-red-600">استرداد الدفعة</DialogTitle>
            <DialogDescription className="font-arabic">
              هل أنت متأكد من رغبتك في استرداد هذه الدفعة؟
            </DialogDescription>
          </DialogHeader>
          
          {selectedPayment && (
            <div className="space-y-4">
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800 font-arabic">
                  <strong>تحذير:</strong> هذا الإجراء سيقوم باسترداد الدفعة ولا يمكن التراجع عنه.
                </p>
              </div>
              
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-gray-500 font-arabic mb-1">مبلغ الدفعة</Label>
                    <p className="text-lg font-bold text-blue-900 font-arabic">{formatCurrency(selectedPayment.amount_paid)}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500 font-arabic mb-1">طريقة الدفع</Label>
                    <p className="text-lg font-semibold font-arabic">{getMethodBadge(selectedPayment.payment_method).props.children}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500 font-arabic mb-1">المريض</Label>
                    <p className="font-arabic">{selectedPayment.visit?.patient?.name}</p>
                  </div>
                  <div>
                    <Label className="text-gray-500 font-arabic mb-1">التاريخ</Label>
                    <p className="font-arabic">{formatDate(selectedPayment.created_at)}</p>
                  </div>
                </div>
              </div>
              
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800 font-arabic">
                  <strong>ملاحظة:</strong> سيتم استرداد المبلغ الكامل ({formatCurrency(selectedPayment.amount_paid)}). 
                  سيتم تغيير حالة الدفعة إلى مسترد وحالة الزيارة إلى في انتظار الدفع.
                </p>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsRefundModalOpen(false)}
            >
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={handleRefund}
              disabled={refundPaymentMutation.isPending}
              loading={refundPaymentMutation.isPending}
            >
              استرداد الدفعة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}

export default PaymentsPage

