/**
 * Users Management Page - Admin Only
 * 
 * Modern users management page using the unified design system.
 * Allows admins to manage doctor and receptionist user accounts.
 */

import React, { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { 
  Users, UserCog, Search, Plus, Edit, Trash2, Link2, Unlink2,
  Stethoscope, UserCheck, Calendar, Building2, AlertTriangle
} from 'lucide-react'
import { Button, Badge } from '../ui-kit'
import { Card, CardContent, CardHeader, CardTitle } from '../ui-kit'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui-kit'
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui-kit'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '../ui-kit'
import { Input, Label } from '../ui-kit'
import { Skeleton } from '../ui-kit'
import { usersApi, doctorsApi, clinicsApi } from '../api'
import { formatDate } from '../utils/formatters'
import { useMutationWithRefetch } from '../hooks/useMutationWithRefetch'
import { useDebounce } from '../hooks/useDebounce'
import PageContainer from '../components/layout/PageContainer'

const UsersManagementPage = () => {
  const [activeTab, setActiveTab] = useState('doctors')
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearchQuery = useDebounce(searchQuery, 400)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [userToDelete, setUserToDelete] = useState(null)
  const [userToLink, setUserToLink] = useState(null)
  const [newUserData, setNewUserData] = useState({
    username: '',
    password: '',
    role: 'DOCTOR'
  })

  // Update role default when tab changes
  useEffect(() => {
    const defaultRole = activeTab === 'doctors' ? 'DOCTOR' : 'RECEPTIONIST'
    setNewUserData(prev => ({ ...prev, role: defaultRole }))
  }, [activeTab])

  const [editUserData, setEditUserData] = useState({
    username: '',
    password: '',
    role: ''
  })
  const [linkDoctorId, setLinkDoctorId] = useState('')
  const [errors, setErrors] = useState({})

  const queryClient = useQueryClient()

  // Fetch users based on active tab
  const roleFilter = activeTab === 'doctors' ? 'DOCTOR' : 'RECEPTIONIST'
  const { data: usersData, isLoading, error } = useQuery({
    queryKey: ['users', roleFilter],
    queryFn: () => usersApi.getUsers(roleFilter),
    refetchOnWindowFocus: false,
    staleTime: 2 * 60 * 1000
  })

  const users = usersData?.users || []
  const filteredUsers = users.filter(user => {
    if (!debouncedSearchQuery) return true
    const query = debouncedSearchQuery.toLowerCase()
    return user.username.toLowerCase().includes(query) ||
           (user.doctor && user.doctor.name.toLowerCase().includes(query))
  })

  // Fetch doctors for linking
  const { data: doctorsData } = useQuery({
    queryKey: ['doctors-all'],
    queryFn: () => doctorsApi.getDoctors(),
    enabled: isLinkModalOpen,
    staleTime: 5 * 60 * 1000
  })

  const doctors = doctorsData?.doctors || []

  // Fetch clinics for displaying doctor clinic info
  const { data: clinicsData } = useQuery({
    queryKey: ['clinics-all'],
    queryFn: () => clinicsApi.getClinics(),
    staleTime: 5 * 60 * 1000
  })

  const clinics = clinicsData?.clinics || []

  // Mutations
  const createUserMutation = useMutationWithRefetch({
    mutationFn: (data) => usersApi.createUser(data),
    queryKeys: [['users']],
    onSuccessMessage: 'تم إنشاء المستخدم بنجاح',
    onErrorMessage: 'فشل إنشاء المستخدم',
    onSuccessCallback: () => {
      setIsCreateModalOpen(false)
      const defaultRole = activeTab === 'doctors' ? 'DOCTOR' : 'RECEPTIONIST'
      setNewUserData({ username: '', password: '', role: defaultRole })
      setErrors({})
    }
  })

  const updateUserMutation = useMutationWithRefetch({
    mutationFn: ({ id, data }) => usersApi.updateUser(id, data),
    queryKeys: [['users']],
    onSuccessMessage: 'تم تحديث المستخدم بنجاح',
    onErrorMessage: 'فشل تحديث المستخدم',
    onSuccessCallback: () => {
      setIsEditModalOpen(false)
      setSelectedUser(null)
      setEditUserData({ username: '', password: '', role: '' })
      setErrors({})
    }
  })

  const deleteUserMutation = useMutationWithRefetch({
    mutationFn: (id) => usersApi.deleteUser(id),
    queryKeys: [['users']],
    onSuccessMessage: 'تم حذف المستخدم بنجاح',
    onErrorMessage: 'فشل حذف المستخدم',
    onSuccessCallback: () => {
      setIsDeleteModalOpen(false)
      setUserToDelete(null)
    }
  })

  const linkUserMutation = useMutationWithRefetch({
    mutationFn: ({ userId, doctorId }) => usersApi.linkUserToDoctor(userId, doctorId),
    queryKeys: [['users'], ['doctors-all']],
    onSuccessMessage: 'تم ربط المستخدم بالطبيب بنجاح',
    onErrorMessage: 'فشل ربط المستخدم بالطبيب',
    onSuccessCallback: () => {
      setIsLinkModalOpen(false)
      setUserToLink(null)
      setLinkDoctorId('')
      setErrors({})
    }
  })

  const unlinkUserMutation = useMutationWithRefetch({
    mutationFn: (userId) => usersApi.unlinkUserFromDoctor(userId),
    queryKeys: [['users'], ['doctors-all']],
    onSuccessMessage: 'تم إلغاء ربط المستخدم بالطبيب بنجاح',
    onErrorMessage: 'فشل إلغاء ربط المستخدم بالطبيب'
  })

  const handleCreateUser = () => {
    setErrors({})
    if (!newUserData.username.trim()) {
      setErrors({ username: 'اسم المستخدم مطلوب' })
      return
    }
    if (!newUserData.password || newUserData.password.length < 6) {
      setErrors({ password: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' })
      return
    }
    createUserMutation.mutate(newUserData)
  }

  const handleEditUser = (user) => {
    setSelectedUser(user)
    setEditUserData({
      username: user.username,
      password: '',
      role: user.role
    })
    setErrors({})
    setIsEditModalOpen(true)
  }

  const handleUpdateUser = () => {
    setErrors({})
    const updateData = {}
    
    if (editUserData.username !== selectedUser.username) {
      if (!editUserData.username.trim()) {
        setErrors({ username: 'اسم المستخدم مطلوب' })
        return
      }
      updateData.username = editUserData.username
    }
    
    if (editUserData.password && editUserData.password.length > 0) {
      if (editUserData.password.length < 6) {
        setErrors({ password: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' })
        return
      }
      updateData.password = editUserData.password
    }
    
    if (editUserData.role !== selectedUser.role) {
      updateData.role = editUserData.role
    }
    
    if (Object.keys(updateData).length === 0) {
      setErrors({ general: 'لا توجد تغييرات لحفظها' })
      return
    }
    
    updateUserMutation.mutate({ id: selectedUser.id, data: updateData })
  }

  const handleDeleteUser = (user) => {
    setUserToDelete(user)
    setIsDeleteModalOpen(true)
  }

  const confirmDelete = () => {
    if (userToDelete) {
      deleteUserMutation.mutate(userToDelete.id)
    }
  }

  const handleLinkDoctor = (user) => {
    setUserToLink(user)
    setLinkDoctorId('')
    setErrors({})
    setIsLinkModalOpen(true)
  }

  const handleLinkUserToDoctor = () => {
    setErrors({})
    if (!linkDoctorId) {
      setErrors({ doctor_id: 'يرجى اختيار طبيب' })
      return
    }
    linkUserMutation.mutate({ userId: userToLink.id, doctorId: parseInt(linkDoctorId) })
  }

  const handleUnlinkDoctor = (user) => {
    if (window.confirm(`هل أنت متأكد من إلغاء ربط ${user.username} بالطبيب؟`)) {
      unlinkUserMutation.mutate(user.id)
    }
  }

  const getClinicName = (clinicId) => {
    const clinic = clinics.find(c => c.id === clinicId)
    return clinic ? `${clinic.name} - الغرفة ${clinic.room_number}` : 'غير محدد'
  }

  // Filter doctors available for linking (not already linked to another user)
  const availableDoctors = doctors.filter(doctor => 
    !doctor.user_id || doctor.user_id === userToLink?.id
  ).map(doctor => {
    // Ensure clinic info is available
    if (doctor.clinic_id && !doctor.clinic) {
      const clinic = clinics.find(c => c.id === doctor.clinic_id)
      if (clinic) {
        return { ...doctor, clinic: { id: clinic.id, name: clinic.name, room_number: clinic.room_number } }
      }
    }
    return doctor
  })

  if (isLoading) {
    return (
      <PageContainer>
        <div className="flex justify-center items-center h-64">
          <div className="space-y-4 w-full max-w-md">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </PageContainer>
    )
  }

  if (error) {
    return (
      <PageContainer>
        <div className="flex justify-center items-center h-64">
          <Card>
            <CardContent className="p-8 text-center">
              <h3 className="text-lg font-semibold text-red-600 mb-2 font-arabic">خطأ في تحميل المستخدمين</h3>
              <p className="text-gray-600 mb-4 font-arabic">{error.message}</p>
              <Button onClick={() => window.location.reload()}>إعادة المحاولة</Button>
            </CardContent>
          </Card>
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer className="space-y-6" aria-label="صفحة إدارة المستخدمين">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-gray-200">
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 font-arabic">
            إدارة المستخدمين
          </h1>
          <p className="text-sm text-gray-600 font-arabic">إدارة حسابات الأطباء والاستقبال</p>
        </div>
        <Button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2"
          aria-label="إضافة مستخدم جديد"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          <span>مستخدم جديد</span>
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="doctors" className="font-arabic flex items-center gap-2">
            <Stethoscope className="w-4 h-4" aria-hidden="true" />
            الأطباء
          </TabsTrigger>
          <TabsTrigger value="receptionists" className="font-arabic flex items-center gap-2">
            <UserCheck className="w-4 h-4" aria-hidden="true" />
            الاستقبال
          </TabsTrigger>
        </TabsList>

        {/* Search Bar */}
        <div className="mt-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" aria-hidden="true" />
                  <Input
                    type="text"
                    placeholder="البحث بالاسم أو اسم المستخدم..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pr-10 pl-4"
                    aria-label="بحث المستخدمين"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Doctors Tab */}
        <TabsContent value="doctors" className="space-y-4">
          {filteredUsers.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Stethoscope className="w-12 h-12 mx-auto text-gray-400 mb-4" aria-hidden="true" />
                <p className="text-gray-600 font-medium font-arabic">لم يتم العثور على مستخدمي أطباء</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-arabic">اسم المستخدم</TableHead>
                        <TableHead className="font-arabic">الدور</TableHead>
                        <TableHead className="font-arabic">الطبيب المرتبط</TableHead>
                        <TableHead className="font-arabic">العيادة</TableHead>
                        <TableHead className="font-arabic">تاريخ الإنشاء</TableHead>
                        <TableHead className="font-arabic text-center">الإجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow key={user.id} className="hover:bg-gray-50">
                          <TableCell className="font-medium font-arabic">{user.username}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-arabic">
                              {user.role === 'DOCTOR' ? 'طبيب' : user.role}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-arabic">
                            {user.doctor ? (
                              <div className="flex items-center gap-2">
                                <Stethoscope className="w-4 h-4 text-medical-blue-600" />
                                <span>{user.doctor.name}</span>
                              </div>
                            ) : (
                              <span className="text-gray-400">غير مرتبط</span>
                            )}
                          </TableCell>
                          <TableCell className="font-arabic">
                            {user.doctor?.clinic_name ? (
                              <div className="flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-medical-green-600" />
                                <span>{user.doctor.clinic_name}</span>
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </TableCell>
                          <TableCell className="font-arabic text-sm text-gray-600">
                            {user.created_at ? formatDate(user.created_at) : '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditUser(user)}
                                className="h-8 w-8 p-0"
                                aria-label="تعديل المستخدم"
                              >
                                <Edit className="w-4 h-4" aria-hidden="true" />
                              </Button>
                              {!user.doctor ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleLinkDoctor(user)}
                                  className="h-8 w-8 p-0 text-medical-blue-600 hover:text-medical-blue-700"
                                  aria-label="ربط بالطبيب"
                                >
                                  <Link2 className="w-4 h-4" aria-hidden="true" />
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleUnlinkDoctor(user)}
                                  className="h-8 w-8 p-0 text-orange-600 hover:text-orange-700"
                                  aria-label="إلغاء الربط"
                                >
                                  <Unlink2 className="w-4 h-4" aria-hidden="true" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteUser(user)}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                aria-label="حذف المستخدم"
                              >
                                <Trash2 className="w-4 h-4" aria-hidden="true" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Receptionists Tab */}
        <TabsContent value="receptionists" className="space-y-4">
          {filteredUsers.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <UserCheck className="w-12 h-12 mx-auto text-gray-400 mb-4" aria-hidden="true" />
                <p className="text-gray-600 font-medium font-arabic">لم يتم العثور على مستخدمي استقبال</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="font-arabic">اسم المستخدم</TableHead>
                        <TableHead className="font-arabic">الدور</TableHead>
                        <TableHead className="font-arabic">تاريخ الإنشاء</TableHead>
                        <TableHead className="font-arabic text-center">الإجراءات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow key={user.id} className="hover:bg-gray-50">
                          <TableCell className="font-medium font-arabic">{user.username}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-arabic">
                              {user.role === 'RECEPTIONIST' ? 'استقبال' : user.role}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-arabic text-sm text-gray-600">
                            {user.created_at ? formatDate(user.created_at) : '-'}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditUser(user)}
                                className="h-8 w-8 p-0"
                                aria-label="تعديل المستخدم"
                              >
                                <Edit className="w-4 h-4" aria-hidden="true" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteUser(user)}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                aria-label="حذف المستخدم"
                              >
                                <Trash2 className="w-4 h-4" aria-hidden="true" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Create User Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-arabic flex items-center gap-2">
              <Plus className="w-5 h-5" aria-hidden="true" />
              إضافة مستخدم جديد
            </DialogTitle>
            <DialogDescription className="font-arabic">
              قم بإدخال بيانات المستخدم الجديد
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-username" className="font-arabic">اسم المستخدم *</Label>
              <Input
                id="new-username"
                type="text"
                value={newUserData.username}
                onChange={(e) => setNewUserData({ ...newUserData, username: e.target.value })}
                placeholder="مثال: dr_ahmed"
                className={`font-arabic ${errors.username ? 'border-red-500' : ''}`}
              />
              {errors.username && (
                <p className="text-sm text-red-600 font-arabic">{errors.username}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password" className="font-arabic">كلمة المرور *</Label>
              <Input
                id="new-password"
                type="password"
                value={newUserData.password}
                onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                placeholder="6 أحرف على الأقل"
                className={`font-arabic ${errors.password ? 'border-red-500' : ''}`}
              />
              {errors.password && (
                <p className="text-sm text-red-600 font-arabic">{errors.password}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-role" className="font-arabic">الدور *</Label>
              <select
                id="new-role"
                value={newUserData.role}
                onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium focus:border-medical-blue-500 focus:ring-2 focus:ring-medical-blue-100 bg-white text-gray-900 font-arabic"
              >
                <option value="DOCTOR">طبيب</option>
                <option value="RECEPTIONIST">استقبال</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateModalOpen(false)
                setErrors({})
              }}
              className="font-arabic"
            >
              إلغاء
            </Button>
            <Button
              onClick={handleCreateUser}
              disabled={createUserMutation.isPending}
              className="font-arabic"
            >
              {createUserMutation.isPending ? 'جاري الإنشاء...' : 'إنشاء'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-arabic flex items-center gap-2">
              <Edit className="w-5 h-5" aria-hidden="true" />
              تعديل المستخدم
            </DialogTitle>
            <DialogDescription className="font-arabic">
              قم بتعديل بيانات المستخدم
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-username" className="font-arabic">اسم المستخدم *</Label>
              <Input
                id="edit-username"
                type="text"
                value={editUserData.username}
                onChange={(e) => setEditUserData({ ...editUserData, username: e.target.value })}
                className={`font-arabic ${errors.username ? 'border-red-500' : ''}`}
              />
              {errors.username && (
                <p className="text-sm text-red-600 font-arabic">{errors.username}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-password" className="font-arabic">كلمة المرور (اتركه فارغاً للحفاظ على الكلمة الحالية)</Label>
              <Input
                id="edit-password"
                type="password"
                value={editUserData.password}
                onChange={(e) => setEditUserData({ ...editUserData, password: e.target.value })}
                placeholder="اتركه فارغاً للحفاظ على الكلمة الحالية"
                className={`font-arabic ${errors.password ? 'border-red-500' : ''}`}
              />
              {errors.password && (
                <p className="text-sm text-red-600 font-arabic">{errors.password}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-role" className="font-arabic">الدور *</Label>
              <select
                id="edit-role"
                value={editUserData.role}
                onChange={(e) => setEditUserData({ ...editUserData, role: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium focus:border-medical-blue-500 focus:ring-2 focus:ring-medical-blue-100 bg-white text-gray-900 font-arabic"
              >
                <option value="DOCTOR">طبيب</option>
                <option value="RECEPTIONIST">استقبال</option>
              </select>
            </div>
            {errors.general && (
              <p className="text-sm text-red-600 font-arabic">{errors.general}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditModalOpen(false)
                setSelectedUser(null)
                setErrors({})
              }}
              className="font-arabic"
            >
              إلغاء
            </Button>
            <Button
              onClick={handleUpdateUser}
              disabled={updateUserMutation.isPending}
              className="font-arabic"
            >
              {updateUserMutation.isPending ? 'جاري التحديث...' : 'حفظ التغييرات'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Modal */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-arabic flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" aria-hidden="true" />
              حذف المستخدم
            </DialogTitle>
            <DialogDescription className="font-arabic">
              هل أنت متأكد من حذف المستخدم <strong>{userToDelete?.username}</strong>؟
              {userToDelete?.doctor && (
                <p className="mt-2 text-orange-600">
                  سيتم إلغاء ربط المستخدم بالطبيب: {userToDelete.doctor.name}
                </p>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteModalOpen(false)
                setUserToDelete(null)
              }}
              className="font-arabic"
            >
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleteUserMutation.isPending}
              className="font-arabic"
            >
              {deleteUserMutation.isPending ? 'جاري الحذف...' : 'حذف'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link Doctor Modal */}
      <Dialog open={isLinkModalOpen} onOpenChange={setIsLinkModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-arabic flex items-center gap-2">
              <Link2 className="w-5 h-5" aria-hidden="true" />
              ربط المستخدم بالطبيب
            </DialogTitle>
            <DialogDescription className="font-arabic">
              اختر الطبيب لربطه بالمستخدم <strong>{userToLink?.username}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="link-doctor" className="font-arabic">الطبيب *</Label>
              <select
                id="link-doctor"
                value={linkDoctorId}
                onChange={(e) => setLinkDoctorId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium focus:border-medical-blue-500 focus:ring-2 focus:ring-medical-blue-100 bg-white text-gray-900 font-arabic"
              >
                <option value="">اختر طبيب...</option>
                {availableDoctors.map((doctor) => (
                  <option key={doctor.id} value={doctor.id}>
                    {doctor.name} - {doctor.specialty}
                    {doctor.clinic && ` (${doctor.clinic.name})`}
                  </option>
                ))}
              </select>
              {errors.doctor_id && (
                <p className="text-sm text-red-600 font-arabic">{errors.doctor_id}</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsLinkModalOpen(false)
                setUserToLink(null)
                setLinkDoctorId('')
                setErrors({})
              }}
              className="font-arabic"
            >
              إلغاء
            </Button>
            <Button
              onClick={handleLinkUserToDoctor}
              disabled={linkUserMutation.isPending}
              className="font-arabic"
            >
              {linkUserMutation.isPending ? 'جاري الربط...' : 'ربط'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toast Messages */}
      {createUserMutation.toast.show && (
        <div className={`fixed bottom-4 left-4 z-50 p-4 rounded-lg shadow-lg ${
          createUserMutation.toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white font-arabic`}>
          {createUserMutation.toast.message}
        </div>
      )}
      {updateUserMutation.toast.show && (
        <div className={`fixed bottom-4 left-4 z-50 p-4 rounded-lg shadow-lg ${
          updateUserMutation.toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white font-arabic`}>
          {updateUserMutation.toast.message}
        </div>
      )}
      {deleteUserMutation.toast.show && (
        <div className={`fixed bottom-4 left-4 z-50 p-4 rounded-lg shadow-lg ${
          deleteUserMutation.toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white font-arabic`}>
          {deleteUserMutation.toast.message}
        </div>
      )}
      {linkUserMutation.toast.show && (
        <div className={`fixed bottom-4 left-4 z-50 p-4 rounded-lg shadow-lg ${
          linkUserMutation.toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white font-arabic`}>
          {linkUserMutation.toast.message}
        </div>
      )}
      {unlinkUserMutation.toast.show && (
        <div className={`fixed bottom-4 left-4 z-50 p-4 rounded-lg shadow-lg ${
          unlinkUserMutation.toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        } text-white font-arabic`}>
          {unlinkUserMutation.toast.message}
        </div>
      )}
    </PageContainer>
  )
}

export default UsersManagementPage

