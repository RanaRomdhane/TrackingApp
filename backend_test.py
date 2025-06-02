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
        success = response.status_code == 200 and "Enhanced GTD Task Manager API is running" in response.json().get("message", "")
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
            return None, None
        
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

def test_task_with_dependencies(project_id=None):
    print_header("Testing Task Dependencies")
    
    try:
        # Create first task (dependency)
        dependency_task_data = {
            "title": f"Dependency Task {uuid.uuid4()}",
            "description": "This task will be a dependency for another task",
            "priority": "medium",
            "status": "todo",
            "project_id": project_id,
            "task_type": "dependency"
        }
        
        response = requests.post(f"{API_URL}/tasks", json=dependency_task_data)
        success = response.status_code == 200 and "id" in response.json()
        print_result("Create Dependency Task", success, response.json())
        
        if not success:
            return None, None
        
        dependency_id = response.json()["id"]
        
        # Create second task with dependency
        dependent_task_data = {
            "title": f"Dependent Task {uuid.uuid4()}",
            "description": "This task depends on another task",
            "priority": "high",
            "status": "todo",
            "project_id": project_id,
            "task_type": "dependent",
            "dependencies": [dependency_id]
        }
        
        response = requests.post(f"{API_URL}/tasks", json=dependent_task_data)
        success = response.status_code == 200 and "id" in response.json() and dependency_id in response.json()["dependencies"]
        print_result("Create Task with Dependencies", success, response.json())
        
        if not success:
            return None, None
        
        dependent_id = response.json()["id"]
        
        return dependency_id, dependent_id
    
    except Exception as e:
        print_result("Task Dependencies", False, error=str(e))
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

def test_time_tracking(task_id):
    print_header("Testing Time Tracking")
    
    if not task_id:
        print_result("Time Tracking", False, error="No task ID provided")
        return False
    
    try:
        # Start time tracking
        response = requests.post(f"{API_URL}/time-tracking/start/{task_id}")
        success = response.status_code == 200 and "entry_id" in response.json()
        print_result("Start Time Tracking", success, response.json())
        
        if not success:
            return False
        
        # Wait a moment to accumulate some time
        time.sleep(2)
        
        # Stop time tracking
        response = requests.post(f"{API_URL}/time-tracking/stop/{task_id}")
        success = response.status_code == 200 and "duration_minutes" in response.json()
        print_result("Stop Time Tracking", success, response.json())
        
        # Get time entries
        response = requests.get(f"{API_URL}/time-tracking/{task_id}")
        success = response.status_code == 200 and isinstance(response.json(), list)
        print_result("Get Time Entries", success, response.json())
        
        return success
    except Exception as e:
        print_result("Time Tracking", False, error=str(e))
        return False

def test_task_templates():
    print_header("Testing Task Templates")
    
    try:
        # Create a task template
        template_data = {
            "name": f"Test Template {uuid.uuid4()}",
            "title_template": "Task from template: {{name}}",
            "description_template": "This task was created from a template",
            "priority": "medium",
            "estimated_hours": 1.5,
            "task_type": "template-generated",
            "tags": ["template", "test"]
        }
        
        response = requests.post(f"{API_URL}/templates", json=template_data)
        success = response.status_code == 200 and "id" in response.json()
        print_result("Create Task Template", success, response.json())
        
        if not success:
            return None
        
        template_id = response.json()["id"]
        
        # Get all templates
        response = requests.get(f"{API_URL}/templates")
        success = response.status_code == 200 and isinstance(response.json(), list)
        print_result("Get All Templates", success, response.json())
        
        # Create a task from the template
        response = requests.post(f"{API_URL}/templates/{template_id}/create-task")
        success = response.status_code == 200 and "id" in response.json() and response.json()["template_id"] == template_id
        print_result("Create Task from Template", success, response.json())
        
        if success:
            return template_id, response.json()["id"]  # Return template_id and created task_id
        return template_id, None
    
    except Exception as e:
        print_result("Task Templates", False, error=str(e))
        return None, None

