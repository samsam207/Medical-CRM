"""
Logging configuration for the Medical CRM application
"""
import os
import logging
from logging.handlers import RotatingFileHandler
from datetime import datetime

def setup_logging(app):
    """Setup logging configuration"""
    
    # Create logs directory if it doesn't exist
    if not os.path.exists('logs'):
        os.mkdir('logs')
    
    # Set log level
    log_level = app.config.get('LOG_LEVEL', 'INFO')
    app.logger.setLevel(getattr(logging, log_level.upper()))
    
    # Don't add handler if already exists (prevents duplicate logs)
    if not app.logger.handlers:
        # File handler with rotation
        file_handler = RotatingFileHandler(
            app.config.get('LOG_FILE', 'logs/app.log'),
            maxBytes=10240000,  # 10MB
            backupCount=10
        )
        file_handler.setFormatter(logging.Formatter(
            '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
        ))
        file_handler.setLevel(getattr(logging, log_level.upper()))
        app.logger.addHandler(file_handler)
        
        # Console handler
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(logging.Formatter(
            '%(asctime)s %(levelname)s: %(message)s'
        ))
        console_handler.setLevel(getattr(logging, log_level.upper()))
        app.logger.addHandler(console_handler)
    
    # Set SQLAlchemy logging
    if app.config.get('SQLALCHEMY_RECORD_QUERIES', False):
        logging.getLogger('sqlalchemy.engine').setLevel(logging.INFO)
    
    app.logger.info('Medical CRM application started')
    app.logger.info(f'Environment: {app.config.get("FLASK_ENV", "development")}')
    app.logger.info(f'Debug mode: {app.config.get("DEBUG", False)}')
