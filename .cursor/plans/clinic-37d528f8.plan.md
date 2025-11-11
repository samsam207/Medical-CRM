<!-- 37d528f8-d2fc-4948-b22a-40e06b49bdf2 6b9d7f77-b4e0-449b-917c-727849513ba2 -->
# تطبيق نظام الصلاحيات وإدارة الطابور

## المتطلبات الرئيسية

### 1. صلاحيات الأدوار

#### Admin

- يمكنه القيام بكل شيء (موجود بالفعل)

#### Reception

- **لا يمكنها**: إضافة/تعديل/حذف عيادات أو أطباء
- **لا يمكنها**: تغيير حالة الموعد إلى "مكتمل" في Queue Management أو Appointments Page
- **يمكنها**: كل شيء آخر بما في ذلك نقل المواعيد بين المراحل

#### Doctor

- يرى فقط عيادته الخاصة (موجود بالفعل)
- **يمكنه**: تغيير حالة الموعد إلى "مكتمل" في:
- Queue Management (سحب من with_doctor إلى completed)
- Current Appointment Page (زر إكمال)
- Appointments Page (تغيير الحالة إلى completed)

### 2. تدفق Queue Management

1. Reception تختار العيادة والدكتور → يظهر مواعيد اليوم في الصف الأول
2. Reception تنقل من `appointments_today` إلى `waiting` (check-in)
3. Reception تنقل من `waiting` إلى `with_doctor`

- **عندها يظهر الموعد للدكتور مباشرة في Current Appointment** (Socket.IO real-time)

4. Doctor يضغط زر "إكمال" في Current Appointment أو يسحب من `with_doctor` إلى `completed` في Queue Management

- الموعد ينتقل إلى `completed`
- **يظهر زر "معالجة الدفع" للـ Reception** في `completed`
- **عند النقر على زر "معالجة الدفع" يفتح صفحة Payments مع مودال الدفعة المفتوح**

### 3. تزامن الحالات

- الحالات في Appointments Page و Queue Management يجب أن تكون متزامنة
- عند تغيير الحالة في صفحة، تتغير في الأخرى تلقائياً (Socket.IO)

## التعديلات المطلوبة

### Backend

#### 1. `backend/app/routes/clinics.py` و `backend/app/routes/doctors.py`

- **التحقق**: التأكد من أن `create_clinic`, `update_clinic`, `delete_clinic`, `create_doctor`, `update_doctor`, `delete_doctor` محمية بـ `admin_required` فقط

#### 2. `backend/app/routes/queue.py`

- **`move_patient_phase`**:
- منع Reception من نقل من `with_doctor` إلى `completed` (فقط Doctor يمكنه)
- منع Doctor من نقل إلى `with_doctor` (فقط Reception يمكنها)
- منع Doctor من نقل من `appointments_today` إلى `waiting` (فقط Reception يمكنها)
- عند نقل Reception من `waiting` إلى `with_doctor`:
- إرسال Socket.IO event `current_appointment_available` للدكتور
- تحديث `visit.status` إلى `IN_PROGRESS`
- تحديث `appointment.status` إلى `in_progress` إذا كان موجوداً

#### 3. `backend/app/routes/appointments.py`

- **`update_appointment`**:
- منع Reception من تغيير الحالة إلى `completed` (فقط Doctor يمكنه)
- عند تغيير Doctor للحالة إلى `completed`:
- تحديث `visit.status` إلى `COMPLETED` إذا كان موجوداً
- إرسال Socket.IO event `phases_updated` لتحديث Queue Management
- إرسال Socket.IO event `appointment_completed`

### Frontend

#### 1. `frontend/src/components/QueueManagement.jsx`

- **Drag & Drop Restrictions**:
- منع Reception من سحب من `with_doctor` إلى `completed`
- منع Doctor من سحب إلى `with_doctor`
- منع Doctor من سحب من `appointments_today` إلى `waiting`
- **Buttons Visibility**:
- زر "تسجيل الدخول" (Check-in) في `appointments_today`: فقط Reception (`!isDoctor`)
- زر "بدء الاستشارة" (Start Consultation) في `waiting`: فقط Reception (`!isDoctor`)
- زر "إكمال الاستشارة" (Complete Consultation) في `with_doctor`: فقط Doctor (`isDoctor`)
- زر "معالجة الدفع" (Process Payment) في `completed`: فقط Reception (`!isDoctor`)
- **Payment Button**:
- عند النقر على "معالجة الدفع" في `completed`:
- الانتقال إلى `/reception/payments?visitId=${visit_id}` أو `/reception/payments?paymentId=${payment_id}`
- فتح مودال الدفعة إذا كان موجوداً

#### 2. `frontend/src/pages/CurrentAppointmentPage.jsx`

- **Socket.IO Listener**:
- إضافة listener لـ `current_appointment_available` event
- عند استقبال الحدث، إعادة تحميل البيانات تلقائياً
- **Complete Button**:
- عند إكمال الموعد:
- تحديث `visit.status` إلى `COMPLETED`
- تحديث `appointment.status` إلى `COMPLETED`
- إرسال Socket.IO event `phases_updated`

