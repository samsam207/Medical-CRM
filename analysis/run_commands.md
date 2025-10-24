# Server Start Commands

## Backend Server
```bash
cd backend
.\venv\Scripts\activate
python run.py
```
- **Port**: 5000
- **Features**: Flask app with SocketIO support
- **Debug Mode**: Enabled (configurable via FLASK_DEBUG env var)

## Frontend Server
```bash
cd frontend
npm run dev
```
- **Port**: 3000 (Vite default)
- **Features**: React development server with hot reload
- **Build Tool**: Vite

## Server Status Check
```bash
# Check if backend is running
netstat -an | findstr ":5000"

# Check if frontend is running  
netstat -an | findstr ":3000"
```

## Access URLs
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000/api
- **SocketIO**: ws://localhost:5000/socket.io/

## Default Credentials (from seed data)
- **Admin**: admin / admin123
- **Receptionist**: reception / reception123
- **Doctor**: doctor / doctor123

---
**Status**: Server start commands documented
