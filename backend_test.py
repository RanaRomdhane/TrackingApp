#!/usr/bin/env python3
import requests
import json
import uuid
from datetime import datetime, timedelta
import time
import sys

# Get the backend URL from the frontend .env file
BACKEND_URL = "https://7c355d13-4435-4586-aaa7-0e7fb949e5bb.preview.emergentagent.com"
API_URL = f"{BACKEND_URL}/api"

def print_header(message):
    print("\n" + "=" * 80)
    print(f"  {message}")
    print("=" * 80)

def print_result(test_name, success, response=None, error=None):
    if success:
        print(f"✅ {test_name}: PASSED")
        if response:
            print(f"   Response: {json.dumps(response, indent=2)[:200]}...")
    else:
        print(f"❌ {test_name}: FAILED")
        if error:
            print(f"   Error: {error}")
        if response:
            print(f"   Response: {json.dumps(response, indent=2)}")

def test_health_check():
    print_header("Testing Health Check Endpoint")
    try:
        response = requests.get(f"{BACKEND_URL}/")
        success = response.status_code == 200 and "GTD Task Manager API is running" in response.json().get("message", "")
        print_result("Health Check", success, response.json())
        return success
    except Exception as e:
        print_result("Health Check", False, error=str(e))
        return False

def test_project_crud():
    print_header("Testing Project CRUD Operations")
    
    # Test project creation
    project_data = {
        "title": f"Test Project {uuid.uuid4()}",
        "description": "A test project created by the automated test script",
        "status": "active",
        "deadline": (datetime.utcnow() + timedelta(days=7)).isoformat(),
        "color": "#4F46E5"
    }
    
    try:
        # Create project
        response = requests.post(f"{API_URL}/projects", json=project_data)
        success = response.status_code == 200 and "id" in response.json()
        print_result("Create Project", success, response.json())
        
        if not success:
            return None
        
        project_id = response.json()["id"]
        
        # Get all projects
        response = requests.get(f"{API_URL}/projects")
        success = response.status_code == 200 and isinstance(response.json(), list)
        print_result("Get All Projects", success, response.json())
        
        # Get specific project
        response = requests.get(f"{API_URL}/projects/{project_id}")
        success = response.status_code == 200 and response.json()["id"] == project_id
        print_result("Get Specific Project", success, response.json())
        
        # Update project
        update_data = {
            "title": f"Updated Project {uuid.uuid4()}",
            "description": "This project has been updated"
        }
        response = requests.put(f"{API_URL}/projects/{project_id}", json=update_data)
        success = response.status_code == 200 and response.json()["title"] == update_data["title"]
        print_result("Update Project", success, response.json())
        
        return project_id
    
    except Exception as e:
        print_result("Project CRUD Operations", False, error=str(e))
        return None

def test_task_crud(project_id=None):
    print_header("Testing Task CRUD Operations")
    
    # Test task creation
    task_data = {
        "title": f"Test Task {uuid.uuid4()}",
        "description": "A test task created by the automated test script",
        "priority": "high",
        "status": "todo",
        "deadline": (datetime.utcnow() + timedelta(days=3)).isoformat(),
        "project_id": project_id,
        "task_type": "testing",
        "estimated_hours": 2.5,
        "tags": ["test", "automation"]
    }
    
    try:
        # Create task
        response = requests.post(f"{API_URL}/tasks", json=task_data)
        success = response.status_code == 200 and "id" in response.json()
        print_result("Create Task", success, response.json())
        
        if not success:
            return None
        
        task_id = response.json()["id"]
        
        # Get all tasks
        response = requests.get(f"{API_URL}/tasks")
        success = response.status_code == 200 and isinstance(response.json(), list)
        print_result("Get All Tasks", success, response.json())
        
        # Get specific task
        response = requests.get(f"{API_URL}/tasks/{task_id}")
        success = response.status_code == 200 and response.json()["id"] == task_id
        print_result("Get Specific Task", success, response.json())
        
        # Update task
        update_data = {
            "title": f"Updated Task {uuid.uuid4()}",
            "description": "This task has been updated",
            "priority": "medium",
            "status": "in_progress"
        }
        response = requests.put(f"{API_URL}/tasks/{task_id}", json=update_data)
        success = response.status_code == 200 and response.json()["title"] == update_data["title"]
        print_result("Update Task", success, response.json())
        
        # Test task filtering by project_id
        if project_id:
            response = requests.get(f"{API_URL}/tasks?project_id={project_id}")
            success = response.status_code == 200 and isinstance(response.json(), list)
            project_tasks = [task for task in response.json() if task.get("project_id") == project_id]
            print_result(f"Filter Tasks by Project ID", success, {"filtered_count": len(project_tasks)})
        
        # Create a second task for testing batch operations and GTD analysis
        second_task_data = {
            "title": f"Second Test Task {uuid.uuid4()}",
            "description": "Another test task for batch operations",
            "priority": "high",
            "status": "todo",
            "deadline": (datetime.utcnow() + timedelta(days=2)).isoformat(),
            "project_id": project_id,
            "task_type": "testing",
            "tags": ["test", "batch"]
        }
        
        response = requests.post(f"{API_URL}/tasks", json=second_task_data)
        second_task_id = response.json()["id"] if response.status_code == 200 else None
        
        return task_id, second_task_id
    
    except Exception as e:
        print_result("Task CRUD Operations", False, error=str(e))
        return None, None

