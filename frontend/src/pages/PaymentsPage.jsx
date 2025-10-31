import React, { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import { CreditCard, DollarSign, Calendar, User, Search, Filter, Eye, RefreshCw, FileSpreadsheet } from 'lucide-react'
import { Button } from '../components/common/Button'
import { Card } from '../components/common/Card'
import { Modal } from '../components/common/Modal'
import { Spinner } from '../components/common/Spinner'
import PageContainer from '../components/layout/PageContainer'
import { paymentsApi } from '../api'
import { formatDate, formatTime, formatCurrency } from '../utils/formatters'
import { useMutationWithRefetch } from '../hooks/useMutationWithRefetch'

const PaymentsPage = () => {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [methodFilter, setMethodFilter] = useState('all')
  const [selectedPayment, setSelectedPayment] = useState(null)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false)
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false)
  
  // Processing modal form state
  const [processingForm, setProcessingForm] = useState({
    discount_amount: 0,
    amount_paid: 0,
    payment_method: 'CASH'
  })

  const queryClient = useQueryClient()
  const [searchParams] = useSearchParams()

  // Check for paymentId in URL params
  useEffect(() => {
    const paymentId = searchParams.get('paymentId')
    if (paymentId) {
      // Fetch payment data and open processing modal
      const payment = payments.find(p => p.id === parseInt(paymentId))
      if (payment) {
        setSelectedPayment(payment)
        setIsProcessModalOpen(true)
      }
    }
  }, [searchParams])

  // Determine date range for query
  const queryParams = {
    status: statusFilter !== 'all' ? statusFilter : undefined,
    method: methodFilter !== 'all' ? methodFilter : undefined
  }

  // Add date parameters based on what's selected
  if (startDate && endDate) {
    queryParams.start_date = startDate
    queryParams.end_date = endDate
  } else {
    queryParams.date = selectedDate.toISOString().split('T')[0]
  }

  // Fetch payments
  const { data: paymentsData, isLoading } = useQuery({
    queryKey: ['payments', queryParams],
    queryFn: () => paymentsApi.getPayments(queryParams).then(res => res?.payments || [])
  })

  const payments = paymentsData || []

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

  const filteredPayments = payments.filter(payment => {
    if (!searchQuery) return true
    const searchLower = searchQuery.toLowerCase()
    return (
      payment.visit?.patient?.name?.toLowerCase().includes(searchLower) ||
      payment.visit?.patient?.phone?.includes(searchQuery) ||
      payment.visit?.doctor?.name?.toLowerCase().includes(searchLower) ||
      payment.id.toString().includes(searchQuery)
    )
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
    switch (method) {
      case 'CASH': return 'bg-green-100 text-green-800'
      case 'VISA': return 'bg-blue-100 text-blue-800'
      case 'BANK_TRANSFER': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const totalRevenue = payments
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + parseFloat(p.amount_paid || 0), 0)

  const totalRefunds = payments
    .filter(p => p.status === 'refunded')
    .reduce((sum, p) => sum + parseFloat(p.refund_amount || 0), 0)

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
        <div className="flex gap-4">
          <div className="text-right">
            <p className="text-sm text-gray-500">Total Revenue</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalRevenue)}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Total Refunds</p>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(totalRefunds)}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <input
              type="date"
              value={selectedDate.toISOString().split('T')[0]}
              onChange={(e) => setSelectedDate(new Date(e.target.value))}
              className="border rounded px-3 py-1"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">OR Date Range:</span>
            <input
              type="date"
              placeholder="Start Date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border rounded px-3 py-1"
            />
            <span className="text-sm">to</span>
            <input
              type="date"
              placeholder="End Date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border rounded px-3 py-1"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4" />
            <input
              type="text"
              placeholder="Search payments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border rounded px-3 py-1 w-64"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border rounded px-3 py-1"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="partially_paid">Partially Paid</option>
              <option value="paid">Completed</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4" />
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="border rounded px-3 py-1"
            >
              <option value="all">All Methods</option>
              <option value="CASH">Cash</option>
              <option value="VISA">Visa</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Export Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleExportPayments}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
        >
          <FileSpreadsheet className="w-4 h-4" />
          Export to Excel
        </Button>
      </div>

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
            
            {selectedPayment.refund_amount && (
              <div className="p-3 bg-red-50 rounded">
                <label className="text-sm font-medium text-red-700">Refund Amount</label>
                <p className="text-red-800 font-semibold">{formatCurrency(selectedPayment.refund_amount)}</p>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Amount</label>
                <p className="text-lg font-semibold">{formatCurrency(selectedPayment.total_amount)}</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Refund Amount *</label>
                <input
                  type="number"
                  step="0.01"
                  max={selectedPayment.total_amount}
                  placeholder="Enter refund amount"
                  className="w-full border rounded px-3 py-2"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Refund Reason</label>
                <textarea
                  placeholder="Enter reason for refund"
                  className="w-full border rounded px-3 py-2"
                  rows="3"
                />
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
