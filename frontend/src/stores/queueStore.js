import { create } from 'zustand'

const useQueueStore = create((set, get) => ({
  // Queue data
  clinicQueues: {}, // { clinicId: queueData }
  doctorQueues: {}, // { doctorId: queueData }
  
  // UI state
  selectedClinic: null,
  selectedDoctor: null,
  isConnected: false,
  
  // Actions
  setSelectedClinic: (clinicId) => set({ selectedClinic: clinicId }),
  setSelectedDoctor: (doctorId) => set({ selectedDoctor: doctorId }),
  setConnected: (connected) => set({ isConnected: connected }),
  
  updateClinicQueue: (clinicId, queueData) => {
    set((state) => ({
      clinicQueues: {
        ...state.clinicQueues,
        [clinicId]: queueData
      }
    }))
  },
  
  updateDoctorQueue: (doctorId, queueData) => {
    set((state) => ({
      doctorQueues: {
        ...state.doctorQueues,
        [doctorId]: queueData
      }
    }))
  },
  
  getCurrentQueue: () => {
    const { selectedClinic, selectedDoctor, clinicQueues, doctorQueues } = get()
    
    if (selectedClinic && clinicQueues[selectedClinic]) {
      return clinicQueues[selectedClinic]
    }
    
    if (selectedDoctor && doctorQueues[selectedDoctor]) {
      return doctorQueues[selectedDoctor]
    }
    
    return null
  },
  
  clearQueues: () => set({
    clinicQueues: {},
    doctorQueues: {},
    selectedClinic: null,
    selectedDoctor: null
  })
}))

export { useQueueStore }
