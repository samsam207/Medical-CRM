"""
Health check endpoints for monitoring and load balancing
"""
from flask import Blueprint, jsonify
from app import db
import psutil
import os
from datetime import datetime

health_bp = Blueprint('health', __name__)

@health_bp.route('/health', methods=['GET'])
def health_check():
    """Basic health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.utcnow().isoformat(),
        'service': 'medical-crm-api'
    }), 200

@health_bp.route('/health/detailed', methods=['GET'])
def detailed_health_check():
    """Detailed health check with system metrics"""
    try:
        # Database connectivity check
        db.session.execute('SELECT 1')
        db_status = 'healthy'
    except Exception as e:
        db_status = f'unhealthy: {str(e)}'
    
    # System metrics
    cpu_percent = psutil.cpu_percent(interval=1)
    memory = psutil.virtual_memory()
    disk = psutil.disk_usage('/')
    
    return jsonify({
        'status': 'healthy' if db_status == 'healthy' else 'unhealthy',
        'timestamp': datetime.utcnow().isoformat(),
        'service': 'medical-crm-api',
        'version': '1.0.0',
        'database': db_status,
        'system': {
            'cpu_percent': cpu_percent,
            'memory_percent': memory.percent,
            'disk_percent': disk.percent,
            'uptime': os.getpid()
        }
    }), 200 if db_status == 'healthy' else 503

@health_bp.route('/health/ready', methods=['GET'])
def readiness_check():
    """Readiness check for Kubernetes"""
    try:
        # Check database connectivity
        db.session.execute('SELECT 1')
        return jsonify({'status': 'ready'}), 200
    except Exception as e:
        return jsonify({
            'status': 'not ready',
            'error': str(e)
        }), 503

@health_bp.route('/health/live', methods=['GET'])
def liveness_check():
    """Liveness check for Kubernetes"""
    return jsonify({'status': 'alive'}), 200