def test_comments(task_id):
    print_header("Testing Comments System")
    
    if not task_id:
        print_result("Comments System", False, error="No task ID provided")
        return False
    
    try:
        # Add a comment to the task
        comment_data = {
            "task_id": task_id,
            "author": "Test User",
            "content": f"This is a test comment created at {datetime.utcnow().isoformat()}"
        }
        
        response = requests.post(f"{API_URL}/comments", json=comment_data)
        success = response.status_code == 200 and "id" in response.json()
        print_result("Add Comment to Task", success, response.json())
        
        if not success:
            return False
        
        # Add a second comment
        second_comment_data = {
            "task_id": task_id,
            "author": "Another User",
            "content": f"This is another test comment created at {datetime.utcnow().isoformat()}"
        }
        
        response = requests.post(f"{API_URL}/comments", json=second_comment_data)
        success = response.status_code == 200 and "id" in response.json()
        print_result("Add Second Comment to Task", success, response.json())
        
        # Get comments for the task
        response = requests.get(f"{API_URL}/comments/{task_id}")
        success = response.status_code == 200 and isinstance(response.json(), list) and len(response.json()) >= 2
        print_result("Get Task Comments", success, response.json())
        
        return success
    except Exception as e:
        print_result("Comments System", False, error=str(e))
        return False

def test_recurring_tasks():
    print_header("Testing Recurring Tasks")
    
    try:
        # Create a recurring task
        recurring_task_data = {
            "title": f"Recurring Task {uuid.uuid4()}",
            "description": "This task recurs daily",
            "priority": "medium",
            "status": "todo",
            "deadline": (datetime.utcnow() + timedelta(hours=1)).isoformat(),  # Set deadline soon for testing
            "recurrence_type": "daily",
            "recurrence_interval": 1,
            "task_type": "recurring"
        }
        
        response = requests.post(f"{API_URL}/tasks", json=recurring_task_data)
        success = response.status_code == 200 and "id" in response.json() and response.json()["recurrence_type"] == "daily"
        print_result("Create Recurring Task", success, response.json())
        
        if not success:
            return False
        
        # Process recurring tasks
        response = requests.post(f"{API_URL}/recurring-tasks/process")
        success = response.status_code == 200 and "message" in response.json()
        print_result("Process Recurring Tasks", success, response.json())
        
        return success
    except Exception as e:
        print_result("Recurring Tasks", False, error=str(e))
        return False

def test_smart_notifications():
    print_header("Testing Smart Notifications")
    
    try:
        # Create a task with a deadline in the past (overdue)
        overdue_task_data = {
            "title": f"Overdue Task {uuid.uuid4()}",
            "description": "This task is already overdue",
            "priority": "high",
            "status": "todo",
            "deadline": (datetime.utcnow() - timedelta(days=1)).isoformat(),
            "task_type": "notification-test"
        }
        
        response = requests.post(f"{API_URL}/tasks", json=overdue_task_data)
        overdue_success = response.status_code == 200
        
        # Create a task with a deadline tomorrow (upcoming)
        upcoming_task_data = {
            "title": f"Upcoming Task {uuid.uuid4()}",
            "description": "This task is due tomorrow",
            "priority": "medium",
            "status": "todo",
            "deadline": (datetime.utcnow() + timedelta(hours=23)).isoformat(),
            "task_type": "notification-test"
        }
        
        response = requests.post(f"{API_URL}/tasks", json=upcoming_task_data)
        upcoming_success = response.status_code == 200
        
        # Get notifications
        response = requests.get(f"{API_URL}/notifications")
        success = response.status_code == 200 and isinstance(response.json(), list)
        
        # Check if we have both types of notifications
        has_overdue = False
        has_upcoming = False
        
        if success and len(response.json()) > 0:
            for notification in response.json():
                if "Overdue" in notification["title"]:
                    has_overdue = True
                if "Due Tomorrow" in notification["title"]:
                    has_upcoming = True
        
        print_result("Get Smart Notifications", success, response.json())
        print(f"   Has Overdue Notifications: {has_overdue}")
        print(f"   Has Upcoming Notifications: {has_upcoming}")
        
        return success and (has_overdue or has_upcoming)
    except Exception as e:
        print_result("Smart Notifications", False, error=str(e))
        return False

def test_enhanced_gtd_analysis():
    print_header("Testing Enhanced GTD Analysis with Dependencies")
    
    try:
        response = requests.get(f"{API_URL}/gtd/analysis")
        success = response.status_code == 200 and all(key in response.json() for key in [
            "high_impact_tasks", "batched_tasks", "suggested_dependencies", "focus_recommendation"
        ])
        
        # Check if dependencies are considered in the analysis
        has_dependencies = False
        if success and "suggested_dependencies" in response.json():
            has_dependencies = len(response.json()["suggested_dependencies"]) > 0
        
        print_result("Enhanced GTD Analysis", success, response.json())
        print(f"   Has Dependency Suggestions: {has_dependencies}")
        
        return success
    except Exception as e:
        print_result("Enhanced GTD Analysis", False, error=str(e))
        return False

