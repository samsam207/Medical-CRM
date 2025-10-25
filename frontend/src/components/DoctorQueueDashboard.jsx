import React, { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { queueApi } from '../api/queue'
import { Card, CardHeader, CardTitle, CardContent } from './common/Card'
import { Badge } from './common/Badge'
import { Spinner } from './common/Spinner'
import { 
  Clock, 
  User, 
  Phone, 
  Stethoscope, 
  CheckCircle, 
  AlertCircle, 
  Play, 
  SkipForward,
  Activity,
  Users,
  Timer,
  TrendingUp
} from 'lucide-react'

const DoctorQueueDashboard = ({ clinicId, onQueueUpdate }) => {
  const [lastUpdateTime, setLastUpdateTime] = useState(null)

  // Fetch queue data
  const { data: queueData, isLoading, error, refetch } = useQuery({
    queryKey: ['queue', clinicId],
    queryFn: () => queueApi.getClinicQueue(clinicId),
    enabled: !!clinicId,
    refetchInterval: 5000 // Refresh every 5 seconds
  })

  // Fetch queue statistics
  const { data: statistics } = useQuery({
    queryKey: ['queue-statistics', clinicId],
    queryFn: () => queueApi.getQueueStatistics(clinicId),
    enabled: !!clinicId,
    refetchInterval: 30000 // Refresh every 30 seconds
  })

  // Update last update time when data changes
  useEffect(() => {
    if (queueData) {
      setLastUpdateTime(new Date().toLocaleTimeString())
    }
  }, [queueData])

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

  const getCurrentPatient = () => {
    if (queueData?.in_progress?.length > 0) {
      return queueData.in_progress[0]
    }
    if (queueData?.called?.length > 0) {
      return queueData.called[0]
    }
    return null
  }

  const getNextPatient = () => {
    return queueData?.waiting?.[0] || null
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Spinner size="lg" />
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
          </div>
        </CardContent>
      </Card>
    )
  }

  const currentPatient = getCurrentPatient()
  const nextPatient = getNextPatient()

  return (
    <div className="space-y-6">
      {/* Header with last update time */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Queue Dashboard</h2>
        {lastUpdateTime && (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Activity className="w-4 h-4" />
            Last updated: {lastUpdateTime}
          </div>
        )}
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-blue-500" />
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {statistics.total_appointments}
                  </div>
                  <div className="text-sm text-gray-600">Total Today</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Clock className="w-8 h-8 text-yellow-500" />
                <div>
                  <div className="text-2xl font-bold text-yellow-600">
                    {statistics.waiting_count}
                  </div>
                  <div className="text-sm text-gray-600">Waiting</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Play className="w-8 h-8 text-green-500" />
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {statistics.in_progress_count}
                  </div>
                  <div className="text-sm text-gray-600">In Progress</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-8 h-8 text-gray-500" />
                <div>
                  <div className="text-2xl font-bold text-gray-600">
                    {statistics.completed_count}
                  </div>
                  <div className="text-sm text-gray-600">Completed</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Performance Metrics */}
      {statistics && (statistics.avg_wait_time_minutes > 0 || statistics.avg_consultation_time_minutes > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Performance Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <Timer className="w-6 h-6 text-blue-500" />
                <div>
                  <div className="text-lg font-semibold">
                    {statistics.avg_wait_time_minutes} min
                  </div>
                  <div className="text-sm text-gray-600">Avg Wait Time</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Stethoscope className="w-6 h-6 text-green-500" />
                <div>
                  <div className="text-lg font-semibold">
                    {statistics.avg_consultation_time_minutes} min
                  </div>
                  <div className="text-sm text-gray-600">Avg Consultation Time</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Patient */}
      {currentPatient && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="w-5 h-5 text-green-500" />
              Currently Being Seen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 border-2 border-green-200 rounded-lg bg-green-50">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  {getStatusIcon(currentPatient.status)}
                  <span className="font-bold text-xl">#{currentPatient.queue_number}</span>
                </div>
                <div className="flex-1">
                  <div className="font-medium text-lg">{currentPatient.patient_name}</div>
                  <div className="text-sm text-gray-600">
                    {currentPatient.service_name}
                  </div>
                  <div className="text-sm text-gray-500">
                    {currentPatient.status === 'IN_PROGRESS' 
                      ? `Started: ${formatTime(currentPatient.consultation_start_time)}`
                      : `Called: ${formatTime(currentPatient.called_time)}`
                    }
                  </div>
                </div>
                <Badge className={`${getStatusColor(currentPatient.status)} text-sm px-3 py-1`}>
                  {currentPatient.status.replace('_', ' ')}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Next Patient */}
      {nextPatient && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-blue-500" />
              Next in Queue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="p-4 border-2 border-blue-200 rounded-lg bg-blue-50">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  {getStatusIcon(nextPatient.status)}
                  <span className="font-bold text-xl">#{nextPatient.queue_number}</span>
                </div>
                <div className="flex-1">
                  <div className="font-medium text-lg">{nextPatient.patient_name}</div>
                  <div className="text-sm text-gray-600">
                    {nextPatient.service_name}
                  </div>
                  <div className="text-sm text-gray-500">
                    Checked in: {formatTime(nextPatient.check_in_time)}
                  </div>
                </div>
                <Badge className={`${getStatusColor(nextPatient.status)} text-sm px-3 py-1`}>
                  {nextPatient.status.replace('_', ' ')}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Queue Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Queue Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Waiting Patients */}
            {queueData?.waiting?.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-yellow-500" />
                  Waiting ({queueData.waiting.length})
                </h4>
                <div className="space-y-2">
                  {queueData.waiting.slice(0, 5).map((visit) => (
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
                      <Badge className={getStatusColor(visit.status)}>
                        {visit.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  ))}
                  {queueData.waiting.length > 5 && (
                    <div className="text-center text-gray-500 text-sm py-2">
                      +{queueData.waiting.length - 5} more waiting
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Called Patients */}
            {queueData?.called?.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-blue-500" />
                  Called ({queueData.called.length})
                </h4>
                <div className="space-y-2">
                  {queueData.called.map((visit) => (
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
                            Called: {formatTime(visit.called_time)}
                          </div>
                        </div>
                      </div>
                      <Badge className={getStatusColor(visit.status)}>
                        {visit.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recently Completed */}
            {queueData?.completed?.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Recently Completed ({queueData.completed.length})
                </h4>
                <div className="space-y-2">
                  {queueData.completed.slice(0, 3).map((visit) => (
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
                </div>
              </div>
            )}

            {/* Empty State */}
            {(!queueData?.waiting?.length && 
              !queueData?.called?.length && 
              !queueData?.in_progress?.length && 
              !queueData?.completed?.length) && (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No patients in queue</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default DoctorQueueDashboard
