import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CreditCard, DollarSign, Calendar, User, Search, Filter, Eye, RefreshCw } from 'lucide-react'
import { Button } from '../components/common/Button'
import { Card } from '../components/common/Card'
import { Modal } from '../components/common/Modal'
import { Spinner } from '../components/common/Spinner'
import { paymentsApi, visitsApi } from '../api'
import { formatDate, formatTime, formatCurrency } from '../utils/formatters'

const PaymentsPage = () => {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [methodFilter, setMethodFilter] = useState('all')
  const [selectedPayment, setSelectedPayment] = useState(null)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false)

  const queryClient = useQueryClient()

  // Fetch payments
  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['payments', selectedDate.toISOString().split('T')[0], statusFilter, methodFilter],
    queryFn: () => paymentsApi.getPayments({
      date: selectedDate.toISOString().split('T')[0],
      status: statusFilter !== 'all' ? statusFilter : undefined,
      method: methodFilter !== 'all' ? methodFilter : undefined
    }).then(res => res?.payments || [])
  })

  // Process payment mutation
  const processPaymentMutation = useMutation({
    mutationFn: ({ id, amount, method }) => paymentsApi.processExistingPayment(id, { amount_paid: amount, payment_method: method }),
    onSuccess: () => {
      queryClient.invalidateQueries(['payments'])
      queryClient.invalidateQueries(['dashboard-stats'])
    }
  })

  // Refund payment mutation
  const refundPaymentMutation = useMutation({
    mutationFn: (id) => paymentsApi.refundPayment(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['payments'])
      setIsRefundModalOpen(false)
      setSelectedPayment(null)
    }
  })

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

  const handleProcessPayment = (payment) => {
    if (window.confirm(`Process payment of $${payment.total_amount} for this visit?`)) {
      processPaymentMutation.mutate({
        id: payment.id,
        amount: payment.total_amount,
        method: payment.payment_method
      })
    }
  }

  const handleRefundPayment = (payment) => {
    setSelectedPayment(payment)
    setIsRefundModalOpen(true)
  }

  const handleRefund = (refundData) => {
    refundPaymentMutation.mutate(selectedPayment.id)
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'refunded': return 'bg-red-100 text-red-800'
      case 'failed': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getMethodColor = (method) => {
    switch (method) {
      case 'cash': return 'bg-green-100 text-green-800'
      case 'card': return 'bg-blue-100 text-blue-800'
      case 'transfer': return 'bg-purple-100 text-purple-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const totalRevenue = payments
    .filter(p => p.status === 'completed')
    .reduce((sum, p) => sum + parseFloat(p.total_amount || 0), 0)

  const totalRefunds = payments
    .filter(p => p.status === 'refunded')
    .reduce((sum, p) => sum + parseFloat(p.refund_amount || 0), 0)

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
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
              <option value="completed">Completed</option>
              <option value="refunded">Refunded</option>
              <option value="failed">Failed</option>
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
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="transfer">Transfer</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Payments List */}
      <div className="grid gap-4">
        {filteredPayments.length === 0 ? (
          <Card className="p-8 text-center">
            <DollarSign className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">No payments found for the selected date</p>
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
                      {payment.status.toUpperCase()}
                    </span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getMethodColor(payment.payment_method)}`}>
                      {payment.payment_method.toUpperCase()}
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
                    <span className="font-medium">Doctor Share:</span> {formatCurrency(payment.doctor_share)} • 
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
                  {payment.status === 'pending' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleProcessPayment(payment)}
                      className="text-green-600 hover:text-green-700"
                      disabled={processPaymentMutation.isPending}
                    >
                      {processPaymentMutation.isPending ? 'Processing...' : 'Process Payment'}
                    </Button>
                  )}
                  {payment.status === 'completed' && (
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
                <label className="text-sm font-medium text-gray-500">Doctor</label>
                <p>Dr. {selectedPayment.visit?.doctor?.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Total Amount</label>
                <p className="text-lg font-semibold">{formatCurrency(selectedPayment.total_amount)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Payment Method</label>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getMethodColor(selectedPayment.payment_method)}`}>
                  {selectedPayment.payment_method.toUpperCase()}
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
                onClick={() => handleRefund({
                  refund_amount: selectedPayment.total_amount,
                  reason: 'Refund requested'
                })}
                disabled={refundPaymentMutation.isPending}
                className="bg-red-600 hover:bg-red-700"
              >
                {refundPaymentMutation.isPending ? <Spinner size="sm" /> : 'Process Refund'}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default PaymentsPage