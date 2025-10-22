import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queueApi } from '../api/queue'
import { Card, CardHeader, CardTitle, CardContent } from './common/Card'
import Button from './common/Button'
import Badge from './common/Badge'
import { Clock, User, Phone, Stethoscope, CheckCircle, AlertCircle, Play, Pause, SkipForward, Bell } from 'lucide-react'

const DoctorQueue = ({ doctorId, onQueueUpdate }) => {
  const [currentPatient, setCurrentPatient] = useState(null)
  const [notes, setNotes] = useState('')
  const queryClient = useQueryClient()

  // Fetch doctor queue data
  const { data: queueData, isLoading, error, refetch } = useQuery({
    queryKey: ['doctor-queue', doctorId],
    queryFn: () => queueApi.getDoctorQueue(doctorId),
    enabled: !!doctorId,
    refetchInterval: 3000 // Refresh every 3 seconds
  })

  // Call patient mutation
  const callMutation = useMutation({
    mutationFn: queueApi.callPatient,
    onSuccess: (data) => {
      queryClient.invalidateQueries(['doctor-queue', doctorId])
      queryClient.invalidateQueries(['dashboard-stats'])
      onQueueUpdate?.(data)
    }
  })

  // Start consultation mutation
  const startMutation = useMutation({
    mutationFn: queueApi.startConsultation,
    onSuccess: (data) => {
      queryClient.invalidateQueries(['doctor-queue', doctorId])
      queryClient.invalidateQueries(['dashboard-stats'])
      setCurrentPatient(data.visit)
      onQueueUpdate?.(data)
    }
  })

  // Complete consultation mutation
  const completeMutation = useMutation({
    mutationFn: ({ visitId, notes }) => queueApi.completeConsultation(visitId, notes),
    onSuccess: (data) => {
      queryClient.invalidateQueries(['doctor-queue', doctorId])
      queryClient.invalidateQueries(['dashboard-stats'])
      setCurrentPatient(null)
      setNotes('')
      onQueueUpdate?.(data)
    }
  })

  // Skip patient mutation
  const skipMutation = useMutation({
    mutationFn: ({ visitId, reason }) => queueApi.skipPatient(visitId, reason),
    onSuccess: (data) => {
      queryClient.invalidateQueries(['doctor-queue', doctorId])
      queryClient.invalidateQueries(['dashboard-stats'])
      setCurrentPatient(null)
      onQueueUpdate?.(data)
    }
  })

  const handleCallPatient = (visitId) => {
    callMutation.mutate(visitId)
  }

  const handleStartConsultation = (visitId) => {
    startMutation.mutate(visitId)
  }

  const handleCompleteConsultation = () => {
    if (currentPatient) {
      completeMutation.mutate({ 
        visitId: currentPatient.id, 
        notes: notes 
      })
    }
  }

  const handleSkipPatient = (visitId) => {
    const reason = prompt('Reason for skipping (optional):') || 'No show'
    skipMutation.mutate({ visitId, reason })
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'WAITING':
        return <Clock className="w-4 h-4 text-yellow-500" />
      case 'CALLED':
        return <AlertCircle className="w-4 h-4 text-blue-500" />
      case 'IN_PROGRESS':
        return <Play className="w-4 h-4 text-green-500" />
      case 'COMPLETED':
        return <CheckCircle className="w-4 h-4 text-green-600" />
      case 'NO_SHOW':
        return <SkipForward className="w-4 h-4 text-red-500" />
      default:
        return <Clock className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'WAITING':
        return 'bg-yellow-100 text-yellow-800'
      case 'CALLED':
        return 'bg-blue-100 text-blue-800'
      case 'IN_PROGRESS':
        return 'bg-green-100 text-green-800'
      case 'COMPLETED':
        return 'bg-green-100 text-green-800'
      case 'NO_SHOW':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const formatTime = (timeString) => {
    if (!timeString) return 'N/A'
    return new Date(timeString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getNextWaitingPatient = () => {
    return queueData?.waiting?.[0] || null
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
            <p>Failed to load queue data</p>
            <Button onClick={() => refetch()} className="mt-2">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const nextPatient = getNextWaitingPatient()

  return (
    <div className="space-y-6">
      {/* Queue Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5" />
            Doctor Queue
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {queueData?.waiting?.length || 0}
              </div>
              <div className="text-sm text-gray-600">Waiting</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {queueData?.called?.length || 0}
              </div>
              <div className="text-sm text-gray-600">Called</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {queueData?.in_progress?.length || 0}
              </div>
              <div className="text-sm text-gray-600">In Progress</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">
                {queueData?.completed?.length || 0}
              </div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Next Patient Actions */}
      {nextPatient && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-blue-500" />
              Next Patient
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-4 border rounded-lg bg-blue-50">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  {getStatusIcon(nextPatient.status)}
                  <span className="font-bold text-lg">#{nextPatient.queue_number}</span>
                </div>
                <div>
                  <div className="font-medium text-lg">{nextPatient.patient_name}</div>
                  <div className="text-sm text-gray-600">
                    {nextPatient.service_name}
                  </div>
                  <div className="text-sm text-gray-500">
                    Checked in: {formatTime(nextPatient.check_in_time)}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => handleCallPatient(nextPatient.id)}
                  disabled={callMutation.isPending}
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {callMutation.isPending ? 'Calling...' : 'Call Patient'}
                </Button>
                <Button
                  onClick={() => handleStartConsultation(nextPatient.id)}
                  disabled={startMutation.isPending}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                >
                  {startMutation.isPending ? 'Starting...' : 'Start Consultation'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Consultation */}
      {currentPatient && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="w-5 h-5 text-green-500" />
              Current Consultation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg bg-green-50">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(currentPatient.status)}
                    <span className="font-bold text-lg">#{currentPatient.queue_number}</span>
                  </div>
                  <div>
                    <div className="font-medium text-lg">{currentPatient.patient_name}</div>
                    <div className="text-sm text-gray-600">
                      {currentPatient.service_name}
                    </div>
                    <div className="text-sm text-gray-500">
                      Started: {formatTime(currentPatient.consultation_start_time)}
                    </div>
                  </div>
                </div>
                <Badge className={getStatusColor(currentPatient.status)}>
                  {currentPatient.status.replace('_', ' ')}
                </Badge>
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Consultation Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={4}
                  placeholder="Enter consultation notes..."
                />
              </div>
              
              <div className="flex gap-2">
                <Button
                  onClick={handleCompleteConsultation}
                  disabled={completeMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {completeMutation.isPending ? 'Completing...' : 'Complete Consultation'}
                </Button>
                <Button
                  onClick={() => handleSkipPatient(currentPatient.id)}
                  disabled={skipMutation.isPending}
                  variant="outline"
                  className="border-red-300 text-red-600 hover:bg-red-50"
                >
                  {skipMutation.isPending ? 'Skipping...' : 'Skip Patient'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Queue List */}
      <Card>
        <CardHeader>
          <CardTitle>Queue Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {queueData?.waiting?.map((visit) => (
              <div
                key={visit.id}
                className="flex items-center justify-between p-3 border rounded-lg bg-yellow-50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(visit.status)}
                    <span className="font-bold text-lg">#{visit.queue_number}</span>
                  </div>
                  <div>
                    <div className="font-medium">{visit.patient_name}</div>
                    <div className="text-sm text-gray-600">
                      {visit.service_name}
                    </div>
                    <div className="text-sm text-gray-500">
                      Checked in: {formatTime(visit.check_in_time)}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Badge className={getStatusColor(visit.status)}>
                    {visit.status.replace('_', ' ')}
                  </Badge>
                  <Button
                    onClick={() => handleCallPatient(visit.id)}
                    disabled={callMutation.isPending}
                    size="sm"
                    variant="outline"
                  >
                    Call
                  </Button>
                </div>
              </div>
            ))}

            {queueData?.called?.map((visit) => (
              <div
                key={visit.id}
                className="flex items-center justify-between p-3 border rounded-lg bg-blue-50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(visit.status)}
                    <span className="font-bold text-lg">#{visit.queue_number}</span>
                  </div>
                  <div>
                    <div className="font-medium">{visit.patient_name}</div>
                    <div className="text-sm text-gray-600">
                      {visit.service_name}
                    </div>
                    <div className="text-sm text-gray-500">
                      Called at: {formatTime(visit.called_time)}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Badge className={getStatusColor(visit.status)}>
                    {visit.status.replace('_', ' ')}
                  </Badge>
                  <Button
                    onClick={() => handleStartConsultation(visit.id)}
                    disabled={startMutation.isPending}
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Start
                  </Button>
                </div>
              </div>
            ))}

            {queueData?.in_progress?.map((visit) => (
              <div
                key={visit.id}
                className="flex items-center justify-between p-3 border rounded-lg bg-green-50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(visit.status)}
                    <span className="font-bold text-lg">#{visit.queue_number}</span>
                  </div>
                  <div>
                    <div className="font-medium">{visit.patient_name}</div>
                    <div className="text-sm text-gray-600">
                      {visit.service_name}
                    </div>
                    <div className="text-sm text-gray-500">
                      Started: {formatTime(visit.consultation_start_time)}
                    </div>
                  </div>
                </div>
                <Badge className={getStatusColor(visit.status)}>
                  {visit.status.replace('_', ' ')}
                </Badge>
              </div>
            ))}

            {queueData?.completed?.map((visit) => (
              <div
                key={visit.id}
                className="flex items-center justify-between p-3 border rounded-lg bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(visit.status)}
                    <span className="font-bold text-lg">#{visit.queue_number}</span>
                  </div>
                  <div>
                    <div className="font-medium">{visit.patient_name}</div>
                    <div className="text-sm text-gray-600">
                      {visit.service_name}
                    </div>
                    <div className="text-sm text-gray-500">
                      Completed: {formatTime(visit.consultation_end_time)}
                    </div>
                  </div>
                </div>
                <Badge className={getStatusColor(visit.status)}>
                  {visit.status.replace('_', ' ')}
                </Badge>
              </div>
            ))}

            {(!queueData?.waiting?.length && 
              !queueData?.called?.length && 
              !queueData?.in_progress?.length && 
              !queueData?.completed?.length) && (
              <p className="text-gray-500 text-center py-8">No patients in queue</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default DoctorQueue
