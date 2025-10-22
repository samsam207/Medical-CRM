import sqlite3

# Connect to the database
conn = sqlite3.connect(r'D:\Projects\doc crm\backend\instance\medical_crm.db')
cursor = conn.cursor()

print("VERIFYING BOOKING RECORDS...")
print("=" * 50)

# Check appointments
cursor.execute("SELECT id, booking_id, clinic_id, doctor_id, patient_id, service_id, start_time, end_time, status, notes FROM appointments ORDER BY id DESC LIMIT 3")
appointments = cursor.fetchall()

print(f"\nAPPOINTMENTS (Last 3):")
for apt in appointments:
    print(f"  ID: {apt[0]}, Booking: {apt[1]}, Clinic: {apt[2]}, Doctor: {apt[3]}, Patient: {apt[4]}")
    print(f"  Service: {apt[5]}, Time: {apt[6]} - {apt[7]}, Status: {apt[8]}")
    print(f"  Notes: {apt[9]}")
    print()

# Check visits
cursor.execute("SELECT id, appointment_id, doctor_id, patient_id, service_id, clinic_id, queue_number, status, visit_type FROM visits ORDER BY id DESC LIMIT 3")
visits = cursor.fetchall()

print(f"\nVISITS (Last 3):")
for visit in visits:
    print(f"  ID: {visit[0]}, Appointment: {visit[1]}, Doctor: {visit[2]}, Patient: {visit[3]}")
    print(f"  Service: {visit[4]}, Clinic: {visit[5]}, Queue: {visit[6]}, Status: {visit[7]}, Type: {visit[8]}")
    print()

# Check payments
cursor.execute("SELECT id, visit_id, patient_id, total_amount, amount_paid, doctor_share, center_share, status FROM payments ORDER BY id DESC LIMIT 3")
payments = cursor.fetchall()

print(f"\nPAYMENTS (Last 3):")
for payment in payments:
    print(f"  ID: {payment[0]}, Visit: {payment[1]}, Patient: {payment[2]}")
    print(f"  Total: ${payment[3]}, Paid: ${payment[4]}, Doctor Share: ${payment[5]}, Center Share: ${payment[6]}")
    print(f"  Status: {payment[7]}")
    print()

# Check dashboard stats
cursor.execute("SELECT COUNT(*) FROM appointments WHERE DATE(created_at) = DATE('now')")
today_appointments = cursor.fetchone()[0]

cursor.execute("SELECT COUNT(*) FROM visits WHERE DATE(created_at) = DATE('now') AND status = 'WAITING'")
waiting_patients = cursor.fetchone()[0]

cursor.execute("SELECT COUNT(*) FROM payments WHERE status = 'PENDING'")
pending_payments = cursor.fetchone()[0]

print(f"\nDASHBOARD STATS:")
print(f"  Today's Appointments: {today_appointments}")
print(f"  Waiting Patients: {waiting_patients}")
print(f"  Pending Payments: {pending_payments}")

conn.close()
print(f"\nVERIFICATION COMPLETE!")
