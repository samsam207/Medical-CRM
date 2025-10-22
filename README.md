# Medical Center Management CRM

A comprehensive clinic management system built with Flask (backend) and React (frontend) that handles appointments, patient management, live queues, visit recording, payments, and real-time notifications.

## 🏥 System Overview

This Medical CRM system replicates the exact workflow of "Al Noor Medical Center" with the following key features:

- **Reception Management**: Handle phone bookings, walk-ins, and patient check-ins
- **Live Queue System**: Real-time queue updates using WebSocket technology
- **Doctor Dashboard**: Patient consultation, prescription management, and follow-up scheduling
- **Payment Processing**: Automated payment handling with doctor/center share calculation
- **Notification System**: SMS reminders and confirmations via Celery background tasks
- **Comprehensive Reporting**: Revenue tracking, visit analytics, and export capabilities

## 🏗️ Architecture

### Backend (Flask)
- **Framework**: Flask + SQLAlchemy + Flask-SocketIO
- **Authentication**: Flask-JWT-Extended with role-based access control
- **Database**: SQLite (development) / PostgreSQL (production)
- **Real-time**: WebSocket for live queue updates
- **Background Tasks**: Celery + Redis for SMS notifications
- **API**: RESTful endpoints with comprehensive error handling

### Frontend (React)
- **Framework**: React 18 + Vite + TailwindCSS
- **State Management**: Zustand for global state
- **Data Fetching**: React Query for server state management
- **Real-time**: Socket.IO client for live updates
- **UI Components**: Custom components with TailwindCSS styling

## 📋 Prerequisites

- Python 3.8+
- Node.js 16+
- Redis (for background tasks)
- Git

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone <repository-url>
cd doc-crm
```

### 2. One-Click Setup (Recommended)

```bash
# Set up the entire environment automatically
python scripts/setup_environment.py

# Start the application
python scripts/start_project.py
```

### 3. Manual Setup (Alternative)

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Initialize database
python -f app/__init__.py
flask db init
flask db migrate -m "Initial migration"
flask db upgrade

# Seed initial data
python seed.py

# Start Redis (in a separate terminal)
redis-server

# Start Celery worker (in a separate terminal)
python celery_worker.py

# Start Flask development server
python run.py
```

The backend will be available at `http://localhost:5000`

### 3. Frontend Setup

```bash
# Navigate to frontend directory (in a new terminal)
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will be available at `http://localhost:3000`

## 🔐 Default Credentials

After running the seed script, you can login with:

- **Admin**: `admin` / `admin123`
- **Receptionist**: `sara_reception` / `sara123`

## 📊 Database Schema

The system includes 11 main entities:

1. **users** - System users (admin, receptionist, doctor)
2. **clinics** - Medical clinics/rooms
3. **doctors** - Medical practitioners with specialties
4. **patients** - Patient information and medical history
5. **services** - Medical services offered by clinics
6. **appointments** - Scheduled appointments with booking IDs
7. **visits** - Actual patient visits with queue management
8. **prescriptions** - Doctor prescriptions and diagnoses
9. **payments** - Payment processing with share calculations
10. **notifications** - SMS reminders and confirmations
11. **audit_log** - System activity tracking

## 🔄 Key Workflows

### 1. Appointment Booking (Phone Call)
1. Receptionist logs in and accesses dashboard
2. Clicks "New Booking" → Multi-step wizard opens
3. Selects clinic → Searches patient by phone
4. Chooses available time slot from calendar
5. Selects service and confirms booking
6. System generates booking ID and schedules SMS reminder

### 2. Patient Check-in
1. Patient arrives at clinic
2. Receptionist searches appointment by booking ID
3. Clicks "Check-In" button
4. System creates visit record and assigns queue number
5. Real-time queue update broadcasted to all connected clients

### 3. Doctor Consultation
1. Doctor views their patient queue
2. Calls next patient when ready
3. Opens patient record and consultation form
4. Records diagnosis, prescriptions, and uploads images
5. Marks visit as "Pending Payment"
6. System automatically schedules follow-up appointment

### 4. Payment Processing
1. Receptionist opens payment screen for completed visit
2. Displays service details and total amount
3. Selects payment method (Cash/Visa/Bank Transfer)
4. Confirms payment
5. System calculates doctor share (70%) and center share (30%)
6. Generates printable invoice

## 🛠️ API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - User logout

