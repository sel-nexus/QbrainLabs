#!/usr/bin/env python3
"""
Test script for LLM Usage Admin Page
Tests all API endpoints that the frontend page depends on.
"""

import requests
import json
from datetime import datetime, timedelta

# Configuration
API_BASE = "http://localhost:8000"
LOGIN_ENDPOINT = f"{API_BASE}/api/auth/login"
ADMIN_EMAIL = "admin@qbrainlabs.com"
ADMIN_PASSWORD = "Tcs@$2026"

# Color codes for terminal output
GREEN = '\033[92m'
RED = '\033[91m'
YELLOW = '\033[93m'
BLUE = '\033[94m'
RESET = '\033[0m'


def print_success(msg):
    print(f"{GREEN}[+] {msg}{RESET}")


def print_error(msg):
    print(f"{RED}[-] {msg}{RESET}")


def print_info(msg):
    print(f"{BLUE}[i] {msg}{RESET}")


def print_warning(msg):
    print(f"{YELLOW}[!] {msg}{RESET}")


def print_section(title):
    print(f"\n{'=' * 60}")
    print(f"{BLUE}{title}{RESET}")
    print('=' * 60)


def login():
    """Login and get auth token"""
    print_section("Step 1: Authentication")
    try:
        # Use form data instead of JSON
        response = requests.post(
            LOGIN_ENDPOINT,
            data={"username": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        if response.status_code == 200:
            data = response.json()
            token = data.get("access_token")
            if token:
                print_success(f"Logged in as {ADMIN_EMAIL}")
                return token
            else:
                print_error("No access token in response")
                return None
        else:
            print_error(f"Login failed: {response.status_code}")
            print_error(f"Response: {response.text}")
            return None
    except Exception as e:
        print_error(f"Login error: {str(e)}")
        return None


def test_endpoint(name, endpoint, token, expected_keys=None):
    """Test a single API endpoint"""
    try:
        headers = {"Authorization": f"Bearer {token}"}
        response = requests.get(endpoint, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            print_success(f"{name}: Status 200")
            
            # Pretty print a sample of the data
            if isinstance(data, dict):
                print_info(f"   Sample data: {json.dumps(data, indent=2)[:200]}...")
                if expected_keys:
                    for key in expected_keys:
                        if key in data:
                            print_success(f"   [+] Has key '{key}': {data[key]}")
                        else:
                            print_warning(f"   [-] Missing key '{key}'")
            elif isinstance(data, list):
                print_info(f"   Returned {len(data)} items")
                if len(data) > 0:
                    print_info(f"   First item: {json.dumps(data[0], indent=2)[:300]}...")
            return True, data
        else:
            print_error(f"{name}: Status {response.status_code}")
            print_error(f"   Response: {response.text[:200]}")
            return False, None
    except Exception as e:
        print_error(f"{name}: Error - {str(e)}")
        return False, None


def analyze_summary(data):
    """Analyze summary data"""
    print_section("Summary Analysis")
    if data:
        print_info("Summary Card Values:")
        print(f"  • Total Calls: {data.get('total_calls', 0):,}")
        print(f"  • Total Tokens: {data.get('total_tokens', 0):,}")
        print(f"    - Prompt Tokens: {data.get('total_prompt_tokens', 0):,}")
        print(f"    - Completion Tokens: {data.get('total_completion_tokens', 0):,}")
        print(f"  • Estimated Cost: ${data.get('estimated_cost_cents', 0) / 100:.4f}")
        print(f"  • Unique Users: {data.get('unique_users', 0)}")
        print(f"  • Unique Workshops: {data.get('unique_workshops', 0)}")
        print(f"  • Success Count: {data.get('success_count', 0)}")
        print(f"  • Error Count: {data.get('error_count', 0)}")
        
        # Verify expected values
        if data.get('total_calls') == 1661:
            print_success("[+] Total calls matches expected value (1661)")
        else:
            print_warning(f"[!] Total calls is {data.get('total_calls')}, expected ~1661")


def analyze_by_feature(data):
    """Analyze by-feature data"""
    print_section("By Feature Analysis")
    if data and len(data) > 0:
        print_info(f"Found {len(data)} features with usage data:")
        
        feature_map = {item['feature']: item for item in data}
        
        for item in data[:5]:  # Show top 5
            print(f"\n  • {item['feature']}")
            print(f"    - Calls: {item['call_count']:,}")
            print(f"    - Tokens: {item['total_tokens']:,}")
            print(f"    - Cost: ${item['estimated_cost_cents'] / 100:.4f}")
            print(f"    - Success Rate: {item['success_count']}/{item['call_count']}")
        
        # Check expected features
        if 'enhance' in feature_map:
            enhance_calls = feature_map['enhance']['call_count']
            if enhance_calls == 861:
                print_success(f"[+] 'enhance' feature has expected 861 calls")
            else:
                print_warning(f"[!] 'enhance' feature has {enhance_calls} calls (expected ~861)")
        
        if 'knowledge_impact' in feature_map:
            ki_calls = feature_map['knowledge_impact']['call_count']
            if ki_calls == 800:
                print_success(f"[+] 'knowledge_impact' feature has expected 800 calls")
            else:
                print_warning(f"[!] 'knowledge_impact' feature has {ki_calls} calls (expected ~800)")
    else:
        print_warning("No feature usage data found")


def analyze_by_model(data):
    """Analyze by-model data"""
    print_section("By Model Analysis")
    if data and len(data) > 0:
        print_info(f"Found {len(data)} models with usage data:")
        for item in data:
            print(f"\n  • {item['model_name']}")
            print(f"    - Calls: {item['call_count']:,}")
            print(f"    - Tokens: {item['total_tokens']:,}")
            print(f"    - Cost: ${item['estimated_cost_cents'] / 100:.4f}")
        
        # Check for gpt-4.1
        model_names = [item['model_name'] for item in data]
        if 'gpt-4.1' in model_names or any('gpt-4' in name for name in model_names):
            print_success("[+] Found GPT-4 model in data")
        else:
            print_warning("[!] No GPT-4 model found in data")
    else:
        print_warning("No model usage data found")


def analyze_daily_trend(data):
    """Analyze daily trend data"""
    print_section("Daily Trend Analysis")
    if data and len(data) > 0:
        print_info(f"Found {len(data)} days with usage data:")
        # Show last 5 days
        for item in data[-5:]:
            print(f"\n  • {item['date']}")
            print(f"    - Calls: {item['call_count']:,}")
            print(f"    - Tokens: {item['total_tokens']:,}")
            print(f"    - Cost: ${item['estimated_cost_cents'] / 100:.4f}")
    else:
        print_warning("No daily trend data found")


def analyze_recent_logs(data):
    """Analyze recent logs"""
    print_section("Recent Logs Analysis")
    if data and len(data) > 0:
        print_info(f"Found {len(data)} recent log entries:")
        # Show first 3
        for item in data[:3]:
            print(f"\n  • {item['feature']} - {item.get('model_name', 'N/A')}")
            print(f"    - Time: {item['created_at']}")
            print(f"    - Tokens: {item['total_tokens']:,} (P:{item['prompt_tokens']}, C:{item['completion_tokens']})")
            print(f"    - Cost: ${item['estimated_cost_cents'] / 100:.4f}")
            print(f"    - Success: {item['success']}")
    else:
        print_warning("No recent logs found")


def main():
    print_section("LLM Usage Admin Page API Test")
    print_info("This script tests all API endpoints used by the frontend")
    print_info("Expected behavior:")
    print_info("  - Total calls: ~1661")
    print_info("  - By Feature: 'enhance' (861 calls), 'knowledge_impact' (800 calls)")
    print_info("  - By Model: Contains GPT-4 variants")
    
    # Step 1: Login
    token = login()
    if not token:
        print_error("\nCannot proceed without authentication token")
        print_info("\nTroubleshooting:")
        print_info("  1. Ensure backend is running on http://localhost:8000")
        print_info("  2. Verify credentials: admin@qbrainlabs.com / Tcs@$2026")
        return
    
    # Step 2: Test Summary Endpoint
    print_section("Step 2: Testing Summary Endpoint")
    success, summary_data = test_endpoint(
        "Summary",
        f"{API_BASE}/api/admin/llm-usage/summary",
        token,
        expected_keys=['total_calls', 'total_tokens', 'estimated_cost_cents', 'unique_users']
    )
    if success:
        analyze_summary(summary_data)
    
    # Step 3: Test By Feature Endpoint
    print_section("Step 3: Testing By Feature Endpoint")
    success, feature_data = test_endpoint(
        "By Feature",
        f"{API_BASE}/api/admin/llm-usage/by-feature",
        token
    )
    if success:
        analyze_by_feature(feature_data)
    
    # Step 4: Test By Model Endpoint
    print_section("Step 4: Testing By Model Endpoint")
    success, model_data = test_endpoint(
        "By Model",
        f"{API_BASE}/api/admin/llm-usage/by-model",
        token
    )
    if success:
        analyze_by_model(model_data)
    
    # Step 5: Test By Workshop Endpoint
    print_section("Step 5: Testing By Workshop Endpoint")
    success, workshop_data = test_endpoint(
        "By Workshop",
        f"{API_BASE}/api/admin/llm-usage/by-workshop",
        token
    )
    
    # Step 6: Test By User Endpoint
    print_section("Step 6: Testing By User Endpoint")
    success, user_data = test_endpoint(
        "By User",
        f"{API_BASE}/api/admin/llm-usage/by-user",
        token
    )
    
    # Step 7: Test Daily Trend Endpoint
    print_section("Step 7: Testing Daily Trend Endpoint")
    success, trend_data = test_endpoint(
        "Daily Trend",
        f"{API_BASE}/api/admin/llm-usage/by-day",
        token
    )
    if success:
        analyze_daily_trend(trend_data)
    
    # Step 8: Test Recent Logs Endpoint
    print_section("Step 8: Testing Recent Logs Endpoint")
    success, logs_data = test_endpoint(
        "Recent Logs",
        f"{API_BASE}/api/admin/llm-usage/recent",
        token
    )
    if success:
        analyze_recent_logs(logs_data)
    
    # Final Summary
    print_section("Test Summary")
    print_success("All API endpoints have been tested!")
    print_info("\nTo manually test the frontend page:")
    print_info("  1. Navigate to http://localhost:5173/admin/llm-usage")
    print_info("  2. Login with: admin@qbrainlabs.com / Tcs@$2026")
    print_info("  3. Verify the following:")
    print_info("     • Summary cards show correct values")
    print_info("     • 'By Feature' tab shows enhance (861) and knowledge_impact (800)")
    print_info("     • 'By Model' tab shows GPT-4 variants")
    print_info("     • 'Daily Trend' tab shows bar chart and data table")
    print_info("     • 'Recent Logs' tab shows log entries")
    print_info("     • Date filters (Today/7 Days/30 Days/All Time) work correctly")
    print_info("     • Refresh button updates the data")


if __name__ == "__main__":
    main()
