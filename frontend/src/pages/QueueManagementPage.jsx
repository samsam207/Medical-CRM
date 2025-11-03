/**
 * Queue Management Page - Redesigned with UI Kit
 * 
 * Modern queue management page wrapper.
 * Preserves all API calls and functionality.
 */

import { useState, useEffect } from 'react'
import QueueManagement from '../components/QueueManagement'
import { useQuery } from '@tanstack/react-query'
import { clinicsApi } from '../api/clinics'
import { useDoctorFilters } from '../hooks/useDoctorFilters'
import PageContainer from '../components/layout/PageContainer'
import { Card, CardContent } from '../ui-kit'
import { Skeleton } from '../ui-kit'

const QueueManagementPage = () => {
  const { clinicId, isDoctor } = useDoctorFilters()
  const [selectedClinic, setSelectedClinic] = useState(null)

  // Fetch clinics
  const { data: clinics = [], isLoading: loadingClinics } = useQuery({
    queryKey: ['clinics'],
    queryFn: async () => {
      const result = await clinicsApi.getClinics()
      return result?.clinics || []
    }
  })

  // Auto-select doctor's clinic if doctor, otherwise first clinic
  useEffect(() => {
    if (isDoctor && clinicId) {
      setSelectedClinic(clinicId)
    } else if (!isDoctor && clinics.length > 0 && !selectedClinic) {
      setSelectedClinic(clinics[0].id)
    }
  }, [clinics, selectedClinic, isDoctor, clinicId])

  if (loadingClinics) {
    return (
      <PageContainer>
        <div className="flex items-center justify-center h-64">
          <div className="space-y-4 w-full max-w-md">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      {selectedClinic ? (
        <QueueManagement 
          clinicId={selectedClinic} 
          onQueueUpdate={() => {}} 
        />
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-gray-600 font-medium font-arabic">جاري تحميل العيادات...</p>
          </CardContent>
        </Card>
      )}
    </PageContainer>
  )
}

export default QueueManagementPage
