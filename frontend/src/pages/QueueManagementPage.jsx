import { useState, useEffect } from 'react'
import QueueManagement from '../components/QueueManagement'
import { useQuery } from '@tanstack/react-query'
import { clinicsApi } from '../api/clinics'
import { useDoctorFilters } from '../hooks/useDoctorFilters'
import PageContainer from '../components/layout/PageContainer'

const QueueManagementPage = () => {
  const { clinicId, isDoctor } = useDoctorFilters()
  const [selectedClinic, setSelectedClinic] = useState(null)

  // Fetch clinics
  const { data: clinics = [] } = useQuery({
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

  return (
    <PageContainer>
      {selectedClinic ? (
        <QueueManagement 
          clinicId={selectedClinic} 
          onQueueUpdate={() => {}} 
        />
      ) : (
        <div className="text-center py-12">
          <p className="text-gray-500">جاري تحميل العيادات...</p>
        </div>
      )}
    </PageContainer>
  )
}

export default QueueManagementPage

