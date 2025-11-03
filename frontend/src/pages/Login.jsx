/**
 * Login Page - Redesigned with UI Kit
 * 
 * Modern, accessible login page using the unified design system.
 * Preserves all backend functionality and validation logic.
 */

import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../stores/authStore'
import { 
  Button, 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent,
  Input,
  Label 
} from '../ui-kit'
import { Eye, EyeOff, User, Lock, AlertCircle, Building2 } from 'lucide-react'

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
  }, [clearError])

  // Handle redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      const redirectPath = '/reception/dashboard'
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
      navigate('/reception/dashboard', { replace: true })
    }
    
    setIsLoading(false)
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-50/30 py-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
      dir="rtl"
      aria-label="صفحة تسجيل الدخول"
    >
      {/* Premium Background Patterns */}
      <div 
        className="absolute inset-0 bg-[radial-gradient(circle_at_25%_25%,rgba(14,165,233,0.05),transparent_60%)] bg-[length:200px_200px]"
        aria-hidden="true"
      />
      <div 
        className="absolute inset-0 bg-[radial-gradient(circle_at_75%_75%,rgba(16,185,129,0.05),transparent_60%)] bg-[length:250px_250px]"
        aria-hidden="true"
      />
      <div 
        className="absolute inset-0 bg-gradient-to-br from-medical-blue-50/30 via-transparent to-medical-green-50/30"
        aria-hidden="true"
      />
      
      {/* Grid overlay */}
      <div 
        className="absolute inset-0 opacity-[0.02] bg-[linear-gradient(to_right,#000_1px,transparent_1px),linear-gradient(to_bottom,#000_1px,transparent_1px)] bg-[size:40px_40px]"
        aria-hidden="true"
      />
      
      <div className="max-w-md w-full space-y-10 animate-fade-in relative z-10">
        {/* Logo & Brand Section */}
        <div className="text-center space-y-4">
          <div 
            className="mx-auto h-24 w-24 bg-gradient-to-br from-medical-blue-500 via-medical-blue-400 to-medical-green-500 rounded-3xl flex items-center justify-center mb-4 shadow-premium-lg hover:shadow-premium-xl transition-all duration-500 transform hover:scale-105"
            role="img"
            aria-label="شعار النظام"
          >
            <Building2 className="h-12 w-12 text-white" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <h1 className="text-5xl font-bold font-arabic bg-gradient-to-r from-medical-blue-600 via-medical-blue-500 to-medical-green-600 bg-clip-text text-transparent mb-2 tracking-tight">
              نظام إدارة العيادة الطبية
            </h1>
            <p className="text-lg font-arabic text-gray-600 font-medium">
              تسجيل الدخول إلى حسابك
            </p>
          </div>
        </div>

        {/* Login Card */}
        <Card className="animate-slide-in shadow-premium-lg border-2 border-gray-100/80 bg-white/95 backdrop-blur-sm overflow-hidden">
          <div 
            className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-medical-blue-500 via-medical-blue-400 to-medical-green-500"
            aria-hidden="true"
          />
          
          <CardHeader className="pb-8 pt-10 border-none">
            <CardTitle className="text-center text-3xl font-bold text-gray-900 mb-2">
              تسجيل الدخول
            </CardTitle>
            <CardDescription className="text-center text-sm text-gray-500 font-medium mt-2">
              أدخل بياناتك للوصول إلى النظام
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6" noValidate>
              {/* Error Message */}
              {error && (
                <div 
                  className="bg-gradient-to-r from-red-50 to-red-100/80 border-2 border-red-200/60 text-red-800 px-5 py-4 rounded-2xl font-arabic shadow-premium animate-slide-up"
                  role="alert"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 h-5 w-5 rounded-full bg-red-500 flex items-center justify-center">
                      <AlertCircle className="h-3 w-3 text-white" aria-hidden="true" />
                    </div>
                    <span className="font-semibold text-sm">{error}</span>
                  </div>
                </div>
              )}

              {/* Username Field */}
              <div className="space-y-2">
                <Label htmlFor="username" className="block text-sm font-bold font-arabic text-gray-900 mb-2">
                  اسم المستخدم
                </Label>
                <div className="relative group">
                  <div 
                    className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none z-10"
                    aria-hidden="true"
                  >
                    <User className="h-5 w-5 text-medical-blue-500 group-focus-within:text-medical-blue-600 transition-colors" />
                  </div>
                  <Input
                    id="username"
                    name="username"
                    type="text"
                    required
                    autoComplete="username"
                    placeholder="أدخل اسم المستخدم"
                    value={formData.username}
                    onChange={handleChange}
                    aria-describedby={error ? "username-error" : undefined}
                    aria-invalid={error ? "true" : "false"}
                    className="pr-12 pl-4"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="block text-sm font-bold font-arabic text-gray-900 mb-2">
                  كلمة المرور
                </Label>
                <div className="relative group">
                  <div 
                    className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none z-10"
                    aria-hidden="true"
                  >
                    <Lock className="h-5 w-5 text-medical-blue-500 group-focus-within:text-medical-blue-600 transition-colors" />
                  </div>
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    placeholder="أدخل كلمة المرور"
                    value={formData.password}
                    onChange={handleChange}
                    aria-describedby={error ? "password-error" : undefined}
                    aria-invalid={error ? "true" : "false"}
                    className="pr-12 pl-12"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 left-0 pl-4 flex items-center hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-medical-blue-200 rounded-xl"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                    aria-pressed={showPassword}
                    tabIndex={0}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-medical-blue-600 transition-colors" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-medical-blue-600 transition-colors" />
                    )}
                  </button>
                </div>
              </div>

              {/* Forgot Password Link */}
              <div className="flex justify-end">
                <Link
                  to="/forgot-password"
                  className="text-sm text-medical-blue-600 hover:text-medical-blue-700 font-medium hover:underline transition-colors focus:outline-none focus:ring-2 focus:ring-medical-blue-200 rounded-lg px-2 py-1"
                  aria-label="نسيت كلمة المرور؟"
                >
                  نسيت كلمة المرور؟
                </Link>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full font-bold text-lg py-4"
                variant="default"
                loading={isLoading}
                disabled={isLoading}
                size="lg"
                aria-label="تسجيل الدخول"
              >
                {isLoading ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
              </Button>
            </form>

            {/* Register Link */}
            <div className="text-center pt-4 border-t border-gray-100">
              <p className="text-sm text-gray-600 font-arabic mb-2">
                ليس لديك حساب؟
              </p>
              <Link
                to="/register"
                className="text-sm text-medical-green-600 hover:text-medical-green-700 font-bold hover:underline transition-colors focus:outline-none focus:ring-2 focus:ring-medical-green-200 rounded-lg px-2 py-1"
                aria-label="إنشاء حساب جديد"
              >
                إنشاء حساب جديد
              </Link>
            </div>

            {/* Test Credentials Card */}
            <div className="mt-8 p-6 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-3xl border-2 border-gray-200/60 shadow-premium backdrop-blur-sm">
              <h3 className="text-base font-bold font-arabic text-gray-900 mb-4 flex items-center gap-2.5">
                <span className="h-2 w-2 rounded-full bg-medical-blue-500 animate-pulse" aria-hidden="true"></span>
                بيانات تجريبية:
              </h3>
              <div className="space-y-3 text-sm font-arabic">
                <div className="flex items-center justify-between p-3 bg-white/80 rounded-xl border border-gray-200/60 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-medical-blue-500" aria-hidden="true"></span>
                    <span className="text-gray-700 font-medium">مدير:</span>
                  </div>
                  <code className="text-medical-blue-600 font-semibold bg-medical-blue-50 px-3 py-1 rounded-lg">
                    admin / admin123
                  </code>
                </div>
                <div className="flex items-center justify-between p-3 bg-white/80 rounded-xl border border-gray-200/60 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-medical-green-500" aria-hidden="true"></span>
                    <span className="text-gray-700 font-medium">استقبال:</span>
                  </div>
                  <code className="text-medical-green-600 font-semibold bg-medical-green-50 px-3 py-1 rounded-lg">
                    sara_reception / sara123
                  </code>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Login