#### 3. `frontend/src/pages/AppointmentsPage.jsx`

- **Status Dropdown/Select**:
- منع Reception من اختيار `completed` في dropdown الحالة
- السماح فقط لـ Doctor باختيار `completed`
- **Socket.IO Listeners**:
- إضافة listener لـ `phases_updated` event
- عند استقبال الحدث، تحديث حالة الموعد في الجدول إذا كان موجوداً

#### 4. `frontend/src/pages/PaymentsPage.jsx` (إذا كان موجوداً)

- **Auto-open Payment Modal**:
- عند الوصول إلى الصفحة مع `visitId` أو `paymentId` في query params:
- فتح مودال الدفعة تلقائياً
- تحميل بيانات الدفعة

### Socket.IO Events

#### 1. `current_appointment_available`

- **Emitted**: عند نقل Reception موعد من `waiting` إلى `with_doctor`
- **Data**: `{ visit_id, appointment_id, doctor_id, clinic_id }`
- **Room**: `doctor_{doctor_id}`

#### 2. `phases_updated`

- **Emitted**: عند تغيير حالة موعد أو نقل بين المراحل
- **Data**: `{ phases, clinic_id, date, doctor_id? }`
- **Rooms**: `clinic_{clinic_id}`, `doctor_{doctor_id}` (إذا كان موجوداً)

#### 3. `appointment_completed`

- **Emitted**: عند إكمال Doctor للموعد
- **Data**: `{ appointment, visit, clinic_id, doctor_id }`
- **Rooms**: `clinic_{clinic_id}`, `doctor_{doctor_id}`

## الملفات المطلوب تعديلها

### Backend

1. `backend/app/routes/queue.py` - تقييد الصلاحيات في `move_patient_phase` وإضافة Socket.IO events
2. `backend/app/routes/appointments.py` - تقييد الصلاحيات في `update_appointment` وإضافة Socket.IO events
3. `backend/app/routes/clinics.py` - التحقق من الصلاحيات
4. `backend/app/routes/doctors.py` - التحقق من الصلاحيات

### Frontend

1. `frontend/src/components/QueueManagement.jsx` - تقييد Drag & Drop وButtons visibility
2. `frontend/src/pages/CurrentAppointmentPage.jsx` - إضافة Socket.IO listener
3. `frontend/src/pages/AppointmentsPage.jsx` - تقييد Status dropdown وإضافة Socket.IO listener
4. `frontend/src/pages/PaymentsPage.jsx` - فتح مودال الدفعة تلقائياً (إذا كان موجوداً)
5. `frontend/src/hooks/useSocket.js` - إضافة Socket.IO event handlers (إذا لزم الأمر)

## ملاحظات

- يجب التأكد من أن جميع التغييرات في الحالة يتم إرسالها عبر Socket.IO للتحديث الفوري
- يجب التأكد من أن Reception لا يمكنها تخطي مرحلة `with_doctor` (يجب المرور بها أولاً)
- يجب التأكد من أن Doctor لا يمكنه سحب المواعيد إلى `with_doctor` (فقط Reception يمكنها)
- يجب التأكد من أن Reception لا يمكنها نقل من `with_doctor` إلى `completed` (فقط Doctor يمكنه)

### To-dos

- [ ] Add/verify queue fetch and status update endpoints with RBAC and sockets
- [ ] التحقق من صلاحيات create/update/delete للعيادات والأطباء - يجب أن تكون admin_required فقط
- [ ] تطبيق قيود الحركة في move_patient_phase: منع Reception من نقل من with_doctor إلى completed، ومنع Doctor من نقل إلى with_doctor أو من appointments_today إلى waiting
- [ ] إضافة Socket.IO event current_appointment_available عند نقل Reception من waiting إلى with_doctor
- [ ] منع Reception من تغيير حالة الموعد إلى completed في update_appointment endpoint
- [ ] إضافة Socket.IO events عند تغيير حالة الموعد إلى completed من قبل Doctor
- [ ] تطبيق قيود Drag & Drop في QueueManagement: منع Reception من سحب من with_doctor إلى completed، ومنع Doctor من سحب إلى with_doctor أو من appointments_today إلى waiting
- [ ] تعديل visibility للأزرار في QueueManagement: زر Check-in للـ Reception فقط، زر Start Consultation للـ Reception فقط، زر Complete Consultation للـ Doctor فقط، زر Process Payment للـ Reception فقط
- [ ] تعديل زر معالجة الدفع في QueueManagement للانتقال إلى صفحة Payments مع فتح مودال الدفعة تلقائياً
- [ ] إضافة Socket.IO listener في CurrentAppointmentPage لـ current_appointment_available event
- [ ] منع Reception من اختيار completed في dropdown الحالة في AppointmentsPage
- [ ] إضافة Socket.IO listeners في AppointmentsPage لـ phases_updated و appointment_completed events
- [ ] إضافة logic في PaymentsPage لفتح مودال الدفعة تلقائياً عند الوصول مع visitId أو paymentId في query params