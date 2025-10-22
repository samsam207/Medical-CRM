# 🏥 Medical CRM Production Setup Guide

This guide provides comprehensive instructions for deploying the Medical CRM system to production.

## 📋 Prerequisites

### System Requirements
- **OS**: Linux (Ubuntu 20.04+ recommended) or Windows Server
- **RAM**: Minimum 4GB, Recommended 8GB+
- **CPU**: 2+ cores
- **Storage**: 20GB+ available space
- **Network**: Stable internet connection

### Software Requirements
- **Docker**: 20.10+
- **Docker Compose**: 2.0+
- **Git**: For code deployment
- **PostgreSQL**: 13+ (if not using Docker)
- **Redis**: 6+ (if not using Docker)

## 🚀 Quick Start (Docker)

### 1. Clone and Setup
```bash
git clone <your-repo-url>
cd medical-crm
chmod +x deploy.sh
```

### 2. Configure Environment
```bash
cp backend/env.example .env
# Edit .env with your production values
nano .env
```

**Required Environment Variables:**
```env
# Security (REQUIRED)
SECRET_KEY=your-super-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-key-here

# Database
DATABASE_URL=postgresql://medical_crm_user:medical_crm_password@db:5432/medical_crm

# Redis
REDIS_URL=redis://redis:6379/0
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/0

# CORS (REQUIRED)
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# SMS (Optional)
SMS_API_KEY=your-sms-provider-api-key
SMS_SENDER_ID=MEDCRM
```

### 3. Deploy
```bash
./deploy.sh
```

## 🔧 Manual Setup (Non-Docker)

### 1. Database Setup (PostgreSQL)

```bash
# Install PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Create database and user
sudo -u postgres psql
CREATE DATABASE medical_crm;
CREATE USER medical_crm_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE medical_crm TO medical_crm_user;
\q
```

### 2. Redis Setup

```bash
# Install Redis
sudo apt install redis-server

# Start Redis
sudo systemctl start redis
sudo systemctl enable redis
```

### 3. Backend Setup

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables
export FLASK_ENV=production
export DATABASE_URL=postgresql://medical_crm_user:password@localhost/medical_crm
export REDIS_URL=redis://localhost:6379/0
export SECRET_KEY=your-secret-key
export JWT_SECRET_KEY=your-jwt-secret-key
export ALLOWED_ORIGINS=https://yourdomain.com

# Run migrations
flask db upgrade

# Seed database
python seed.py

# Start with Gunicorn
gunicorn --bind 0.0.0.0:5000 --workers 4 run:app
```

### 4. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Build for production
npm run build

# Serve with nginx or similar
# Copy dist/ contents to your web server
```

## 🔒 Security Configuration

### 1. Environment Security
- Use strong, unique secrets for `SECRET_KEY` and `JWT_SECRET_KEY`
- Never commit `.env` files to version control
- Use environment-specific configurations
- Regularly rotate secrets

### 2. Database Security
- Use strong passwords
- Enable SSL connections
- Restrict database access to application servers only
- Regular backups

### 3. Network Security
- Use HTTPS in production
- Configure proper CORS origins
- Implement rate limiting
- Use a reverse proxy (nginx)

### 4. Application Security
- Keep dependencies updated
- Use security headers
- Implement proper logging
- Regular security audits

## 📊 Monitoring and Logging

### 1. Health Checks
- **Basic**: `GET /api/health`
- **Detailed**: `GET /api/health/detailed`
- **Readiness**: `GET /api/health/ready`
- **Liveness**: `GET /api/health/live`

### 2. Logging
- Application logs: `backend/logs/app.log`
- Rotating logs (10MB max, 10 backups)
- Structured logging with timestamps
- Error tracking and alerting

### 3. Performance Monitoring
- Response time monitoring
- Database query performance
- Memory and CPU usage
- Request rate monitoring

## 🧪 Load Testing

### Run Load Tests
```bash
python load_test.py
```

### Test Scenarios
- Dashboard load test (5 concurrent users, 30s)
- API endpoints load test (10 concurrent users, 30s)
- Health check stress test (20 concurrent users, 60s)

### Performance Benchmarks
- **Response Time**: < 200ms average
- **Throughput**: > 100 requests/second
- **Success Rate**: > 99%
- **Concurrent Users**: 50+ supported

## 🔄 Backup and Recovery

### 1. Database Backups
```bash
# Create backup
pg_dump -h localhost -U medical_crm_user medical_crm > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
psql -h localhost -U medical_crm_user medical_crm < backup_file.sql
```

### 2. Application Backups
- Code repository (Git)
- Uploaded files (`uploads/` directory)
- Configuration files
- Log files

### 3. Automated Backups
```bash
# Add to crontab
0 2 * * * /path/to/backup_script.sh
```

## 🚀 Deployment Strategies

### 1. Blue-Green Deployment
- Maintain two identical production environments
- Switch traffic between environments
- Zero-downtime deployments

### 2. Rolling Deployment
- Update instances one by one
- Gradual traffic migration
- Minimal downtime

### 3. Canary Deployment
- Deploy to small percentage of users
- Monitor metrics and feedback
- Gradual rollout

## 📈 Scaling

### 1. Horizontal Scaling
- Multiple application instances
- Load balancer (nginx/HAProxy)
- Database read replicas
- Redis clustering

### 2. Vertical Scaling
- Increase server resources
- Optimize database queries
- Implement caching strategies
- CDN for static assets

### 3. Database Optimization
- Proper indexing
- Query optimization
- Connection pooling
- Read replicas

## 🔧 Maintenance

### 1. Regular Tasks
- Security updates
- Dependency updates
- Log rotation
- Database maintenance
- Performance monitoring

### 2. Monitoring Alerts
- High error rates
- Slow response times
- High memory usage
- Database connection issues
- Disk space warnings

### 3. Health Checks
- Automated health monitoring
- Alert notifications
- Incident response procedures
- Recovery procedures

## 🆘 Troubleshooting

### Common Issues

#### 1. Database Connection Issues
```bash
# Check database status
sudo systemctl status postgresql

# Check connections
sudo -u postgres psql -c "SELECT * FROM pg_stat_activity;"
```

#### 2. Redis Connection Issues
```bash
# Check Redis status
sudo systemctl status redis

# Test Redis connection
redis-cli ping
```

#### 3. Application Issues
```bash
# Check application logs
tail -f backend/logs/app.log

# Check Docker logs
docker-compose logs backend
```

#### 4. Performance Issues
- Check database query performance
- Monitor memory usage
- Review application logs
- Run load tests

## 📞 Support

### Documentation
- API Documentation: `/api/docs` (if implemented)
- Database Schema: `backend/app/models/`
- Configuration: `backend/config.py`

### Monitoring
- Health checks: `http://yourdomain.com/api/health`
- Metrics: Application logs and system metrics
- Alerts: Configure based on your monitoring setup

### Contact
- Technical Support: [Your support contact]
- Documentation: [Your docs URL]
- Issues: [Your issue tracker]

---

## ✅ Production Checklist

- [ ] Environment variables configured
- [ ] Database setup and migrated
- [ ] Redis configured and running
- [ ] SSL certificates installed
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Logging configured
- [ ] Health checks working
- [ ] Load testing completed
- [ ] Backup strategy implemented
- [ ] Monitoring configured
- [ ] Security measures in place
- [ ] Performance optimized
- [ ] Documentation updated

**🎉 Your Medical CRM system is now production-ready!**