def test_batch_task_creation(project_id=None):
    print_header("Testing Batch Task Creation")
    
    batch_tasks = [
        {
            "title": f"Batch Task 1 - {uuid.uuid4()}",
            "description": "First batch task",
            "priority": "medium",
            "status": "todo",
            "project_id": project_id,
            "task_type": "batch"
        },
        {
            "title": f"Batch Task 2 - {uuid.uuid4()}",
            "description": "Second batch task",
            "priority": "medium",
            "status": "todo",
            "project_id": project_id,
            "task_type": "batch"
        },
        {
            "title": f"Batch Task 3 - {uuid.uuid4()}",
            "description": "Third batch task",
            "priority": "medium",
            "status": "todo",
            "project_id": project_id,
            "task_type": "batch"
        }
    ]
    
    try:
        response = requests.post(f"{API_URL}/tasks/batch-create", json=batch_tasks)
        success = response.status_code == 200 and "created_tasks" in response.json()
        print_result("Batch Create Tasks", success, response.json())
        return success
    except Exception as e:
        print_result("Batch Create Tasks", False, error=str(e))
        return False

def test_gtd_analysis():
    print_header("Testing GTD Analysis Engine")
    
    try:
        response = requests.get(f"{API_URL}/gtd/analysis")
        success = response.status_code == 200 and all(key in response.json() for key in [
            "high_impact_tasks", "batched_tasks", "suggested_dependencies", "focus_recommendation"
        ])
        print_result("GTD Analysis", success, response.json())
        return success
    except Exception as e:
        print_result("GTD Analysis", False, error=str(e))
        return False

def test_pomodoro_timer(task_id):
    print_header("Testing Pomodoro Timer Integration")
    
    if not task_id:
        print_result("Pomodoro Timer", False, error="No task ID provided")
        return False
    
    try:
        response = requests.post(f"{API_URL}/pomodoro/start/{task_id}")
        success = response.status_code == 200 and "message" in response.json()
        print_result("Start Pomodoro Session", success, response.json())
        return success
    except Exception as e:
        print_result("Pomodoro Timer", False, error=str(e))
        return False

def test_dashboard_stats():
    print_header("Testing Dashboard Statistics")
    
    try:
        response = requests.get(f"{API_URL}/stats/dashboard")
        success = response.status_code == 200 and all(key in response.json() for key in ["tasks", "projects"])
        print_result("Dashboard Statistics", success, response.json())
        return success
    except Exception as e:
        print_result("Dashboard Statistics", False, error=str(e))
        return False

def test_task_deletion(task_id):
    print_header("Testing Task Deletion")
    
    if not task_id:
        print_result("Task Deletion", False, error="No task ID provided")
        return False
    
    try:
        response = requests.delete(f"{API_URL}/tasks/{task_id}")
        success = response.status_code == 200 and "message" in response.json()
        print_result("Delete Task", success, response.json())
        return success
    except Exception as e:
        print_result("Task Deletion", False, error=str(e))
        return False

def test_project_deletion(project_id):
    print_header("Testing Project Deletion")
    
    if not project_id:
        print_result("Project Deletion", False, error="No project ID provided")
        return False
    
    try:
        response = requests.delete(f"{API_URL}/projects/{project_id}")
        success = response.status_code == 200 and "message" in response.json()
        print_result("Delete Project", success, response.json())
        return success
    except Exception as e:
        print_result("Project Deletion", False, error=str(e))
        return False

def run_all_tests():
    print_header("STARTING GTD TASK MANAGER BACKEND TESTS")
    
    # Test health check
    health_check_success = test_health_check()
    # Continue with tests even if health check fails
    
    # Test project CRUD
    project_id = test_project_crud()
    if not project_id:
        print("❌ Project CRUD tests failed. Continuing with other tests.")
    
    # Test task CRUD
    task_id, second_task_id = test_task_crud(project_id)
    if not task_id:
        print("❌ Task CRUD tests failed. Continuing with other tests.")
    
    # Test batch task creation
    batch_success = test_batch_task_creation(project_id)
    
    # Test GTD analysis
    gtd_success = test_gtd_analysis()
    
    # Test Pomodoro timer
    pomodoro_success = test_pomodoro_timer(task_id)
    
    # Test dashboard statistics
    stats_success = test_dashboard_stats()
    
    # Test task deletion
    if second_task_id:
        task_deletion_success = test_task_deletion(second_task_id)
    
    # Test project deletion
    if project_id:
        project_deletion_success = test_project_deletion(project_id)
    
    print_header("TEST SUMMARY")
    print(f"Health Check: {'✅ PASSED' if health_check_success else '❌ FAILED'}")
    print(f"Project CRUD: {'✅ PASSED' if project_id else '❌ FAILED'}")
    print(f"Task CRUD: {'✅ PASSED' if task_id else '❌ FAILED'}")
    print(f"Batch Task Creation: {'✅ PASSED' if batch_success else '❌ FAILED'}")
    print(f"GTD Analysis: {'✅ PASSED' if gtd_success else '❌ FAILED'}")
    print(f"Pomodoro Timer: {'✅ PASSED' if pomodoro_success else '❌ FAILED'}")
    print(f"Dashboard Statistics: {'✅ PASSED' if stats_success else '❌ FAILED'}")
    
    overall_success = all([
        health_check_success,
        project_id is not None,
        task_id is not None,
        batch_success,
        gtd_success,
        pomodoro_success,
        stats_success
    ])
    
    print_header(f"OVERALL TEST RESULT: {'✅ PASSED' if overall_success else '❌ FAILED'}")
    return overall_success

if __name__ == "__main__":
    run_all_tests()
