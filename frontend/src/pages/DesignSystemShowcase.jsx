/**
 * Design System Showcase Page
 * 
 * A demo/showcase page demonstrating all components in the UI Kit.
 * This serves as a reference and testing ground for the design system.
 * 
 * Accessible via route: /design-system (if added to router)
 */

import React, { useState } from 'react'
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Badge,
  Input,
  Label,
  Separator,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
  Skeleton,
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui-kit'
import { Building2, User, Calendar, CreditCard, Settings, Stethoscope } from 'lucide-react'

const DesignSystemShowcase = () => {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')

  return (
    <div className="min-h-screen bg-gray-50 p-8" dir="rtl">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-gray-900 font-arabic">
            نظام التصميم - Medical CRM
          </h1>
          <p className="text-lg text-gray-600 font-arabic">
            عرض شامل لجميع مكونات واجهة المستخدم
          </p>
        </div>

        {/* Buttons Section */}
        <Card>
          <CardHeader>
            <CardTitle>الأزرار (Buttons)</CardTitle>
            <CardDescription>مختلف أنواع وأحجام الأزرار</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-bold font-arabic">الأشكال (Variants)</h3>
              <div className="flex flex-wrap gap-4">
                <Button variant="default">افتراضي</Button>
                <Button variant="primary">أساسي</Button>
                <Button variant="secondary">ثانوي</Button>
                <Button variant="outline">محدد</Button>
                <Button variant="ghost">شبح</Button>
                <Button variant="link">رابط</Button>
                <Button variant="danger">خطر</Button>
                <Button variant="success">نجاح</Button>
                <Button variant="warning">تحذير</Button>
              </div>
            </div>
            <Separator />
            <div className="space-y-4">
              <h3 className="text-lg font-bold font-arabic">الأحجام (Sizes)</h3>
              <div className="flex flex-wrap items-center gap-4">
                <Button size="sm">صغير</Button>
                <Button size="md">متوسط</Button>
                <Button size="lg">كبير</Button>
                <Button size="icon" aria-label="Settings">
                  <Settings className="h-5 w-5" />
                </Button>
              </div>
            </div>
            <Separator />
            <div className="space-y-4">
              <h3 className="text-lg font-bold font-arabic">الحالات (States)</h3>
              <div className="flex flex-wrap gap-4">
                <Button loading>جاري التحميل...</Button>
                <Button disabled>معطل</Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cards Section */}
        <Card>
          <CardHeader>
            <CardTitle>البطاقات (Cards)</CardTitle>
            <CardDescription>مختلف أنواع البطاقات</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card variant="default">
              <CardHeader>
                <CardTitle>بطاقة افتراضية</CardTitle>
                <CardDescription>وصف البطاقة الافتراضية</CardDescription>
              </CardHeader>
              <CardContent>محتوى البطاقة</CardContent>
              <CardFooter>
                <Button size="sm">عرض</Button>
              </CardFooter>
            </Card>

            <Card variant="primary">
              <CardHeader variant="primary">
                <CardTitle variant="primary">بطاقة أساسية</CardTitle>
                <CardDescription variant="primary">وصف البطاقة الأساسية</CardDescription>
              </CardHeader>
              <CardContent>محتوى البطاقة</CardContent>
            </Card>

            <Card variant="success">
              <CardHeader variant="success">
                <CardTitle variant="success">بطاقة نجاح</CardTitle>
                <CardDescription variant="success">وصف البطاقة</CardDescription>
              </CardHeader>
              <CardContent>محتوى البطاقة</CardContent>
            </Card>
          </CardContent>
        </Card>

        {/* Badges Section */}
        <Card>
          <CardHeader>
            <CardTitle>الشارات (Badges)</CardTitle>
            <CardDescription>مختلف أنواع الشارات</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <h3 className="text-lg font-bold font-arabic">الأشكال (Variants)</h3>
              <div className="flex flex-wrap gap-4">
                <Badge variant="default">افتراضي</Badge>
                <Badge variant="primary">أساسي</Badge>
                <Badge variant="secondary">ثانوي</Badge>
                <Badge variant="success">نجاح</Badge>
                <Badge variant="destructive">تدميري</Badge>
                <Badge variant="outline">محدد</Badge>
              </div>
            </div>
            <Separator />
            <div className="space-y-4">
              <h3 className="text-lg font-bold font-arabic">الأحجام (Sizes)</h3>
              <div className="flex flex-wrap items-center gap-4">
                <Badge size="sm">صغير</Badge>
                <Badge size="md">متوسط</Badge>
                <Badge size="lg">كبير</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form Elements Section */}
        <Card>
          <CardHeader>
            <CardTitle>عناصر النماذج (Form Elements)</CardTitle>
            <CardDescription>مدخلات النماذج والحقول</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="example-input">حقل إدخال مثال</Label>
              <Input
                id="example-input"
                placeholder="أدخل النص هنا..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="disabled-input">حقل معطل</Label>
              <Input id="disabled-input" disabled placeholder="هذا الحقل معطل" />
            </div>
          </CardContent>
        </Card>

        {/* Avatar Section */}
        <Card>
          <CardHeader>
            <CardTitle>الصور الرمزية (Avatars)</CardTitle>
            <CardDescription>صور المستخدمين الرمزية</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-6">
            <Avatar>
              <AvatarImage src="https://github.com/shadcn.png" alt="User" />
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
            <Avatar>
              <AvatarFallback>
                <User className="h-5 w-5" />
              </AvatarFallback>
            </Avatar>
            <Avatar className="h-16 w-16">
              <AvatarFallback>د.أ</AvatarFallback>
            </Avatar>
          </CardContent>
        </Card>

        {/* Table Section */}
        <Card>
          <CardHeader>
            <CardTitle>الجداول (Tables)</CardTitle>
            <CardDescription>جداول البيانات</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>الاسم</TableHead>
                  <TableHead>الدور</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell>أحمد محمد</TableCell>
                  <TableCell>طبيب</TableCell>
                  <TableCell>
                    <Badge variant="success">نشط</Badge>
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost">عرض</Button>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>سارة أحمد</TableCell>
                  <TableCell>استقبال</TableCell>
                  <TableCell>
                    <Badge variant="success">نشط</Badge>
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost">عرض</Button>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>محمد علي</TableCell>
                  <TableCell>مدير</TableCell>
                  <TableCell>
                    <Badge variant="default">متوقف</Badge>
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost">عرض</Button>
                  </TableCell>
                </TableRow>
              </TableBody>
              <TableCaption>قائمة المستخدمين في النظام</TableCaption>
            </Table>
          </CardContent>
        </Card>

        {/* Skeleton Section */}
        <Card>
          <CardHeader>
            <CardTitle>الهياكل المؤقتة (Skeletons)</CardTitle>
            <CardDescription>أحمال مؤقتة أثناء التحميل</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-[250px]" />
              <Skeleton className="h-4 w-[200px]" />
            </div>
            <Skeleton className="h-[125px] w-full rounded-xl" />
            <div className="flex items-center space-x-4 space-x-reverse">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-[250px]" />
                <Skeleton className="h-4 w-[200px]" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Dialog/Modal Section */}
        <Card>
          <CardHeader>
            <CardTitle>النوافذ المنبثقة (Dialogs/Modals)</CardTitle>
            <CardDescription>النوافذ المنبثقة والحوارات</CardDescription>
          </CardHeader>
          <CardContent>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>فتح نافذة منبثقة</Button>
              </DialogTrigger>
              <DialogContent size="md">
                <DialogHeader>
                  <DialogTitle>نافذة منبثقة مثال</DialogTitle>
                  <DialogDescription>
                    هذه نافذة منبثقة مثال تعرض محتوى تفاعلي.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <p className="text-sm text-gray-600 font-arabic">
                    يمكن استخدام هذه النوافذ المنبثقة لعرض النماذج، تأكيدات، أو محتوى إضافي.
                  </p>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    إلغاء
                  </Button>
                  <Button onClick={() => setDialogOpen(false)}>
                    تأكيد
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        {/* Icons with Cards Section */}
        <Card>
          <CardHeader>
            <CardTitle>الأيقونات مع البطاقات</CardTitle>
            <CardDescription>بطاقات مع أيقونات طبية</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-medical-blue-100 rounded-xl">
                  <Building2 className="h-6 w-6 text-medical-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold font-arabic">العيادات</h3>
                  <p className="text-sm text-gray-600 font-arabic">5</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-medical-green-100 rounded-xl">
                  <Stethoscope className="h-6 w-6 text-medical-green-600" />
                </div>
                <div>
                  <h3 className="font-bold font-arabic">الأطباء</h3>
                  <p className="text-sm text-gray-600 font-arabic">12</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-medical-blue-100 rounded-xl">
                  <Calendar className="h-6 w-6 text-medical-blue-600" />
                </div>
                <div>
                  <h3 className="font-bold font-arabic">المواعيد</h3>
                  <p className="text-sm text-gray-600 font-arabic">24</p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-medical-green-100 rounded-xl">
                  <CreditCard className="h-6 w-6 text-medical-green-600" />
                </div>
                <div>
                  <h3 className="font-bold font-arabic">المدفوعات</h3>
                  <p className="text-sm text-gray-600 font-arabic">8</p>
                </div>
              </div>
            </Card>
          </CardContent>
        </Card>

        {/* Color Palette Section */}
        <Card>
          <CardHeader>
            <CardTitle>لوحة الألوان (Color Palette)</CardTitle>
            <CardDescription>ألوان نظام التصميم الطبي</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="space-y-2">
                <div className="h-24 bg-gradient-to-br from-medical-blue-500 to-medical-blue-600 rounded-xl shadow-lg"></div>
                <p className="text-sm font-bold font-arabic">أزرق طبي</p>
                <p className="text-xs text-gray-600">#0EA5E9</p>
              </div>
              <div className="space-y-2">
                <div className="h-24 bg-gradient-to-br from-medical-green-500 to-medical-green-600 rounded-xl shadow-lg"></div>
                <p className="text-sm font-bold font-arabic">أخضر طبي</p>
                <p className="text-xs text-gray-600">#10B981</p>
              </div>
              <div className="space-y-2">
                <div className="h-24 bg-gradient-to-br from-red-500 to-red-600 rounded-xl shadow-lg"></div>
                <p className="text-sm font-bold font-arabic">خطأ</p>
                <p className="text-xs text-gray-600">#ef4444</p>
              </div>
              <div className="space-y-2">
                <div className="h-24 bg-gradient-to-br from-warning-500 to-warning-600 rounded-xl shadow-lg"></div>
                <p className="text-sm font-bold font-arabic">تحذير</p>
                <p className="text-xs text-gray-600">#f59e0b</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default DesignSystemShowcase

