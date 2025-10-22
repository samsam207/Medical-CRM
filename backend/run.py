#!/usr/bin/env python3
"""
Medical CRM Development Server
Run this file to start the Flask development server with SocketIO support
"""

import os
from app import create_app, socketio

# Create Flask app
app = create_app()

if __name__ == '__main__':
    # Get configuration from environment
    debug = os.environ.get('FLASK_DEBUG', 'True').lower() == 'true'
    host = os.environ.get('FLASK_HOST', '0.0.0.0')
    port = int(os.environ.get('FLASK_PORT', 5000))
    
    print(f"Starting Medical CRM server on {host}:{port}")
    print(f"Debug mode: {debug}")
    print("SocketIO enabled for real-time updates")
    
    # Run with SocketIO support
    socketio.run(
        app,
        host=host,
        port=port,
        debug=debug,
        allow_unsafe_werkzeug=True  # For development only
    )
