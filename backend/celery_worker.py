#!/usr/bin/env python3
"""
Celery Worker for Medical CRM
Run this file to start the Celery worker for background tasks
"""

import os
from app import create_app
from app.tasks.notifications import celery

# Create Flask app context
app = create_app()

if __name__ == '__main__':
    # Start Celery worker
    celery.start()
