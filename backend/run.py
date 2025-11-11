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
    
    # Check if port is available
    import socket
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        sock.bind((host, port))
        sock.close()
    except OSError:
        print(f"ERROR: Port {port} is already in use!")
        print(f"Please stop the process using port {port} or set FLASK_PORT to a different port.")
        print("You can find the process using: netstat -ano | findstr :5000")
        exit(1)
    
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
