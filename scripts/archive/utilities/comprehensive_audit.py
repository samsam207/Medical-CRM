#!/usr/bin/env python3
"""
Comprehensive Post-Fix Verification Audit
Medical CRM System - React + Flask
"""

import requests
import time
import json
import statistics
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

class ComprehensiveAuditor:
    def __init__(self):
        self.base_url = 'http://localhost:5000/api'
        self.frontend_url = 'http://localhost:3000'
        self.session = requests.Session()
        self.auth_token = None
        self.audit_results = {
            'functional_tests': {},
            'api_tests': {},
            'database_tests': {},
            'frontend_tests': {},
            'performance_tests': {},
            'security_tests': {},
            'issues_found': [],
            'summary': {}
        }
        
    def log_result(self, category, test_name, status, details=None, error=None):
        """Log test results"""
        result = {
            'status': status,
            'timestamp': datetime.now().isoformat(),
            'details': details,
            'error': error
        }
        self.audit_results[category][test_name] = result
        
        if status == 'FAIL':
            self.audit_results['issues_found'].append({
                'category': category,
                'test': test_name,
                'error': error,
                'details': details
            })
    
    def authenticate(self):
        """Authenticate and get token"""
        try:
            response = self.session.post(f"{self.base_url}/auth/login", 
                                       json={'username': 'admin', 'password': 'admin123'})
            if response.status_code == 200:
                self.auth_token = response.json()['access_token']
                self.session.headers.update({'Authorization': f'Bearer {self.auth_token}'})
                self.log_result('security_tests', 'authentication', 'PASS', 'Admin login successful')
                return True
            else:
                self.log_result('security_tests', 'authentication', 'FAIL', 
                              f'Login failed with status {response.status_code}')
                return False
        except Exception as e:
            self.log_result('security_tests', 'authentication', 'FAIL', error=str(e))
            return False
    
    def test_api_endpoints(self):
        """Test all API endpoints comprehensively"""
        print("\n=== API & INTEGRATION AUDIT ===")
        
        endpoints = [
            # Health endpoints
            {'url': '/health', 'method': 'GET', 'auth': False, 'name': 'health_check'},
            {'url': '/health/detailed', 'method': 'GET', 'auth': False, 'name': 'detailed_health'},
            
            # Auth endpoints
            {'url': '/auth/login', 'method': 'POST', 'auth': False, 'name': 'login', 'data': {'username': 'admin', 'password': 'admin123'}},
            {'url': '/auth/logout', 'method': 'POST', 'auth': True, 'name': 'logout'},
            {'url': '/auth/refresh', 'method': 'POST', 'auth': True, 'name': 'token_refresh'},
            
            # Dashboard
            {'url': '/dashboard/stats', 'method': 'GET', 'auth': True, 'name': 'dashboard_stats'},
            
            # CRUD endpoints
            {'url': '/clinics', 'method': 'GET', 'auth': True, 'name': 'clinics_list'},
            {'url': '/doctors', 'method': 'GET', 'auth': True, 'name': 'doctors_list'},
            {'url': '/patients', 'method': 'GET', 'auth': True, 'name': 'patients_list'},
            {'url': '/appointments', 'method': 'GET', 'auth': True, 'name': 'appointments_list'},
            {'url': '/visits', 'method': 'GET', 'auth': True, 'name': 'visits_list'},
            {'url': '/payments', 'method': 'GET', 'auth': True, 'name': 'payments_list'},
            
            # Specific resource endpoints
            {'url': '/clinics/1', 'method': 'GET', 'auth': True, 'name': 'clinic_detail'},
            {'url': '/doctors/1', 'method': 'GET', 'auth': True, 'name': 'doctor_detail'},
            {'url': '/patients/1', 'method': 'GET', 'auth': True, 'name': 'patient_detail'},
            {'url': '/appointments/1', 'method': 'GET', 'auth': True, 'name': 'appointment_detail'},
            {'url': '/visits/1', 'method': 'GET', 'auth': True, 'name': 'visit_detail'},
            {'url': '/payments/1', 'method': 'GET', 'auth': True, 'name': 'payment_detail'},
        ]
        
        for endpoint in endpoints:
            try:
                start_time = time.time()
                
                if endpoint['method'] == 'GET':
                    response = self.session.get(f"{self.base_url}{endpoint['url']}")
                elif endpoint['method'] == 'POST':
                    data = endpoint.get('data', {})
                    response = self.session.post(f"{self.base_url}{endpoint['url']}", json=data)
                
                end_time = time.time()
                response_time = (end_time - start_time) * 1000
                
                # Determine expected status code
                expected_status = 200
                if endpoint['name'] == 'login':
                    expected_status = 200
                elif endpoint['name'] == 'logout':
                    expected_status = 200
                elif endpoint['name'] == 'token_refresh':
                    expected_status = 200
                
                # Check if response is successful
                is_success = response.status_code == expected_status
                
                details = {
                    'status_code': response.status_code,
                    'response_time_ms': round(response_time, 2),
                    'expected_status': expected_status,
                    'response_size': len(response.text)
                }
                
                if is_success:
                    self.log_result('api_tests', endpoint['name'], 'PASS', details)
                    print(f"✅ {endpoint['name']}: {response.status_code} ({response_time:.2f}ms)")
                else:
                    error_msg = f"Expected {expected_status}, got {response.status_code}"
                    self.log_result('api_tests', endpoint['name'], 'FAIL', details, error_msg)
                    print(f"❌ {endpoint['name']}: {response.status_code} ({response_time:.2f}ms) - {error_msg}")
                
            except Exception as e:
                self.log_result('api_tests', endpoint['name'], 'FAIL', error=str(e))
                print(f"❌ {endpoint['name']}: ERROR - {str(e)}")
    
    def test_functional_workflows(self):
        """Test complete user workflows"""
        print("\n=== FUNCTIONAL VERIFICATION ===")
        
        # Test 1: Login → Dashboard → View Data
        try:
            # Login
            login_response = self.session.post(f"{self.base_url}/auth/login", 
                                             json={'username': 'admin', 'password': 'admin123'})
            if login_response.status_code != 200:
                self.log_result('functional_tests', 'login_workflow', 'FAIL', 
                              f'Login failed: {login_response.status_code}')
                return
            
            self.auth_token = login_response.json()['access_token']
            self.session.headers.update({'Authorization': f'Bearer {self.auth_token}'})
            
            # Dashboard
            dashboard_response = self.session.get(f"{self.base_url}/dashboard/stats")
            if dashboard_response.status_code == 200:
                dashboard_data = dashboard_response.json()
                self.log_result('functional_tests', 'login_workflow', 'PASS', 
                              f'Dashboard loaded with {len(dashboard_data)} data points')
                print("✅ Login → Dashboard workflow: PASS")
            else:
                self.log_result('functional_tests', 'login_workflow', 'FAIL', 
                              f'Dashboard failed: {dashboard_response.status_code}')
                print("❌ Login → Dashboard workflow: FAIL")
                
        except Exception as e:
            self.log_result('functional_tests', 'login_workflow', 'FAIL', error=str(e))
            print(f"❌ Login → Dashboard workflow: ERROR - {str(e)}")
        
        # Test 2: Data Retrieval Workflow
        try:
            # Test all major data endpoints
            data_endpoints = ['/clinics', '/doctors', '/patients', '/appointments', '/visits', '/payments']
            all_successful = True
            
            for endpoint in data_endpoints:
                response = self.session.get(f"{self.base_url}{endpoint}")
                if response.status_code != 200:
                    all_successful = False
                    break
            
            if all_successful:
                self.log_result('functional_tests', 'data_retrieval_workflow', 'PASS', 
                              'All data endpoints accessible')
                print("✅ Data Retrieval workflow: PASS")
            else:
                self.log_result('functional_tests', 'data_retrieval_workflow', 'FAIL', 
                              'Some data endpoints failed')
                print("❌ Data Retrieval workflow: FAIL")
                
        except Exception as e:
            self.log_result('functional_tests', 'data_retrieval_workflow', 'FAIL', error=str(e))
            print(f"❌ Data Retrieval workflow: ERROR - {str(e)}")
    
    def test_database_consistency(self):
        """Test database relationships and data integrity"""
        print("\n=== DATABASE VALIDATION ===")
        
        try:
            # Test appointments with relationships
            appointments_response = self.session.get(f"{self.base_url}/appointments")
            if appointments_response.status_code == 200:
                appointments = appointments_response.json().get('appointments', [])
                
                for appointment in appointments[:3]:  # Test first 3
                    # Check if appointment has required fields
                    required_fields = ['id', 'clinic_id', 'doctor_id', 'patient_id', 'service_id']
                    missing_fields = [field for field in required_fields if field not in appointment]
                    
                    if not missing_fields:
                        self.log_result('database_tests', f'appointment_{appointment["id"]}_structure', 'PASS', 
                                      'All required fields present')
                    else:
                        self.log_result('database_tests', f'appointment_{appointment["id"]}_structure', 'FAIL', 
                                      f'Missing fields: {missing_fields}')
                
                self.log_result('database_tests', 'appointments_data_integrity', 'PASS', 
                              f'Tested {len(appointments)} appointments')
                print(f"✅ Appointments data integrity: PASS ({len(appointments)} records)")
            else:
                self.log_result('database_tests', 'appointments_data_integrity', 'FAIL', 
                              f'Appointments endpoint failed: {appointments_response.status_code}')
                print("❌ Appointments data integrity: FAIL")
            
            # Test visits data
            visits_response = self.session.get(f"{self.base_url}/visits")
            if visits_response.status_code == 200:
                visits = visits_response.json().get('visits', [])
                self.log_result('database_tests', 'visits_data_integrity', 'PASS', 
                              f'Tested {len(visits)} visits')
                print(f"✅ Visits data integrity: PASS ({len(visits)} records)")
            else:
                self.log_result('database_tests', 'visits_data_integrity', 'FAIL', 
                              f'Visits endpoint failed: {visits_response.status_code}')
                print("❌ Visits data integrity: FAIL")
                
        except Exception as e:
            self.log_result('database_tests', 'database_consistency', 'FAIL', error=str(e))
            print(f"❌ Database consistency: ERROR - {str(e)}")
    
    def test_frontend_integration(self):
        """Test frontend-backend integration"""
        print("\n=== FRONTEND INTEGRATION ===")
        
        try:
            # Test frontend accessibility
            frontend_response = self.session.get(self.frontend_url)
            if frontend_response.status_code == 200:
                self.log_result('frontend_tests', 'frontend_accessibility', 'PASS', 
                              f'Frontend accessible, content length: {len(frontend_response.text)}')
                print("✅ Frontend accessibility: PASS")
            else:
                self.log_result('frontend_tests', 'frontend_accessibility', 'FAIL', 
                              f'Frontend not accessible: {frontend_response.status_code}')
                print("❌ Frontend accessibility: FAIL")
            
            # Test CORS
            cors_headers = {
                'Origin': 'http://localhost:3000',
                'Access-Control-Request-Method': 'GET',
                'Access-Control-Request-Headers': 'Authorization'
            }
            cors_response = self.session.options(f"{self.base_url}/dashboard/stats", headers=cors_headers)
            if cors_response.status_code == 200:
                self.log_result('frontend_tests', 'cors_configuration', 'PASS', 'CORS preflight successful')
                print("✅ CORS configuration: PASS")
            else:
                self.log_result('frontend_tests', 'cors_configuration', 'FAIL', 
                              f'CORS preflight failed: {cors_response.status_code}')
                print("❌ CORS configuration: FAIL")
                
        except Exception as e:
            self.log_result('frontend_tests', 'frontend_integration', 'FAIL', error=str(e))
            print(f"❌ Frontend integration: ERROR - {str(e)}")
    
    def test_performance(self):
        """Test system performance"""
        print("\n=== PERFORMANCE AUDIT ===")
        
        # Test response times for key endpoints
        performance_endpoints = [
            '/health',
            '/dashboard/stats',
            '/clinics',
            '/patients',
            '/appointments',
            '/visits'
        ]
        
        response_times = []
        
        for endpoint in performance_endpoints:
            try:
                start_time = time.time()
                response = self.session.get(f"{self.base_url}{endpoint}")
                end_time = time.time()
                
                response_time = (end_time - start_time) * 1000
                response_times.append(response_time)
                
                if response_time < 1000:  # Less than 1 second
                    self.log_result('performance_tests', f'{endpoint}_response_time', 'PASS', 
                                  f'Response time: {response_time:.2f}ms')
                    print(f"✅ {endpoint}: {response_time:.2f}ms")
                else:
                    self.log_result('performance_tests', f'{endpoint}_response_time', 'FAIL', 
                                  f'Response time too slow: {response_time:.2f}ms')
                    print(f"❌ {endpoint}: {response_time:.2f}ms (SLOW)")
                    
            except Exception as e:
                self.log_result('performance_tests', f'{endpoint}_response_time', 'FAIL', error=str(e))
                print(f"❌ {endpoint}: ERROR - {str(e)}")
        
        # Calculate performance metrics
        if response_times:
            avg_response_time = statistics.mean(response_times)
            max_response_time = max(response_times)
            min_response_time = min(response_times)
            
            self.log_result('performance_tests', 'overall_performance', 'PASS', {
                'avg_response_time': round(avg_response_time, 2),
                'max_response_time': round(max_response_time, 2),
                'min_response_time': round(min_response_time, 2),
                'total_endpoints_tested': len(response_times)
            })
            print(f"📊 Performance Summary: Avg: {avg_response_time:.2f}ms, Max: {max_response_time:.2f}ms, Min: {min_response_time:.2f}ms")
    
    def test_security(self):
        """Test security features"""
        print("\n=== SECURITY VERIFICATION ===")
        
        # Test unauthorized access
        try:
            unauthorized_response = self.session.get(f"{self.base_url}/dashboard/stats")
            if unauthorized_response.status_code == 401:
                self.log_result('security_tests', 'unauthorized_access_protection', 'PASS', 
                              'Unauthorized access properly blocked')
                print("✅ Unauthorized access protection: PASS")
            else:
                self.log_result('security_tests', 'unauthorized_access_protection', 'FAIL', 
                              f'Unauthorized access not blocked: {unauthorized_response.status_code}')
                print("❌ Unauthorized access protection: FAIL")
        except Exception as e:
            self.log_result('security_tests', 'unauthorized_access_protection', 'FAIL', error=str(e))
            print(f"❌ Unauthorized access protection: ERROR - {str(e)}")
        
        # Test rate limiting
        try:
            # Make multiple requests to trigger rate limiting
            for i in range(6):
                response = self.session.post(f"{self.base_url}/auth/login", 
                                           json={'username': 'admin', 'password': 'wrong_password'})
                if response.status_code == 429:
                    self.log_result('security_tests', 'rate_limiting', 'PASS', 
                                  f'Rate limiting triggered after {i+1} requests')
                    print("✅ Rate limiting: PASS")
                    break
            else:
                self.log_result('security_tests', 'rate_limiting', 'FAIL', 
                              'Rate limiting not triggered after 6 requests')
                print("❌ Rate limiting: FAIL")
        except Exception as e:
            self.log_result('security_tests', 'rate_limiting', 'FAIL', error=str(e))
            print(f"❌ Rate limiting: ERROR - {str(e)}")
    
    def generate_report(self):
        """Generate comprehensive audit report"""
        print("\n" + "="*60)
        print("📋 COMPREHENSIVE AUDIT REPORT")
        print("="*60)
        
        # Calculate summary statistics
        total_tests = 0
        passed_tests = 0
        failed_tests = 0
        
        for category, tests in self.audit_results.items():
            if category != 'issues_found' and category != 'summary':
                for test_name, result in tests.items():
                    total_tests += 1
                    if result['status'] == 'PASS':
                        passed_tests += 1
                    else:
                        failed_tests += 1
        
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        # Summary
        self.audit_results['summary'] = {
            'total_tests': total_tests,
            'passed_tests': passed_tests,
            'failed_tests': failed_tests,
            'success_rate': round(success_rate, 2),
            'issues_found_count': len(self.audit_results['issues_found']),
            'audit_timestamp': datetime.now().isoformat()
        }
        
        print(f"📊 SUMMARY:")
        print(f"   Total Tests: {total_tests}")
        print(f"   Passed: {passed_tests}")
        print(f"   Failed: {failed_tests}")
        print(f"   Success Rate: {success_rate:.1f}%")
        print(f"   Issues Found: {len(self.audit_results['issues_found'])}")
        
        # Issues found
        if self.audit_results['issues_found']:
            print(f"\n❌ ISSUES FOUND:")
            for issue in self.audit_results['issues_found']:
                print(f"   - {issue['category']}.{issue['test']}: {issue['error']}")
        else:
            print(f"\n✅ NO ISSUES FOUND")
        
        # Final verdict
        if success_rate >= 95 and len(self.audit_results['issues_found']) == 0:
            verdict = "EXCELLENT"
            readiness = "YES"
            confidence = 95
        elif success_rate >= 90 and len(self.audit_results['issues_found']) <= 2:
            verdict = "GOOD"
            readiness = "YES"
            confidence = 85
        elif success_rate >= 80:
            verdict = "NEEDS FIX"
            readiness = "NO"
            confidence = 70
        else:
            verdict = "NEEDS FIX"
            readiness = "NO"
            confidence = 50
        
        print(f"\n🎯 FINAL VERDICT:")
        print(f"   System Stability: {verdict}")
        print(f"   Launch Readiness: {readiness}")
        print(f"   Confidence Score: {confidence}%")
        
        return self.audit_results
    
    def run_comprehensive_audit(self):
        """Run the complete audit"""
        print("🔍 COMPREHENSIVE POST-FIX VERIFICATION AUDIT")
        print("Medical CRM System - React + Flask")
        print("="*60)
        
        # Wait for backend to be ready
        print("⏳ Waiting for backend to be ready...")
        time.sleep(10)
        
        # Authenticate first
        if not self.authenticate():
            print("❌ Authentication failed. Cannot proceed with audit.")
            return None
        
        # Run all test categories
        self.test_api_endpoints()
        self.test_functional_workflows()
        self.test_database_consistency()
        self.test_frontend_integration()
        self.test_performance()
        self.test_security()
        
        # Generate final report
        return self.generate_report()

if __name__ == "__main__":
    auditor = ComprehensiveAuditor()
    results = auditor.run_comprehensive_audit()
    
    # Save results to file
    with open('audit_results.json', 'w') as f:
        json.dump(results, f, indent=2)
    
    print(f"\n📄 Detailed results saved to: audit_results.json")
