import requests
import json

# Test authentication flow
base_url = "http://127.0.0.1:8000"
session = requests.Session()

print("1. Testing login...")
login_data = {"email": "test@example.com", "password": "password123"}
response = session.post(f"{base_url}/auth/login", json=login_data)
print(f"Login response: {response.status_code}")
print(f"Login data: {response.json()}")

print("\n2. Testing /me endpoint...")
response = session.get(f"{base_url}/auth/me")
print(f"Me response: {response.status_code}")
print(f"Me data: {response.json()}")

print("\n3. Testing risk endpoint...")
response = session.get(f"{base_url}/insights/risk")
print(f"Risk response: {response.status_code}")
print(f"Risk data: {response.json()}")

print("\n4. Testing without session...")
response = requests.get(f"{base_url}/auth/me")
print(f"Me without session: {response.status_code}")
print(f"Me without session data: {response.json()}")

print("\n5. Testing risk without session...")
response = requests.get(f"{base_url}/insights/risk")
print(f"Risk without session: {response.status_code}")
print(f"Risk without session data: {response.json()}")