### Appointments
- `GET /api/appointments` - List appointments with filters
- `POST /api/appointments` - Create new appointment
- `GET /api/appointments/available-slots` - Get available time slots
- `PUT /api/appointments/:id` - Update appointment
- `DELETE /api/appointments/:id` - Cancel appointment

### Visits & Queue
- `POST /api/visits/check-in` - Check in patient
- `POST /api/visits/walk-in` - Create walk-in visit
- `GET /api/visits/queue` - Get live queue
- `PUT /api/visits/:id/status` - Update visit status

### Patients
- `GET /api/patients` - Search patients
- `POST /api/patients` - Create new patient
- `PUT /api/patients/:id` - Update patient info

### Payments
- `GET /api/payments` - List payments
- `POST /api/payments` - Process payment
- `GET /api/payments/invoice/:visit_id` - Generate invoice

### Reports
- `GET /api/reports/revenue` - Revenue breakdown
- `GET /api/reports/visits` - Visit statistics
- `GET /api/reports/export` - Export CSV/PDF

## 🔌 WebSocket Events

### Client → Server
- `join_queue_room` - Subscribe to clinic queue updates
- `join_doctor_room` - Subscribe to doctor queue updates

### Server → Client
- `queue_updated` - Queue state changed
- `new_checkin` - New patient checked in
- `visit_status_changed` - Visit status updated

## 📱 Real-time Features

- **Live Queue Updates**: Real-time queue status for all clinics
- **Instant Notifications**: WebSocket-based alerts and updates
- **Auto-refresh**: Dashboard stats refresh every 30 seconds
- **Background Tasks**: SMS reminders scheduled via Celery

## 🎨 Frontend Components

### Pages
- **Login**: Authentication with role-based redirect
- **Reception Dashboard**: Stats, quick actions, and alerts
- **Doctor Dashboard**: Patient queue and consultation tools
- **Patients List**: Patient search and management
- **Appointments**: Appointment scheduling and management
- **Payments**: Payment processing and invoice generation
- **Reports**: Analytics and data export

### Common Components
- **Button**: Styled button with variants and loading states
- **Card**: Reusable card layout component
- **Modal**: Overlay modal with backdrop
- **ProtectedRoute**: Role-based route protection

## 🔧 Configuration

### Backend Configuration
- Environment variables in `backend/app/config.py`
- Database URL configuration for different environments
- JWT secret key and token expiration settings
- File upload limits and allowed extensions

### Frontend Configuration
- API base URL in `frontend/src/api/client.js`
- WebSocket connection settings
- TailwindCSS configuration in `tailwind.config.js`

## 🧪 Testing

### Backend Testing
```bash
cd backend
python -m pytest tests/
```

### Frontend Testing
```bash
cd frontend
npm test
```

## 📦 Production Deployment

### Backend
1. Set production environment variables
2. Use PostgreSQL instead of SQLite
3. Configure Redis for production
4. Use Gunicorn + Nginx for serving
5. Set up SSL certificates

### Frontend
1. Build production bundle: `npm run build`
2. Serve static files with Nginx
3. Configure reverse proxy for API calls

## 🔒 Security Features

- JWT-based authentication with token refresh
- Role-based access control (RBAC)
- Input validation and sanitization
- SQL injection prevention via SQLAlchemy ORM
- CORS configuration for API security
- File upload validation and size limits

## 📈 Performance Optimizations

- Database query optimization with indexes
- Flask-Caching for frequently accessed data
- React Query for efficient data fetching
- Lazy loading for large datasets
- WebSocket for real-time updates without polling

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Ensure SQLite file permissions
   - Check database URL configuration

2. **Redis Connection Error**
   - Verify Redis server is running
   - Check Redis connection settings

3. **WebSocket Connection Failed**
   - Ensure Flask-SocketIO is properly configured
   - Check CORS settings

4. **Frontend Build Errors**
   - Clear node_modules and reinstall
   - Check Node.js version compatibility

## 📝 Development Notes

- All database models include proper relationships and constraints
- API endpoints follow RESTful conventions
- Frontend components are reusable and well-documented
- Real-time features use WebSocket for optimal performance
- Background tasks are handled by Celery for scalability

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Check the troubleshooting section
- Review the API documentation
- Open an issue on GitHub

---

**Medical CRM System** - Streamlining clinic operations with modern technology.
