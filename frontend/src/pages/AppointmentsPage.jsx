import React, { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Calendar, Clock, User, Phone, Search, Filter, Plus, Eye, Edit, Trash2 } from 'lucide-react'
import { Button } from '../components/common/Button'
import { Card } from '../components/common/Card'
import { Modal } from '../components/common/Modal'
import { Spinner } from '../components/common/Spinner'
import BookingWizard from '../components/BookingWizard'
import { appointmentsApi, patientsApi, clinicsApi } from '../api'
import { formatDate, formatTime } from '../utils/formatters'
import { useMutationWithRefetch } from '../hooks/useMutationWithRefetch'
import PageContainer from '../components/layout/PageContainer'

const AppointmentsPage = () => {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedAppointment, setSelectedAppointment] = useState(null)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false)

  // Fetch appointments
  const { data: appointments = [], isLoading, error } = useQuery({
    queryKey: ['appointments', selectedDate.toISOString().split('T')[0], statusFilter],
    queryFn: () => appointmentsApi.getAppointments({
      date: selectedDate.toISOString().split('T')[0],
      status: statusFilter !== 'all' ? statusFilter : undefined
    }).then(res => res?.appointments || [])
  })

  // Fetch clinics for filter
  const { data: clinics = [] } = useQuery({
    queryKey: ['clinics'],
    queryFn: () => clinicsApi.getClinics().then(res => res?.clinics || [])
  })

  // Update appointment mutation
  const updateAppointmentMutation = useMutationWithRefetch({
    mutationFn: ({ id, data }) => appointmentsApi.updateAppointment(id, data),
    queryKeys: [['appointments'], ['dashboard-stats']],
    onSuccessMessage: 'Appointment updated successfully',
    onErrorMessage: 'Failed to update appointment',
    onSuccessCallback: () => {
      setIsEditModalOpen(false)
      setSelectedAppointment(null)
    }
  })

  // Delete appointment mutation
  const cancelAppointmentMutation = useMutationWithRefetch({
    mutationFn: (id) => appointmentsApi.cancelAppointment(id),
    queryKeys: [['appointments'], ['dashboard-stats']],
    onSuccessMessage: 'Appointment cancelled successfully',
    onErrorMessage: 'Failed to cancel appointment. Only confirmed appointments can be cancelled.'
  })

  const filteredAppointments = appointments.filter(appointment => {
    if (!searchQuery) return true
    const searchLower = searchQuery.toLowerCase()
    return (
      appointment.patient?.name?.toLowerCase().includes(searchLower) ||
      appointment.patient?.phone?.includes(searchQuery) ||
      appointment.doctor?.name?.toLowerCase().includes(searchLower) ||
      appointment.clinic?.name?.toLowerCase().includes(searchLower)
    )
  })

  const handleViewAppointment = (appointment) => {
    setSelectedAppointment(appointment)
    setIsViewModalOpen(true)
  }

  const handleEditAppointment = (appointment) => {
    setSelectedAppointment(appointment)
    setIsEditModalOpen(true)
  }

  const handleDeleteAppointment = (id) => {
    if (window.confirm('Are you sure you want to delete this appointment?')) {
      cancelAppointmentMutation.mutate(id)
    }
  }

  const handleStatusChange = (id, newStatus) => {
    updateAppointmentMutation.mutate({
      id,
      data: { status: newStatus }
    })
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed': return 'bg-blue-100 text-blue-800'
      case 'checked_in': return 'bg-green-100 text-green-800'
      case 'in_progress': return 'bg-yellow-100 text-yellow-800'
      case 'completed': return 'bg-gray-100 text-gray-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      case 'no_show': return 'bg-orange-100 text-orange-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-red-600 mb-2">Error Loading Appointments</h3>
          <p className="text-gray-600 mb-4">{error.message}</p>
          <Button onClick={() => window.location.reload()}>Retry</Button>
        </div>
      </div>
    )
  }

  return (
    <PageContainer className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Appointments</h1>
        <Button
          onClick={() => setIsBookingModalOpen(true)}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          New Appointment
        </Button>
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
              placeholder="Search appointments..."
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
              <option value="confirmed">Confirmed</option>
              <option value="checked_in">Checked In</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
              <option value="no_show">No Show</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Appointments List */}
      <div className="grid gap-4">
        {filteredAppointments.length === 0 ? (
          <Card className="p-8 text-center">
            <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500">No appointments found for the selected date</p>
          </Card>
        ) : (
          filteredAppointments.map((appointment) => (
            <Card key={appointment.id} className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-4 mb-2">
                    <h3 className="font-semibold text-lg">{appointment.patient?.name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(appointment.status)}`}>
                      {appointment.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      <span>{formatTime(appointment.start_time)} - {formatTime(appointment.end_time)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      <span>Dr. {appointment.doctor?.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      <span>{appointment.patient?.phone}</span>
                    </div>
                  </div>
                  
                  <div className="mt-2 text-sm text-gray-500">
                    <span className="font-medium">Service:</span> {appointment.service?.name} • 
                    <span className="font-medium ml-2">Clinic:</span> {appointment.clinic?.name}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewAppointment(appointment)}
                  >
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditAppointment(appointment)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteAppointment(appointment.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* View Appointment Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => setIsViewModalOpen(false)}
        title="Appointment Details"
      >
        {selectedAppointment && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Patient</label>
                <p className="text-lg">{selectedAppointment.patient?.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Phone</label>
                <p>{selectedAppointment.patient?.phone}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Doctor</label>
                <p>Dr. {selectedAppointment.doctor?.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Clinic</label>
                <p>{selectedAppointment.clinic?.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Time</label>
                <p>{formatTime(selectedAppointment.start_time)} - {formatTime(selectedAppointment.end_time)}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Status</label>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedAppointment.status)}`}>
                  {selectedAppointment.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>
            </div>
            
            {/* Payment Information */}
            {selectedAppointment.payment && (
              <div className="border-t pt-4">
                <h4 className="text-lg font-semibold mb-3">Payment Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Payment Status</label>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      selectedAppointment.payment.status === 'paid' ? 'bg-green-100 text-green-800' :
                      selectedAppointment.payment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {selectedAppointment.payment.status.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Total Amount</label>
                    <p className="text-lg font-semibold">${selectedAppointment.payment.total_amount}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Amount Paid</label>
                    <p>${selectedAppointment.payment.amount_paid}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Payment Method</label>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      selectedAppointment.payment.payment_method === 'cash' ? 'bg-blue-100 text-blue-800' :
                      selectedAppointment.payment.payment_method === 'card' ? 'bg-purple-100 text-purple-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {selectedAppointment.payment.payment_method.toUpperCase()}
                    </span>
                  </div>
                </div>
              </div>
            )}
            
            {selectedAppointment.notes && (
              <div>
                <label className="text-sm font-medium text-gray-500">Notes</label>
                <p className="mt-1 p-3 bg-gray-50 rounded">{selectedAppointment.notes}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Edit Appointment Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Appointment"
      >
        {selectedAppointment && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={selectedAppointment.status}
                onChange={(e) => setSelectedAppointment({
                  ...selectedAppointment,
                  status: e.target.value
                })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="confirmed">Confirmed</option>
                <option value="checked_in">Checked In</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
                <option value="no_show">No Show</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
              <textarea
                value={selectedAppointment.notes || ''}
                onChange={(e) => setSelectedAppointment({
                  ...selectedAppointment,
                  notes: e.target.value
                })}
                className="w-full border rounded px-3 py-2"
                rows="3"
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsEditModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleStatusChange(selectedAppointment.id, selectedAppointment.status)}
                disabled={updateAppointmentMutation.isPending}
              >
                {updateAppointmentMutation.isPending ? <Spinner size="sm" /> : 'Save Changes'}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Booking Wizard Modal */}
      <BookingWizard
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        onSuccess={(data) => {
          console.log('Appointment created:', data)
          queryClient.invalidateQueries(['appointments'])
          setIsBookingModalOpen(false)
        }}
      />

      {/* Toast Notification */}
      {(updateAppointmentMutation.toast.show || cancelAppointmentMutation.toast.show) && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-lg flex items-center gap-3 ${
          (updateAppointmentMutation.toast.show ? updateAppointmentMutation.toast.type : cancelAppointmentMutation.toast.type) === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          <div className={`w-5 h-5 flex items-center justify-center rounded-full ${(updateAppointmentMutation.toast.show ? updateAppointmentMutation.toast.type : cancelAppointmentMutation.toast.type) === 'success' ? 'bg-green-600' : 'bg-red-600'}`}>
            {(updateAppointmentMutation.toast.show ? updateAppointmentMutation.toast.type : cancelAppointmentMutation.toast.type) === 'success' ? '✓' : '✕'}
          </div>
          <span className="font-medium">{updateAppointmentMutation.toast.show ? updateAppointmentMutation.toast.message : cancelAppointmentMutation.toast.message}</span>
          <button 
            onClick={() => {
              if (updateAppointmentMutation.toast.show) updateAppointmentMutation.dismissToast()
              if (cancelAppointmentMutation.toast.show) cancelAppointmentMutation.dismissToast()
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

export default AppointmentsPage