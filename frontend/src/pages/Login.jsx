import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import Button from '../components/common/Button'
import { Card, CardHeader, CardTitle, CardContent } from '../components/common/Card'
import { Eye, EyeOff, User, Lock } from 'lucide-react'

const Login = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  const { login, user, isAuthenticated, error, clearError } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    clearError()
  }, [])

  // Handle redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      const role = (user.role || '').toLowerCase()
      const redirectPath = role === 'doctor' ? '/doctor' : '/reception'
      navigate(redirectPath, { replace: true })
    }
  }, [isAuthenticated, user, navigate])

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    
    const result = await login(formData)
    
    if (result.success) {
      // Get the updated user from the store after login
      const { user: currentUser } = useAuthStore.getState()
      const role = (currentUser?.role || '').toLowerCase()
      navigate(role === 'doctor' ? '/doctor' : '/reception', { replace: true })
    }
    
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background-500 via-background-400 to-background-600 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 animate-fade-in">
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-gradient-primary rounded-3xl flex items-center justify-center mb-6 shadow-soft-lg">
            <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <h2 className="text-4xl font-bold font-arabic text-primary-500 mb-2">
            نظام إدارة العيادة الطبية
          </h2>
          <p className="text-lg font-arabic text-secondary-600">
            تسجيل الدخول إلى حسابك
          </p>
        </div>

        <Card className="animate-slide-in">
          <CardHeader>
            <CardTitle className="text-center text-2xl">تسجيل الدخول</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-error-50 border-2 border-error-200 text-error-700 px-6 py-4 rounded-2xl font-arabic">
                  <div className="flex items-center gap-2">
                    <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {error}
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="username" className="block text-sm font-bold font-arabic text-gray-700 mb-2">
                  اسم المستخدم
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-secondary-400" />
                  </div>
                  <input
                    id="username"
                    name="username"
                    type="text"
                    required
                    className="input-field pr-12 text-right font-arabic"
                    placeholder="أدخل اسم المستخدم"
                    value={formData.username}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-bold font-arabic text-gray-700 mb-2">
                  كلمة المرور
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-secondary-400" />
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    className="input-field pr-12 pl-12 text-right font-arabic"
                    placeholder="أدخل كلمة المرور"
                    value={formData.password}
                    onChange={handleChange}
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 left-0 pl-4 flex items-center"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-secondary-400 hover:text-secondary-600 transition-colors" />
                    ) : (
                      <Eye className="h-5 w-5 text-secondary-400 hover:text-secondary-600 transition-colors" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full"
                loading={isLoading}
                disabled={isLoading}
                size="lg"
              >
                {isLoading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
              </Button>
            </form>

            <div className="mt-8 p-6 bg-gradient-to-r from-accent-50 to-accent-100 rounded-2xl border border-accent-200">
              <h3 className="text-lg font-bold font-arabic text-accent-700 mb-3">بيانات تجريبية:</h3>
              <div className="space-y-2 text-sm font-arabic text-accent-600">
                <p><strong>مدير:</strong> admin / admin123</p>
                <p><strong>استقبال:</strong> sara_reception / sara123</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Login
