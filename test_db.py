#!/usr/bin/env python3
import sys
import os
sys.path.append('backend')

from backend.app import create_app, db
from backend.app.models.user import User

app = create_app()
with app.app_context():
    # Check if users exist
    users = User.query.all()
    print(f"Found {len(users)} users in database:")
    for user in users:
        print(f"  - {user.username} (role: {user.role})")
    
    # Try to create a test user if none exist
    if len(users) == 0:
        print("No users found, creating test user...")
        test_user = User(username='test_reception', role='receptionist')
        test_user.set_password('test123')
        db.session.add(test_user)
        db.session.commit()
        print("Test user created: test_reception / test123")
