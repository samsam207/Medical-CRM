from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_jwt_extended import JWTManager
from flask_socketio import SocketIO
from flask_cors import CORS
from flask_caching import Cache
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import os
from datetime import timedelta
from config import config

# Initialize extensions
db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
socketio = SocketIO()
cache = Cache()
limiter = Limiter(key_func=get_remote_address)

def create_app(config_name=None):
    app = Flask(__name__)
    
    # Configuration
    if config_name is None:
        config_name = os.environ.get('FLASK_ENV', 'development')
    
    # Load configuration
    app.config.from_object(config[config_name])
    
    # JWT Configuration with security validation
    jwt_secret = os.environ.get('JWT_SECRET_KEY')
    if config_name == 'production' and not jwt_secret:
        raise ValueError("JWT_SECRET_KEY must be set in production environment!")
    # Use the JWT secret from config if not set in environment
    if not jwt_secret:
        jwt_secret = app.config.get('JWT_SECRET_KEY')
    app.config['JWT_SECRET_KEY'] = jwt_secret
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=8)
    app.config['JWT_REFRESH_TOKEN_EXPIRES'] = timedelta(days=30)
    app.config['JWT_BLACKLIST_ENABLED'] = True
    app.config['JWT_BLACKLIST_TOKEN_CHECKS'] = ['access', 'refresh']
    
    # Setup logging
    from logging_config import setup_logging
    setup_logging(app)
    
    # Cache configuration
    app.config['CACHE_TYPE'] = 'SimpleCache'  # Use simple cache instead of Redis for development
    app.config['CACHE_DEFAULT_TIMEOUT'] = 300
    
    # File upload configuration
    app.config['UPLOAD_FOLDER'] = app.config.get('UPLOAD_FOLDER', 'uploads')
    app.config['MAX_CONTENT_LENGTH'] = app.config.get('MAX_CONTENT_LENGTH', 16 * 1024 * 1024)  # 16MB max file size
    app.config['ALLOWED_EXTENSIONS'] = {'png', 'jpg', 'jpeg', 'pdf'}
    
    # Initialize extensions with app
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    socketio.init_app(app, async_mode='eventlet', cors_allowed_origins=app.config.get('ALLOWED_ORIGINS', ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:5173']))
    cache.init_app(app)
    limiter.init_app(app)
    
    # CORS Configuration with security
    allowed_origins = os.environ.get('ALLOWED_ORIGINS', 'http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:5173').split(',')
    CORS(app, origins=allowed_origins, supports_credentials=True)
    
    # Import models to register them with SQLAlchemy
    from app.models import user, clinic, doctor, patient, service, appointment, visit, prescription, payment, notification, audit_log
    
    # Register blueprints
    from app.routes.auth import auth_bp
    from app.routes.appointments import appointments_bp
    from app.routes.visits import visits_bp
    from app.routes.patients import patients_bp
    from app.routes.payments import payments_bp
    from app.routes.dashboard import dashboard_bp
    from app.routes.doctors import doctors_bp
    from app.routes.clinics import clinics_bp
    from app.routes.reports import reports_bp
    from app.routes.prescriptions import prescriptions_bp
    from app.routes.health import health_bp
    from app.routes.queue import queue_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(appointments_bp, url_prefix='/api/appointments')
    app.register_blueprint(visits_bp, url_prefix='/api/visits')
    app.register_blueprint(patients_bp, url_prefix='/api/patients')
    app.register_blueprint(payments_bp, url_prefix='/api/payments')
    app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
    app.register_blueprint(doctors_bp, url_prefix='/api/doctors')
    app.register_blueprint(clinics_bp, url_prefix='/api/clinics')
    app.register_blueprint(reports_bp, url_prefix='/api/reports')
    app.register_blueprint(prescriptions_bp, url_prefix='/api/prescriptions')
    app.register_blueprint(queue_bp, url_prefix='/api/queue')
    app.register_blueprint(health_bp, url_prefix='/api')
    
    # Import and register socketio handlers
    from app.socketio_handlers import queue_events
    
    # JWT error handlers
    @jwt.token_in_blocklist_loader
    def check_if_token_revoked(jwt_header, jwt_payload):
        from app.models.user import TokenBlocklist
        jti = jwt_payload['jti']
        token = db.session.query(TokenBlocklist.id).filter_by(jti=jti).scalar()
        return token is not None
    
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return {'message': 'Token has expired'}, 401
    
    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return {'message': 'Invalid token'}, 401
    
    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return {'message': 'Authorization token is required'}, 401
    
    # Global error handlers
    @app.errorhandler(400)
    def bad_request(error):
        return {'message': 'Bad request', 'error': str(error)}, 400

    @app.errorhandler(401)
    def unauthorized(error):
        return {'message': 'Unauthorized access'}, 401

    @app.errorhandler(403)
    def forbidden(error):
        return {'message': 'Forbidden access'}, 403

    @app.errorhandler(404)
    def not_found(error):
        return {'message': 'Resource not found'}, 404

    @app.errorhandler(422)
    def unprocessable_entity(error):
        return {'message': 'Unprocessable entity', 'error': str(error)}, 422

    @app.errorhandler(500)
    def internal_error(error):
        db.session.rollback()
        return {'message': 'Internal server error'}, 500

    @app.errorhandler(Exception)
    def handle_exception(e):
        db.session.rollback()
        import traceback
        traceback.print_exc()
        app.logger.error(f'Unhandled exception: {str(e)}')
        return {'message': f'An unexpected error occurred: {str(e)}'}, 500
    
    # Create upload directory
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    os.makedirs(os.path.join(app.config['UPLOAD_FOLDER'], 'prescriptions'), exist_ok=True)
    
    return app
