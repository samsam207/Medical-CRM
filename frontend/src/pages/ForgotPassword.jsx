/**
 * Forgot Password Page - Redesigned with UI Kit
 * 
 * Modern, accessible forgot password page using the unified design system.
 * Note: Backend endpoint not yet implemented - UI ready for integration.
 */

import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
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
import { Mail, AlertCircle, Building2, CheckCircle, ArrowRight } from 'lucide-react'
import api from '../api/client'

const ForgotPassword = () => {
  const [formData, setFormData] = useState({
    email: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [emailSent, setEmailSent] = useState(false)
  
  const navigate = useNavigate()

  useEffect(() => {
    setError(null)
    setSuccess(false)
    setEmailSent(false)
  }, [])

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
    // Clear errors when user types
    if (error) setError(null)
  }

  const validateForm = () => {
    if (!formData.email || !formData.email.includes('@')) {
      setError('الرجاء إدخال بريد إلكتروني صحيح')
      return false
    }
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    
    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    
    try {
      // TODO: Replace with actual forgot password endpoint when backend implements it
      // const response = await api.post('/auth/forgot-password', {
      //   email: formData.email
      // })
      
      // For now, show success message (remove when backend is ready)
      setSuccess(true)
      setEmailSent(true)
      
      // Simulate email sent
      setTimeout(() => {
        setSuccess(false)
      }, 5000)
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'حدث خطأ أثناء إرسال البريد الإلكتروني'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  if (emailSent) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-50/30 py-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
        dir="rtl"
        aria-label="تم إرسال البريد الإلكتروني"
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
        
        <div className="max-w-md w-full space-y-10 animate-fade-in relative z-10">
          {/* Success Card */}
          <Card className="animate-slide-in shadow-premium-lg border-2 border-gray-100/80 bg-white/95 backdrop-blur-sm overflow-hidden">
            <div 
              className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-medical-green-500 via-medical-green-400 to-medical-blue-500"
              aria-hidden="true"
            />
            
            <CardHeader className="pb-8 pt-10 border-none">
              <div className="mx-auto h-20 w-20 bg-gradient-to-br from-medical-green-500 to-medical-green-600 rounded-full flex items-center justify-center mb-4 shadow-premium">
                <CheckCircle className="h-12 w-12 text-white" aria-hidden="true" />
              </div>
              <CardTitle className="text-center text-3xl font-bold text-gray-900 mb-2">
                تم إرسال البريد الإلكتروني
              </CardTitle>
              <CardDescription className="text-center text-sm text-gray-500 font-medium mt-2">
                تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="bg-gradient-to-r from-medical-blue-50 to-medical-green-50/80 border-2 border-medical-blue-200/60 text-gray-700 px-5 py-4 rounded-2xl font-arabic">
                <p className="text-sm font-medium text-center">
                  تحقق من بريدك الإلكتروني <strong>{formData.email}</strong> واتبع التعليمات لإعادة تعيين كلمة المرور.
                </p>
              </div>

              <div className="space-y-4">
                <p className="text-sm text-gray-600 font-arabic text-center">
                  لم تستلم البريد؟
                </p>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setEmailSent(false)
                    setFormData({ email: '' })
                  }}
                  aria-label="إعادة المحاولة"
                >
                  إعادة المحاولة
                </Button>
              </div>

              <div className="text-center pt-4 border-t border-gray-100">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 text-sm text-medical-blue-600 hover:text-medical-blue-700 font-bold hover:underline transition-colors focus:outline-none focus:ring-2 focus:ring-medical-blue-200 rounded-lg px-2 py-1"
                  aria-label="العودة إلى تسجيل الدخول"
                >
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  العودة إلى تسجيل الدخول
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 via-white to-gray-50/30 py-16 px-4 sm:px-6 lg:px-8 relative overflow-hidden"
      dir="rtl"
      aria-label="صفحة إعادة تعيين كلمة المرور"
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
              إعادة تعيين كلمة المرور
            </p>
          </div>
        </div>

        {/* Forgot Password Card */}
        <Card className="animate-slide-in shadow-premium-lg border-2 border-gray-100/80 bg-white/95 backdrop-blur-sm overflow-hidden">
          <div 
            className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-medical-blue-500 via-medical-blue-400 to-medical-green-500"
            aria-hidden="true"
          />
          
          <CardHeader className="pb-8 pt-10 border-none">
            <CardTitle className="text-center text-3xl font-bold text-gray-900 mb-2">
              إعادة تعيين كلمة المرور
            </CardTitle>
            <CardDescription className="text-center text-sm text-gray-500 font-medium mt-2">
              أدخل بريدك الإلكتروني وسنرسل لك رابط إعادة تعيين كلمة المرور
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6" noValidate>
              {/* Success Message */}
              {success && (
                <div 
                  className="bg-gradient-to-r from-green-50 to-green-100/80 border-2 border-green-200/60 text-green-800 px-5 py-4 rounded-2xl font-arabic shadow-premium animate-slide-up"
                  role="alert"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 h-5 w-5 rounded-full bg-green-500 flex items-center justify-center">
                      <CheckCircle className="h-3 w-3 text-white" aria-hidden="true" />
                    </div>
                    <span className="font-semibold text-sm">تم إرسال البريد الإلكتروني بنجاح!</span>
                  </div>
                </div>
              )}

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

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="block text-sm font-bold font-arabic text-gray-900 mb-2">
                  البريد الإلكتروني
                </Label>
                <div className="relative group">
                  <div 
                    className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none z-10"
                    aria-hidden="true"
                  >
                    <Mail className="h-5 w-5 text-medical-blue-500 group-focus-within:text-medical-blue-600 transition-colors" />
                  </div>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="أدخل بريدك الإلكتروني"
                    value={formData.email}
                    onChange={handleChange}
                    className="pr-12 pl-4"
                    aria-describedby={error ? "email-error" : undefined}
                    aria-invalid={error ? "true" : "false"}
                  />
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full font-bold text-lg py-4"
                variant="default"
                loading={isLoading}
                disabled={isLoading || success}
                size="lg"
                aria-label="إرسال رابط إعادة التعيين"
              >
                {isLoading ? 'جاري الإرسال...' : 'إرسال رابط إعادة التعيين'}
              </Button>
            </form>

            {/* Login Link */}
            <div className="text-center pt-4 border-t border-gray-100">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 text-sm text-medical-blue-600 hover:text-medical-blue-700 font-bold hover:underline transition-colors focus:outline-none focus:ring-2 focus:ring-medical-blue-200 rounded-lg px-2 py-1"
                aria-label="العودة إلى تسجيل الدخول"
              >
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
                العودة إلى تسجيل الدخول
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default ForgotPassword

