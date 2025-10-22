import sqlite3

# Connect to the database
conn = sqlite3.connect(r'D:\Projects\doc crm\backend\instance\medical_crm.db')
cursor = conn.cursor()

# Fix user roles to match the enum values
cursor.execute("UPDATE users SET role = 'ADMIN' WHERE role = 'admin'")
cursor.execute("UPDATE users SET role = 'RECEPTIONIST' WHERE role = 'receptionist'")
cursor.execute("UPDATE users SET role = 'DOCTOR' WHERE role = 'doctor'")

# Commit the changes
conn.commit()

print(f"Updated {cursor.rowcount} user role(s)")

# Verify the changes
cursor.execute("SELECT username, role FROM users")
users = cursor.fetchall()
print("\nCurrent users:")
for username, role in users:
    print(f"  - {username}: {role}")

conn.close()
print("\nDatabase fixed successfully!")

