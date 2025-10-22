#!/usr/bin/env python3
"""
Load testing script for Medical CRM API
Tests the system under various load conditions
"""

import requests
import time
import threading
import statistics
from concurrent.futures import ThreadPoolExecutor, as_completed
import json
from datetime import datetime

class LoadTester:
    def __init__(self, base_url="http://localhost:5000/api"):
        self.base_url = base_url
        self.session = requests.Session()
        self.results = []
        self.auth_token = None
        
    def authenticate(self):
        """Authenticate and get token"""
        try:
            response = self.session.post(f"{self.base_url}/auth/login", 
                                       json={'username': 'admin', 'password': 'admin123'})
            if response.status_code == 200:
                self.auth_token = response.json()['access_token']
                self.session.headers.update({'Authorization': f'Bearer {self.auth_token}'})
                return True
        except Exception as e:
            print(f"Authentication failed: {e}")
        return False
    
    def make_request(self, endpoint, method='GET', data=None):
        """Make a single API request and measure response time"""
        start_time = time.time()
        try:
            if method == 'GET':
                response = self.session.get(f"{self.base_url}{endpoint}")
            elif method == 'POST':
                response = self.session.post(f"{self.base_url}{endpoint}", json=data)
            
            end_time = time.time()
            response_time = (end_time - start_time) * 1000  # Convert to milliseconds
            
            return {
                'endpoint': endpoint,
                'method': method,
                'status_code': response.status_code,
                'response_time': response_time,
                'success': 200 <= response.status_code < 300,
                'timestamp': datetime.now().isoformat()
            }
        except Exception as e:
            end_time = time.time()
            response_time = (end_time - start_time) * 1000
            return {
                'endpoint': endpoint,
                'method': method,
                'status_code': 0,
                'response_time': response_time,
                'success': False,
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }
    
    def test_endpoint(self, endpoint, method='GET', data=None, duration=60, concurrent_users=10):
        """Test a specific endpoint under load"""
        print(f"\n🧪 Testing {method} {endpoint}")
        print(f"   Duration: {duration}s, Concurrent users: {concurrent_users}")
        
        results = []
        start_time = time.time()
        
        def worker():
            while time.time() - start_time < duration:
                result = self.make_request(endpoint, method, data)
                results.append(result)
                time.sleep(0.1)  # Small delay between requests
        
        # Start concurrent workers
        with ThreadPoolExecutor(max_workers=concurrent_users) as executor:
            futures = [executor.submit(worker) for _ in range(concurrent_users)]
            
            # Wait for all workers to complete
            for future in as_completed(futures):
                try:
                    future.result()
                except Exception as e:
                    print(f"Worker error: {e}")
        
        # Analyze results
        if results:
            response_times = [r['response_time'] for r in results]
            success_count = sum(1 for r in results if r['success'])
            total_requests = len(results)
            
            print(f"   📊 Results:")
            print(f"      Total requests: {total_requests}")
            print(f"      Successful: {success_count} ({success_count/total_requests*100:.1f}%)")
            print(f"      Failed: {total_requests - success_count}")
            print(f"      Avg response time: {statistics.mean(response_times):.2f}ms")
            print(f"      Min response time: {min(response_times):.2f}ms")
            print(f"      Max response time: {max(response_times):.2f}ms")
            print(f"      Median response time: {statistics.median(response_times):.2f}ms")
            
            # Calculate requests per second
            rps = total_requests / duration
            print(f"      Requests per second: {rps:.2f}")
            
            return {
                'endpoint': endpoint,
                'total_requests': total_requests,
                'successful_requests': success_count,
                'success_rate': success_count/total_requests*100,
                'avg_response_time': statistics.mean(response_times),
                'min_response_time': min(response_times),
                'max_response_time': max(response_times),
                'median_response_time': statistics.median(response_times),
                'requests_per_second': rps
            }
        
        return None
    
    def run_comprehensive_test(self):
        """Run comprehensive load tests"""
        print("🚀 Starting Medical CRM Load Tests")
        print("=" * 50)
        
        # Authenticate first
        if not self.authenticate():
            print("❌ Authentication failed. Cannot proceed with tests.")
            return
        
        print("✅ Authentication successful")
        
        # Test scenarios
        test_scenarios = [
            {
                'name': 'Dashboard Load Test',
                'endpoint': '/dashboard/stats',
                'method': 'GET',
                'duration': 30,
                'concurrent_users': 5
            },
            {
                'name': 'Clinics List Test',
                'endpoint': '/clinics',
                'method': 'GET',
                'duration': 30,
                'concurrent_users': 10
            },
            {
                'name': 'Patients List Test',
                'endpoint': '/patients',
                'method': 'GET',
                'duration': 30,
                'concurrent_users': 10
            },
            {
                'name': 'Appointments List Test',
                'endpoint': '/appointments',
                'method': 'GET',
                'duration': 30,
                'concurrent_users': 10
            },
            {
                'name': 'Visits List Test',
                'endpoint': '/visits',
                'method': 'GET',
                'duration': 30,
                'concurrent_users': 10
            },
            {
                'name': 'Health Check Test',
                'endpoint': '/health',
                'method': 'GET',
                'duration': 60,
                'concurrent_users': 20
            }
        ]
        
        all_results = []
        
        for scenario in test_scenarios:
            print(f"\n{'='*50}")
            print(f"🎯 {scenario['name']}")
            print(f"{'='*50}")
            
            result = self.test_endpoint(
                scenario['endpoint'],
                scenario['method'],
                scenario.get('data'),
                scenario['duration'],
                scenario['concurrent_users']
            )
            
            if result:
                all_results.append(result)
        
        # Summary
        print(f"\n{'='*50}")
        print("📈 LOAD TEST SUMMARY")
        print(f"{'='*50}")
        
        if all_results:
            total_requests = sum(r['total_requests'] for r in all_results)
            total_successful = sum(r['successful_requests'] for r in all_results)
            overall_success_rate = total_successful / total_requests * 100
            avg_response_times = [r['avg_response_time'] for r in all_results]
            
            print(f"Total requests across all tests: {total_requests}")
            print(f"Overall success rate: {overall_success_rate:.1f}%")
            print(f"Average response time across all tests: {statistics.mean(avg_response_times):.2f}ms")
            
            print(f"\n📊 Per-endpoint breakdown:")
            for result in all_results:
                print(f"   {result['endpoint']}: {result['success_rate']:.1f}% success, {result['avg_response_time']:.2f}ms avg")
        
        print(f"\n✅ Load testing completed at {datetime.now().isoformat()}")

if __name__ == "__main__":
    # Check if backend is running
    try:
        response = requests.get("http://localhost:5000/api/health", timeout=5)
        if response.status_code != 200:
            print("❌ Backend is not responding. Please start the backend first.")
            exit(1)
    except requests.exceptions.RequestException:
        print("❌ Cannot connect to backend. Please start the backend first.")
        exit(1)
    
    # Run load tests
    tester = LoadTester()
    tester.run_comprehensive_test()
