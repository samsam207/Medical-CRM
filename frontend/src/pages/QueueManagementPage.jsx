import { useState, useEffect } from 'react'
import QueueManagement from '../components/QueueManagement'
import { useQuery } from '@tanstack/react-query'
import { clinicsApi } from '../api/clinics'
import PageContainer from '../components/layout/PageContainer'

const QueueManagementPage = () => {
  const [selectedClinic, setSelectedClinic] = useState(null)

  // Fetch clinics
  const { data: clinics = [] } = useQuery({
    queryKey: ['clinics'],
    queryFn: async () => {
      const result = await clinicsApi.getClinics()
      return result?.clinics || []
    }
  })

  // Auto-select first clinic
  useEffect(() => {
    if (clinics.length > 0 && !selectedClinic) {
      setSelectedClinic(clinics[0].id)
    }
  }, [clinics, selectedClinic])

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

