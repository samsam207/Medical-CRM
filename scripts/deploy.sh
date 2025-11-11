#!/bin/bash

# Medical CRM Production Deployment Script
# This script sets up the production environment

set -e

echo "🏥 Medical CRM Production Deployment"
echo "===================================="

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create environment file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating environment file..."
    cp backend/env.example .env
    echo "⚠️  Please edit .env file with your production values before continuing."
    echo "   Required variables:"
    echo "   - SECRET_KEY"
    echo "   - JWT_SECRET_KEY"
    echo "   - SMS_API_KEY"
    echo "   - ALLOWED_ORIGINS"
    read -p "Press Enter after updating .env file..."
fi

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p backend/logs
mkdir -p backend/uploads
mkdir -p postgres_data
mkdir -p redis_data

# Set permissions
chmod 755 backend/logs
chmod 755 backend/uploads

# Build and start services
echo "🔨 Building and starting services..."
docker-compose down --remove-orphans
docker-compose build --no-cache
docker-compose up -d

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 30

# Check if services are running
echo "🔍 Checking service health..."

# Check database
if docker-compose exec -T db pg_isready -U medical_crm_user -d medical_crm; then
    echo "✅ Database is ready"
else
    echo "❌ Database is not ready"
    exit 1
fi

# Check Redis
if docker-compose exec -T redis redis-cli ping | grep -q PONG; then
    echo "✅ Redis is ready"
else
    echo "❌ Redis is not ready"
    exit 1
fi

# Check backend API
if curl -f http://localhost:5000/api/health > /dev/null 2>&1; then
    echo "✅ Backend API is ready"
else
    echo "❌ Backend API is not ready"
    exit 1
fi

# Check frontend
if curl -f http://localhost:3000 > /dev/null 2>&1; then
    echo "✅ Frontend is ready"
else
    echo "❌ Frontend is not ready"
    exit 1
fi

# Run database migrations
echo "🗄️  Running database migrations..."
docker-compose exec backend flask db upgrade

# Seed database with initial data
echo "🌱 Seeding database..."
docker-compose exec backend python seed.py

echo ""
echo "🎉 Deployment completed successfully!"
echo ""
echo "📊 Service URLs:"
echo "   Frontend: http://localhost:3000"
echo "   Backend API: http://localhost:5000"
echo "   Health Check: http://localhost:5000/api/health"
echo ""
echo "🔧 Management Commands:"
echo "   View logs: docker-compose logs -f"
echo "   Stop services: docker-compose down"
echo "   Restart services: docker-compose restart"
echo "   Update services: docker-compose pull && docker-compose up -d"
echo ""
echo "📈 Monitoring:"
echo "   Database: docker-compose exec db psql -U medical_crm_user -d medical_crm"
echo "   Redis: docker-compose exec redis redis-cli"
echo "   Backend logs: docker-compose logs backend"
echo ""
