import React, { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import { 
  CreditCard, DollarSign, Calendar, User, Search, Filter, Eye, RefreshCw, FileSpreadsheet,
  ChevronLeft, ChevronRight, TrendingUp, Activity, Printer, Building2, Stethoscope
} from 'lucide-react'
import { Button } from '../components/common/Button'
import { Card } from '../components/common/Card'
import { Modal } from '../components/common/Modal'
import { Spinner } from '../components/common/Spinner'
import PageContainer from '../components/layout/PageContainer'
import { paymentsApi } from '../api'
import { clinicsApi, doctorsApi } from '../api'
import { formatDate, formatTime, formatCurrency } from '../utils/formatters'
import { useMutationWithRefetch } from '../hooks/useMutationWithRefetch'
import { useDoctorFilters } from '../hooks/useDoctorFilters'

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

  // Add date parameters based on what's selected
  if (startDate && endDate) {
    queryParams.start_date = startDate
    queryParams.end_date = endDate
  } else {
    queryParams.date = selectedDate.toISOString().split('T')[0]
  }

  // Add doctor/clinic filters automatically for doctors
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

  // Check for paymentId or visitId in URL params - MUST be after payments query is defined
  useEffect(() => {
    const paymentId = searchParams.get('paymentId')
    const visitId = searchParams.get('visitId')
    
    // Only process if we have a paymentId or visitId in the URL and haven't processed it yet
    if (!paymentId && !visitId) {
      hasProcessedUrlParams.current = false
      return
    }
    
    // Track which params we're processing to avoid duplicate fetches
    const currentParams = `${paymentId || ''}_${visitId || ''}`
    if (hasProcessedUrlParams.current === currentParams) {
      return // Already processed these params
    }
    
    // If we have paymentId, fetch it directly (more reliable than checking loaded payments)
    if (paymentId) {
      // First check if it's already in loaded payments (quick check)
      const existingPayment = payments.find(p => p.id === parseInt(paymentId))
      if (existingPayment) {
        setSelectedPayment(existingPayment)
        setIsProcessModalOpen(true)
        hasProcessedUrlParams.current = currentParams
        // Remove paymentId from URL after opening modal
        const newSearchParams = new URLSearchParams(searchParams)
        newSearchParams.delete('paymentId')
        window.history.replaceState({}, '', `${window.location.pathname}${newSearchParams.toString() ? '?' + newSearchParams.toString() : ''}`)
        return
      }
      
      // Always try to fetch directly from API (works regardless of date filters)
      hasProcessedUrlParams.current = currentParams // Mark as processing
      paymentsApi.getPayment(parseInt(paymentId))
        .then(response => {
          if (response?.payment) {
            setSelectedPayment(response.payment)
            setIsProcessModalOpen(true)
            // Remove paymentId from URL after opening modal
            const newSearchParams = new URLSearchParams(searchParams)
            newSearchParams.delete('paymentId')
            window.history.replaceState({}, '', `${window.location.pathname}${newSearchParams.toString() ? '?' + newSearchParams.toString() : ''}`)
          }
        })
        .catch(error => {
          console.error('Error fetching payment:', error)
          hasProcessedUrlParams.current = false // Reset on error so it can retry
        })
    } else if (visitId) {
      // If visitId is provided, find payment by visit_id
      // First check loaded payments
      const existingPayment = payments.find(p => p.visit?.id === parseInt(visitId))
      if (existingPayment) {
        setSelectedPayment(existingPayment)
        setIsProcessModalOpen(true)
        hasProcessedUrlParams.current = currentParams
        // Remove visitId from URL after opening modal
        const newSearchParams = new URLSearchParams(searchParams)
        newSearchParams.delete('visitId')
        window.history.replaceState({}, '', `${window.location.pathname}${newSearchParams.toString() ? '?' + newSearchParams.toString() : ''}`)
        return
      }
      
      // Always try to fetch by visit_id (works regardless of date filters)
      hasProcessedUrlParams.current = currentParams // Mark as processing
      paymentsApi.getPayments({ visit_id: parseInt(visitId) })
        .then(response => {
          const foundPayments = response?.payments || []
          if (foundPayments.length > 0) {
            setSelectedPayment(foundPayments[0])
            setIsProcessModalOpen(true)
            // Remove visitId from URL after opening modal
            const newSearchParams = new URLSearchParams(searchParams)
            newSearchParams.delete('visitId')
            window.history.replaceState({}, '', `${window.location.pathname}${newSearchParams.toString() ? '?' + newSearchParams.toString() : ''}`)
          }
        })
        .catch(error => {
          console.error('Error fetching payment by visit:', error)
          hasProcessedUrlParams.current = false // Reset on error so it can retry
        })
    }
  }, [searchParams, payments, isLoading])

  // Process payment mutation
  const processPaymentMutation = useMutationWithRefetch({
    mutationFn: ({ id, data }) => paymentsApi.processExistingPayment(id, data),
    queryKeys: [['payments'], ['dashboard-stats']],
    onSuccessMessage: 'Payment processed successfully',
    onErrorMessage: 'Failed to process payment',
    onSuccessCallback: () => {
      setIsProcessModalOpen(false)
      setSelectedPayment(null)
      setProcessingForm({ discount_amount: 0, amount_paid: 0, payment_method: 'CASH' })
    }
  })

  // Refund payment mutation
  const refundPaymentMutation = useMutationWithRefetch({
    mutationFn: (id) => paymentsApi.refundPayment(id),
    queryKeys: [['payments'], ['dashboard-stats']],
    onSuccessMessage: 'Payment refunded successfully',
    onErrorMessage: 'Failed to refund payment',
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
      
      // Create blob and download
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      
      // Generate filename
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
      alert('Failed to export payments')
    }
  }

  // Filter payments client-side (only for search - clinic and doctor are now filtered on backend)
  const filteredPayments = payments.filter(payment => {
    // Search filter (client-side for better UX)
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
      amount_paid: payment.amount_paid || 0,  // Start with what's already paid
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'partially_paid': return 'bg-blue-100 text-blue-800'
      case 'paid': return 'bg-green-100 text-green-800'
      case 'refunded': return 'bg-red-100 text-red-800'
      case 'failed': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getMethodColor = (method) => {
    const methodUpper = method?.toUpperCase()
    switch (methodUpper) {
      case 'CASH': return 'bg-green-100 text-green-800'
      case 'VISA': return 'bg-blue-100 text-blue-800'
      case 'BANK_TRANSFER': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Use statistics if available, otherwise calculate from loaded payments
  const totalRevenue = statistics?.totals?.revenue || payments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + parseFloat(p.amount_paid || 0), 0)

  const totalRefunds = statistics?.totals?.refunds || payments
    .filter(p => p.status === 'refunded')
    .reduce((sum, p) => sum + parseFloat(p.amount_paid || 0), 0)

  // Calculate max allowed payment (total amount after discount)
  const maxAllowedPayment = selectedPayment 
    ? (selectedPayment.total_amount - (selectedPayment.discount_amount || 0))
    : 0

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <PageContainer className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Payments</h1>
        <Button
          onClick={handleExportPayments}
          variant="outline"
          className="flex items-center gap-2"
        >
          <FileSpreadsheet className="w-4 h-4" />
          Export to Excel
        </Button>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Payments</p>
                <p className="text-2xl font-bold">{statistics.total || 0}</p>
              </div>
              <Activity className="w-8 h-8 text-blue-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(statistics.totals?.revenue || 0)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-yellow-600">{statistics.by_status?.pending || 0}</p>
              </div>
              <DollarSign className="w-8 h-8 text-yellow-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Paid</p>
                <p className="text-2xl font-bold text-green-600">{statistics.by_status?.paid || 0}</p>
              </div>
              <CreditCard className="w-8 h-8 text-green-500" />
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Amount</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(statistics.totals?.pending_amount || 0)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-red-500" />
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
            <input
              type="date"
              value={selectedDate.toISOString().split('T')[0]}
              onChange={(e) => {
                setSelectedDate(new Date(e.target.value))
                setCurrentPage(1)
                setStartDate('')
                setEndDate('')
              }}
              className="border rounded px-3 py-2 flex-1 min-w-0 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-medium shrink-0">OR Date Range:</span>
            <input
              type="date"
              placeholder="Start Date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value)
                setCurrentPage(1)
                if (e.target.value) setSelectedDate(new Date())
              }}
              className="border rounded px-3 py-2 flex-1 min-w-0 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <span className="text-sm shrink-0">to</span>
            <input
              type="date"
              placeholder="End Date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value)
                setCurrentPage(1)
                if (e.target.value) setSelectedDate(new Date())
              }}
              className="border rounded px-3 py-2 flex-1 min-w-0 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex items-center gap-2 min-w-0">
            <Search className="w-4 h-4 text-gray-400 shrink-0" />
            <input
              type="text"
              placeholder="Search by patient, doctor, ID..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
              className="border rounded px-3 py-2 flex-1 min-w-0 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center gap-2 min-w-0">
            <Filter className="w-4 h-4 text-gray-400 shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="border rounded px-3 py-2 flex-1 min-w-0 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="paid">Completed</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>

          <div className="flex items-center gap-2 min-w-0">
            <CreditCard className="w-4 h-4 text-gray-400 shrink-0" />
            <select
              value={methodFilter}
              onChange={(e) => {
                setMethodFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="border rounded px-3 py-2 flex-1 min-w-0 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Methods</option>
              <option value="CASH">Cash</option>
              <option value="VISA">Visa</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
            </select>
          </div>

          <div className="flex items-center gap-2 min-w-0">
            <Building2 className="w-4 h-4 text-gray-400 shrink-0" />
            <select
              value={clinicFilter}
              onChange={(e) => {
                setClinicFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="border rounded px-3 py-2 flex-1 min-w-0 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Clinics</option>
              {clinics.map(clinic => (
                <option key={clinic.id} value={clinic.id}>{clinic.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 min-w-0">
            <Stethoscope className="w-4 h-4 text-gray-400 shrink-0" />
            <select
              value={doctorFilter}
              onChange={(e) => {
                setDoctorFilter(e.target.value)
                setCurrentPage(1)
              }}
              className="border rounded px-3 py-2 flex-1 min-w-0 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Doctors</option>
              {doctors.map(doctor => (
                <option key={doctor.id} value={doctor.id}>{doctor.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 min-w-0">
            <label className="text-sm text-gray-600 shrink-0">Per Page:</label>
            <select
              value={perPage}
              onChange={(e) => {
                setPerPage(Number(e.target.value))
                setCurrentPage(1)
              }}
              className="border rounded px-2 py-2 text-sm"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Payments List */}
      <div className="grid gap-4">
        {filteredPayments.length === 0 ? (
          <Card className="p-8 text-center">
            <DollarSign className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">No payments found for the selected filters</p>
          </Card>
        ) : (
          filteredPayments.map((payment) => (
            <Card key={payment.id} className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-2">
                    <h3 className="font-semibold text-lg">
                      Payment #{payment.id}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(payment.status)}`}>
                      {payment.status === 'partially_paid' ? `PARTIALLY PAID (${formatCurrency(payment.remaining_amount)} remaining)` : payment.status.toUpperCase()}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getMethodColor(payment.payment_method)}`}>
                      {payment.payment_method}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span>{payment.visit?.patient?.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(payment.created_at)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-4 h-4" />
                      <span className="font-semibold">{formatCurrency(payment.total_amount)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span>Dr. {payment.visit?.doctor?.name}</span>
                    </div>
                  </div>
                  
                  <div className="mt-2 text-sm text-gray-500">
                    {payment.discount_amount > 0 && (
                      <span className="font-medium">Discount: {formatCurrency(payment.discount_amount)} • </span>
                    )}
                    <span className="font-medium">Amount Paid:</span> {formatCurrency(payment.amount_paid)} • 
                    {payment.remaining_amount > 0 && (
                      <span className="text-red-600 font-semibold ml-2">Remaining: {formatCurrency(payment.remaining_amount)}</span>
                    )}
                    <span className="font-medium ml-2">Doctor Share:</span> {formatCurrency(payment.doctor_share)} • 
                    <span className="font-medium ml-2">Center Share:</span> {formatCurrency(payment.center_share)}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewPayment(payment)}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  {payment.status === 'paid' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        try {
                          const invoice = await paymentsApi.getInvoice(payment.visit?.id)
                          // Print invoice (simple window.print for now)
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
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <Printer className="w-4 h-4" />
                    </Button>
                  )}
                  {(payment.status === 'pending' || payment.status === 'partially_paid') && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenProcessModal(payment)}
                      className="text-green-600 hover:text-green-700"
                      disabled={processPaymentMutation.isPending}
                    >
                      Process Payment
                    </Button>
                  )}
                  {payment.status === 'paid' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRefundPayment(payment)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
        </Card>
          ))
        )}
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex justify-center items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPageNum === 1}
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>
          
          <div className="flex gap-1">
            {[...Array(pages)].map((_, i) => {
              const pageNum = i + 1
              // Show first, last, current, and pages around current
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
                  >
                    {pageNum}
                  </Button>
                )
              } else if (
                pageNum === currentPageNum - 2 ||
                pageNum === currentPageNum + 2
              ) {
                return <span key={pageNum} className="px-2">...</span>
              }
              return null
            })}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentPage(prev => Math.min(pages, prev + 1))}
            disabled={currentPageNum === pages}
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* View Payment Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Payment Details"
      >
        {selectedPayment && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Payment ID</label>
                <p className="text-lg">#{selectedPayment.id}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Status</label>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedPayment.status)}`}>
                  {selectedPayment.status.toUpperCase()}
                </span>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Patient</label>
                <p>{selectedPayment.visit?.patient?.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Phone</label>
                <p>{selectedPayment.visit?.patient?.phone}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Doctor</label>
                <p>Dr. {selectedPayment.visit?.doctor?.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Clinic</label>
                <p>{selectedPayment.visit?.clinic?.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Service</label>
                <p>{selectedPayment.visit?.service?.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Total Amount</label>
                <p className="text-lg font-semibold">{formatCurrency(selectedPayment.total_amount)}</p>
              </div>
              {selectedPayment.discount_amount > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Discount</label>
                  <p className="text-red-600 font-semibold">{formatCurrency(selectedPayment.discount_amount)}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-gray-500">Amount Paid</label>
                <p className="text-lg font-semibold">{formatCurrency(selectedPayment.amount_paid)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Remaining Amount</label>
                <p className={`text-lg font-semibold ${selectedPayment.remaining_amount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {formatCurrency(selectedPayment.remaining_amount)}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Payment Method</label>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getMethodColor(selectedPayment.payment_method)}`}>
                  {selectedPayment.payment_method}
                </span>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Doctor Share</label>
                <p>{formatCurrency(selectedPayment.doctor_share)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Center Share</label>
                <p>{formatCurrency(selectedPayment.center_share)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Date</label>
                <p>{formatDate(selectedPayment.created_at)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Time</label>
                <p>{formatTime(selectedPayment.created_at)}</p>
              </div>
            </div>
            
            {selectedPayment.status === 'refunded' && (
              <div className="p-3 bg-red-50 rounded">
                <label className="text-sm font-medium text-red-700">Refund Status</label>
                <p className="text-red-800 font-semibold">This payment has been refunded</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Process Payment Modal */}
      <Modal
        isOpen={isProcessModalOpen}
        onClose={() => {
          setIsProcessModalOpen(false)
          setSelectedPayment(null)
          setProcessingForm({ discount_amount: 0, amount_paid: 0, payment_method: 'CASH' })
        }}
        title="Process Payment"
      >
        {selectedPayment && (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="text-gray-500">Total Amount</label>
                  <p className="text-lg font-bold text-blue-900">{formatCurrency(selectedPayment.total_amount)}</p>
                </div>
                <div>
                  <label className="text-gray-500">Already Paid</label>
                  <p className="text-lg font-semibold">{formatCurrency(selectedPayment.amount_paid || 0)}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Discount Amount</label>
                <input
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
                  placeholder="Enter discount (optional)"
                  className="w-full border rounded px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount Paid *</label>
                <input
                  type="number"
                  step="0.01"
                  value={processingForm.amount_paid}
                  onChange={(e) => setProcessingForm({ ...processingForm, amount_paid: parseFloat(e.target.value) || 0 })}
                  max={maxAllowedPayment}
                  min={0}
                  placeholder="Enter amount"
                  className="w-full border rounded px-3 py-2"
                />
                <p className="text-xs text-gray-500 mt-1">Max allowed: {formatCurrency(maxAllowedPayment)}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method *</label>
                <select
                  value={processingForm.payment_method}
                  onChange={(e) => setProcessingForm({ ...processingForm, payment_method: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="CASH">Cash</option>
                  <option value="VISA">Visa</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                </select>
              </div>

              <div className="p-3 bg-green-50 rounded">
                <label className="block text-sm font-medium text-gray-700 mb-1">Remaining After Payment</label>
                <p className="text-lg font-bold text-green-900">
                  {formatCurrency(Math.max(0, maxAllowedPayment - processingForm.amount_paid))}
                </p>
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsProcessModalOpen(false)
                  setSelectedPayment(null)
                  setProcessingForm({ discount_amount: 0, amount_paid: 0, payment_method: 'CASH' })
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleProcessPayment}
                disabled={processPaymentMutation.isPending || processingForm.amount_paid <= 0 || processingForm.amount_paid > maxAllowedPayment}
                className="bg-green-600 hover:bg-green-700"
              >
                {processPaymentMutation.isPending ? 'Processing...' : 'Process Payment'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Refund Payment Modal */}
      <Modal
        isOpen={isRefundModalOpen}
        onClose={() => setIsRefundModalOpen(false)}
        title="Refund Payment"
      >
        {selectedPayment && (
          <div className="space-y-4">
            <div className="p-4 bg-yellow-50 rounded">
              <p className="text-sm text-yellow-800">
                <strong>Warning:</strong> This action will refund the payment and cannot be undone.
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="text-gray-500">Payment Amount</label>
                    <p className="text-lg font-bold text-blue-900">{formatCurrency(selectedPayment.amount_paid)}</p>
                  </div>
                  <div>
                    <label className="text-gray-500">Payment Method</label>
                    <p className="text-lg font-semibold">{selectedPayment.payment_method}</p>
                  </div>
                  <div>
                    <label className="text-gray-500">Patient</label>
                    <p>{selectedPayment.visit?.patient?.name}</p>
                  </div>
                  <div>
                    <label className="text-gray-500">Date</label>
                    <p>{formatDate(selectedPayment.created_at)}</p>
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Refund Reason (Optional)</label>
                <textarea
                  placeholder="Enter reason for refund (optional)"
                  className="w-full border rounded px-3 py-2"
                  rows="3"
                />
              </div>
              
              <div className="p-3 bg-yellow-50 rounded">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> This will refund the full payment amount ({formatCurrency(selectedPayment.amount_paid)}). 
                  The payment status will be changed to REFUNDED and the visit status will revert to PENDING_PAYMENT.
                </p>
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsRefundModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleRefund}
                disabled={refundPaymentMutation.isPending}
                className="bg-red-600 hover:bg-red-700"
              >
                {refundPaymentMutation.isPending ? <Spinner size="sm" /> : 'Process Refund'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Toast Notifications */}
      {(processPaymentMutation.toast.show || refundPaymentMutation.toast.show) && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 ${
          (processPaymentMutation.toast.show ? processPaymentMutation.toast.type : refundPaymentMutation.toast.type) === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          <div className={`w-5 h-5 flex items-center justify-center rounded-full ${(processPaymentMutation.toast.show ? processPaymentMutation.toast.type : refundPaymentMutation.toast.type) === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
            {(processPaymentMutation.toast.show ? processPaymentMutation.toast.type : refundPaymentMutation.toast.type) === 'success' ? '✓' : '✕'}
          </div>
          <span className="font-medium">{processPaymentMutation.toast.show ? processPaymentMutation.toast.message : refundPaymentMutation.toast.message}</span>
          <button 
            onClick={() => {
              if (processPaymentMutation.toast.show) processPaymentMutation.dismissToast()
              if (refundPaymentMutation.toast.show) refundPaymentMutation.dismissToast()
            }}
            className="ml-2 text-white hover:text-gray-200"
          >
            ✕
          </button>
        </div>
      )}
    </PageContainer>
  )
}

export default PaymentsPage