def test_enhanced_dashboard_stats():
    print_header("Testing Enhanced Dashboard Statistics")
    
    try:
        response = requests.get(f"{API_URL}/stats/dashboard")
        success = response.status_code == 200 and all(key in response.json() for key in ["tasks", "projects"])
        
        # Check if time tracking stats are included
        has_time_tracking = False
        if success and "time_tracking" in response.json():
            has_time_tracking = True
        
        print_result("Enhanced Dashboard Statistics", success, response.json())
        print(f"   Has Time Tracking Stats: {has_time_tracking}")
        
        return success and has_time_tracking
    except Exception as e:
        print_result("Enhanced Dashboard Statistics", False, error=str(e))
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
    print_header("STARTING ENHANCED GTD TASK MANAGER BACKEND TESTS")
    
    # Test health check
    health_check_success = test_health_check()
    
    # Test project CRUD
    project_id = test_project_crud()
    if not project_id:
        print("❌ Project CRUD tests failed. Continuing with other tests.")
    
    # Test task CRUD
    task_id, second_task_id = test_task_crud(project_id)
    if not task_id:
        print("❌ Task CRUD tests failed. Continuing with other tests.")
    
    # Test task templates
    template_id, template_task_id = test_task_templates()
    if not template_id:
        print("❌ Task Templates tests failed. Continuing with other tests.")
    
    # Test task dependencies
    dependency_id, dependent_id = test_task_with_dependencies(project_id)
    if not dependency_id or not dependent_id:
        print("❌ Task Dependencies tests failed. Continuing with other tests.")
    
    # Test time tracking
    time_tracking_success = test_time_tracking(task_id)
    
    # Test comments system
    comments_success = test_comments(task_id)
    
    # Test recurring tasks
    recurring_tasks_success = test_recurring_tasks()
    
    # Test smart notifications
    notifications_success = test_smart_notifications()
    
    # Test batch task creation
    batch_success = test_batch_task_creation(project_id)
    
    # Test enhanced GTD analysis
    enhanced_gtd_success = test_enhanced_gtd_analysis()
    
    # Test enhanced dashboard statistics
    enhanced_stats_success = test_enhanced_dashboard_stats()
    
    # Test Pomodoro timer
    pomodoro_success = test_pomodoro_timer(task_id)
    
    # Test task deletion for cleanup
    if second_task_id:
        task_deletion_success = test_task_deletion(second_task_id)
    
    if template_task_id:
        template_task_deletion_success = test_task_deletion(template_task_id)
    
    if dependent_id:
        dependent_task_deletion_success = test_task_deletion(dependent_id)
    
    if dependency_id:
        dependency_task_deletion_success = test_task_deletion(dependency_id)
    
    # Test project deletion for cleanup
    if project_id:
        project_deletion_success = test_project_deletion(project_id)
    
    print_header("TEST SUMMARY")
    print(f"Health Check: {'✅ PASSED' if health_check_success else '❌ FAILED'}")
    print(f"Project CRUD: {'✅ PASSED' if project_id else '❌ FAILED'}")
    print(f"Task CRUD: {'✅ PASSED' if task_id else '❌ FAILED'}")
    print(f"Task Templates: {'✅ PASSED' if template_id else '❌ FAILED'}")
    print(f"Task Dependencies: {'✅ PASSED' if dependency_id and dependent_id else '❌ FAILED'}")
    print(f"Time Tracking: {'✅ PASSED' if time_tracking_success else '❌ FAILED'}")
    print(f"Comments System: {'✅ PASSED' if comments_success else '❌ FAILED'}")
    print(f"Recurring Tasks: {'✅ PASSED' if recurring_tasks_success else '❌ FAILED'}")
    print(f"Smart Notifications: {'✅ PASSED' if notifications_success else '❌ FAILED'}")
    print(f"Batch Task Creation: {'✅ PASSED' if batch_success else '❌ FAILED'}")
    print(f"Enhanced GTD Analysis: {'✅ PASSED' if enhanced_gtd_success else '❌ FAILED'}")
    print(f"Enhanced Dashboard Statistics: {'✅ PASSED' if enhanced_stats_success else '❌ FAILED'}")
    print(f"Pomodoro Timer: {'✅ PASSED' if pomodoro_success else '❌ FAILED'}")
    
    overall_success = all([
        health_check_success,
        project_id is not None,
        task_id is not None,
        template_id is not None,
        dependency_id is not None and dependent_id is not None,
        time_tracking_success,
        comments_success,
        recurring_tasks_success,
        notifications_success,
        batch_success,
        enhanced_gtd_success,
        enhanced_stats_success,
        pomodoro_success
    ])
    
    print_header(f"OVERALL TEST RESULT: {'✅ PASSED' if overall_success else '❌ FAILED'}")
    return overall_success

if __name__ == "__main__":
    run_all_tests()
