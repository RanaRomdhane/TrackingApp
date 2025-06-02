from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(title="GTD Task Manager API", version="2.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Enums
class Priority(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"

class TaskStatus(str, Enum):
    todo = "todo"
    in_progress = "in_progress"
    completed = "completed"
    approved = "approved"

class ProjectStatus(str, Enum):
    active = "active"
    completed = "completed"
    archived = "archived"

class RecurrenceType(str, Enum):
    none = "none"
    daily = "daily"
    weekly = "weekly"
    monthly = "monthly"

# Enhanced Task Models
class TaskBase(BaseModel):
    title: str
    description: Optional[str] = ""
    priority: Priority = Priority.medium
    status: TaskStatus = TaskStatus.todo
    deadline: Optional[datetime] = None
    project_id: Optional[str] = None
    task_type: Optional[str] = "general"
    estimated_hours: Optional[float] = None
    actual_hours: Optional[float] = 0.0
    tags: List[str] = []
    template_id: Optional[str] = None
    recurrence_type: RecurrenceType = RecurrenceType.none
    recurrence_interval: Optional[int] = 1
    next_due_date: Optional[datetime] = None
    dependencies: List[str] = []  # List of task IDs this task depends on
    is_template: bool = False

class TaskCreate(TaskBase):
    pass

class Task(TaskBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    time_entries: List[dict] = []  # Track time spent on task

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[Priority] = None
    status: Optional[TaskStatus] = None
    deadline: Optional[datetime] = None
    task_type: Optional[str] = None
    estimated_hours: Optional[float] = None
    actual_hours: Optional[float] = None
    tags: Optional[List[str]] = None
    dependencies: Optional[List[str]] = None

# Time Tracking Models
class TimeEntry(BaseModel):
    task_id: str
    start_time: datetime
    end_time: Optional[datetime] = None
    duration_minutes: Optional[int] = None
    description: Optional[str] = ""

class TimeEntryCreate(BaseModel):
    task_id: str
    start_time: datetime = Field(default_factory=datetime.utcnow)
    description: Optional[str] = ""

# Task Template Models
class TaskTemplate(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    title_template: str
    description_template: str
    priority: Priority = Priority.medium
    estimated_hours: Optional[float] = None
    task_type: str = "general"
    tags: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)

class TaskTemplateCreate(BaseModel):
    name: str
    title_template: str
    description_template: str
    priority: Priority = Priority.medium
    estimated_hours: Optional[float] = None
    task_type: str = "general"
    tags: List[str] = []

# Comment Models
class Comment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    task_id: str
    author: str = "User"
    content: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class CommentCreate(BaseModel):
    task_id: str
    author: str = "User"
    content: str

# Project Models (unchanged)
class ProjectBase(BaseModel):
    title: str
    description: Optional[str] = ""
    status: ProjectStatus = ProjectStatus.active
    deadline: Optional[datetime] = None
    color: Optional[str] = "#06B6D4"  # Cyan default

class ProjectCreate(ProjectBase):
    pass

class Project(ProjectBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    task_count: int = 0

class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[ProjectStatus] = None
    deadline: Optional[datetime] = None
    color: Optional[str] = None

# GTD Analysis Model
class GTDAnalysis(BaseModel):
    high_impact_tasks: List[Task]
    batched_tasks: List[List[Task]]
    suggested_dependencies: List[dict]
    focus_recommendation: str

# Notification Models
class Notification(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    message: str
    type: str = "info"  # info, warning, error, success
    task_id: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    read: bool = False

# Task Routes
@api_router.post("/tasks", response_model=Task)
async def create_task(task: TaskCreate):
    task_dict = task.dict()
    task_obj = Task(**task_dict)
    
    # Handle recurring tasks
    if task.recurrence_type != RecurrenceType.none and task.deadline:
        next_due = calculate_next_due_date(task.deadline, task.recurrence_type, task.recurrence_interval)
        task_obj.next_due_date = next_due
    
    # Update project task count if task belongs to a project
    if task.project_id:
        await db.projects.update_one(
            {"id": task.project_id},
            {"$inc": {"task_count": 1}}
        )
    
    await db.tasks.insert_one(task_obj.dict())
    return task_obj

@api_router.get("/tasks", response_model=List[Task])
async def get_tasks(project_id: Optional[str] = None, include_templates: bool = False):
    query = {}
    if project_id:
        query["project_id"] = project_id
    if not include_templates:
        query["is_template"] = {"$ne": True}
    
    tasks = await db.tasks.find(query).to_list(1000)
    return [Task(**task) for task in tasks]

@api_router.get("/tasks/{task_id}", response_model=Task)
async def get_task(task_id: str):
    task = await db.tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return Task(**task)

@api_router.put("/tasks/{task_id}", response_model=Task)
async def update_task(task_id: str, task_update: TaskUpdate):
    task = await db.tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    update_data = task_update.dict(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow()
    
    # Set completed_at if status changes to completed
    if task_update.status in [TaskStatus.completed, TaskStatus.approved]:
        update_data["completed_at"] = datetime.utcnow()
    
    # Set started_at if status changes to in_progress
    if task_update.status == TaskStatus.in_progress and task["status"] != "in_progress":
        update_data["started_at"] = datetime.utcnow()
    
    await db.tasks.update_one({"id": task_id}, {"$set": update_data})
    
    updated_task = await db.tasks.find_one({"id": task_id})
    return Task(**updated_task)

@api_router.delete("/tasks/{task_id}")
async def delete_task(task_id: str):
    task = await db.tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Update project task count if task belongs to a project
    if task.get("project_id"):
        await db.projects.update_one(
            {"id": task["project_id"]},
            {"$inc": {"task_count": -1}}
        )
    
    # Remove dependencies pointing to this task
    await db.tasks.update_many(
        {"dependencies": task_id},
        {"$pull": {"dependencies": task_id}}
    )
    
    await db.tasks.delete_one({"id": task_id})
    return {"message": "Task deleted successfully"}

# Time Tracking Routes
@api_router.post("/time-tracking/start/{task_id}")
async def start_time_tracking(task_id: str):
    task = await db.tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Check if there's already an active time entry
    active_entry = await db.time_entries.find_one({"task_id": task_id, "end_time": None})
    if active_entry:
        raise HTTPException(status_code=400, detail="Time tracking already active for this task")
    
    time_entry = {
        "id": str(uuid.uuid4()),
        "task_id": task_id,
        "start_time": datetime.utcnow(),
        "end_time": None,
        "description": ""
    }
    
    await db.time_entries.insert_one(time_entry)
    
    # Update task status to in_progress if it's todo
    if task["status"] == "todo":
        await db.tasks.update_one(
            {"id": task_id},
            {"$set": {"status": "in_progress", "started_at": datetime.utcnow(), "updated_at": datetime.utcnow()}}
        )
    
    return {"message": "Time tracking started", "entry_id": time_entry["id"]}

@api_router.post("/time-tracking/stop/{task_id}")
async def stop_time_tracking(task_id: str):
    active_entry = await db.time_entries.find_one({"task_id": task_id, "end_time": None})
    if not active_entry:
        raise HTTPException(status_code=404, detail="No active time tracking found for this task")
    
    end_time = datetime.utcnow()
    duration_minutes = int((end_time - active_entry["start_time"]).total_seconds() / 60)
    
    await db.time_entries.update_one(
        {"id": active_entry["id"]},
        {"$set": {"end_time": end_time, "duration_minutes": duration_minutes}}
    )
    
    # Update task actual hours
    duration_hours = duration_minutes / 60
    await db.tasks.update_one(
        {"id": task_id},
        {"$inc": {"actual_hours": duration_hours}, "$set": {"updated_at": datetime.utcnow()}}
    )
    
    return {"message": "Time tracking stopped", "duration_minutes": duration_minutes}

@api_router.get("/time-tracking/{task_id}")
async def get_time_entries(task_id: str):
    entries = await db.time_entries.find({"task_id": task_id}).to_list(100)
    return entries

# Task Template Routes
@api_router.post("/templates", response_model=TaskTemplate)
async def create_template(template: TaskTemplateCreate):
    template_dict = template.dict()
    template_obj = TaskTemplate(**template_dict)
    await db.task_templates.insert_one(template_obj.dict())
    return template_obj

@api_router.get("/templates", response_model=List[TaskTemplate])
async def get_templates():
    templates = await db.task_templates.find().to_list(100)
    return [TaskTemplate(**template) for template in templates]

@api_router.post("/templates/{template_id}/create-task")
async def create_task_from_template(template_id: str, project_id: Optional[str] = None):
    template = await db.task_templates.find_one({"id": template_id})
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    task_data = {
        "title": template["title_template"],
        "description": template["description_template"],
        "priority": template["priority"],
        "estimated_hours": template.get("estimated_hours"),
        "task_type": template["task_type"],
        "tags": template["tags"],
        "template_id": template_id,
        "project_id": project_id
    }
    
    task_obj = Task(**task_data)
    
    if project_id:
        await db.projects.update_one(
            {"id": project_id},
            {"$inc": {"task_count": 1}}
        )
    
    await db.tasks.insert_one(task_obj.dict())
    return task_obj

# Comment Routes
@api_router.post("/comments", response_model=Comment)
async def create_comment(comment: CommentCreate):
    comment_obj = Comment(**comment.dict())
    await db.comments.insert_one(comment_obj.dict())
    return comment_obj

@api_router.get("/comments/{task_id}", response_model=List[Comment])
async def get_task_comments(task_id: str):
    comments = await db.comments.find({"task_id": task_id}).sort("created_at", -1).to_list(100)
    return [Comment(**comment) for comment in comments]

# Recurring Tasks Helper
def calculate_next_due_date(current_date: datetime, recurrence_type: RecurrenceType, interval: int) -> datetime:
    if recurrence_type == RecurrenceType.daily:
        return current_date + timedelta(days=interval)
    elif recurrence_type == RecurrenceType.weekly:
        return current_date + timedelta(weeks=interval)
    elif recurrence_type == RecurrenceType.monthly:
        # Simple month addition (doesn't handle edge cases perfectly)
        month = current_date.month
        year = current_date.year
        month += interval
        while month > 12:
            month -= 12
            year += 1
        return current_date.replace(year=year, month=month)
    return current_date

@api_router.post("/recurring-tasks/process")
async def process_recurring_tasks():
    """Check for recurring tasks that need new instances created"""
    now = datetime.utcnow()
    
    # Find recurring tasks where next_due_date has passed
    recurring_tasks = await db.tasks.find({
        "recurrence_type": {"$ne": "none"},
        "next_due_date": {"$lte": now}
    }).to_list(100)
    
    created_count = 0
    
    for task in recurring_tasks:
        # Create new instance of the task
        new_task_data = task.copy()
        new_task_data["id"] = str(uuid.uuid4())
        new_task_data["status"] = "todo"
        new_task_data["completed_at"] = None
        new_task_data["started_at"] = None
        new_task_data["actual_hours"] = 0.0
        new_task_data["time_entries"] = []
        new_task_data["created_at"] = now
        new_task_data["updated_at"] = now
        
        # Calculate new deadline
        if task.get("deadline"):
            interval = task.get("recurrence_interval", 1)
            new_deadline = calculate_next_due_date(
                datetime.fromisoformat(task["deadline"].replace('Z', '+00:00')),
                RecurrenceType(task["recurrence_type"]),
                interval
            )
            new_task_data["deadline"] = new_deadline
        
        await db.tasks.insert_one(new_task_data)
        
        # Update original task's next_due_date
        next_due = calculate_next_due_date(
            datetime.fromisoformat(task["next_due_date"].replace('Z', '+00:00')),
            RecurrenceType(task["recurrence_type"]),
            task.get("recurrence_interval", 1)
        )
        
        await db.tasks.update_one(
            {"id": task["id"]},
            {"$set": {"next_due_date": next_due}}
        )
        
        created_count += 1
    
    return {"message": f"Created {created_count} recurring task instances"}

# Notification Routes
@api_router.get("/notifications")
async def get_notifications():
    """Get upcoming deadlines and overdue tasks as notifications"""
    now = datetime.utcnow()
    tomorrow = now + timedelta(days=1)
    
    notifications = []
    
    # Overdue tasks
    overdue_tasks = await db.tasks.find({
        "deadline": {"$lt": now},
        "status": {"$nin": ["completed", "approved"]}
    }).to_list(50)
    
    for task in overdue_tasks:
        notifications.append({
            "id": str(uuid.uuid4()),
            "title": "Overdue Task",
            "message": f"'{task['title']}' is overdue!",
            "type": "error",
            "task_id": task["id"],
            "created_at": now
        })
    
    # Tasks due tomorrow
    due_tomorrow = await db.tasks.find({
        "deadline": {"$gte": now, "$lt": tomorrow},
        "status": {"$nin": ["completed", "approved"]}
    }).to_list(50)
    
    for task in due_tomorrow:
        notifications.append({
            "id": str(uuid.uuid4()),
            "title": "Due Tomorrow",
            "message": f"'{task['title']}' is due tomorrow",
            "type": "warning",
            "task_id": task["id"],
            "created_at": now
        })
    
    return notifications[:10]  # Limit to 10 notifications

# Project Routes (unchanged)
@api_router.post("/projects", response_model=Project)
async def create_project(project: ProjectCreate):
    project_dict = project.dict()
    project_obj = Project(**project_dict)
    await db.projects.insert_one(project_obj.dict())
    return project_obj

@api_router.get("/projects", response_model=List[Project])
async def get_projects():
    projects = await db.projects.find().to_list(1000)
    return [Project(**project) for project in projects]

@api_router.get("/projects/{project_id}", response_model=Project)
async def get_project(project_id: str):
    project = await db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return Project(**project)

@api_router.put("/projects/{project_id}", response_model=Project)
async def update_project(project_id: str, project_update: ProjectUpdate):
    project = await db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    update_data = project_update.dict(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow()
    
    await db.projects.update_one({"id": project_id}, {"$set": update_data})
    
    updated_project = await db.projects.find_one({"id": project_id})
    return Project(**updated_project)

@api_router.delete("/projects/{project_id}")
async def delete_project(project_id: str):
    project = await db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    # Also delete all tasks belonging to this project
    await db.tasks.delete_many({"project_id": project_id})
    await db.projects.delete_one({"id": project_id})
    return {"message": "Project and associated tasks deleted successfully"}

# GTD Analysis Routes (enhanced)
@api_router.get("/gtd/analysis", response_model=GTDAnalysis)
async def get_gtd_analysis():
    # Get all active tasks
    tasks = await db.tasks.find({"status": {"$nin": ["completed", "approved"]}, "is_template": {"$ne": True}}).to_list(1000)
    task_objects = [Task(**task) for task in tasks]
    
    # Identify high-impact tasks with enhanced algorithm
    high_impact_tasks = []
    for task in task_objects:
        score = 0
        if task.priority == Priority.high:
            score += 3
        elif task.priority == Priority.medium:
            score += 2
        else:
            score += 1
            
        if task.deadline:
            days_until_deadline = (task.deadline - datetime.utcnow()).days
            if days_until_deadline <= 1:
                score += 4  # Very urgent
            elif days_until_deadline <= 3:
                score += 3
            elif days_until_deadline <= 7:
                score += 2
            else:
                score += 1
        
        # Factor in dependencies
        if task.dependencies:
            score += len(task.dependencies) * 0.5
        
        if score >= 4:  # High impact threshold
            high_impact_tasks.append(task)
    
    # Enhanced task batching
    batched_tasks = []
    task_groups = {}
    
    for task in task_objects:
        key = f"{task.task_type}_{task.priority}"
        if key not in task_groups:
            task_groups[key] = []
        task_groups[key].append(task)
    
    for group in task_groups.values():
        if len(group) > 1:
            batched_tasks.append(group)
    
    # Enhanced dependency suggestions
    suggested_dependencies = []
    keywords_map = {
        "contract": ["nda", "agreement", "review"],
        "presentation": ["slides", "document", "prepare"],
        "meeting": ["agenda", "invite", "prepare"],
        "launch": ["test", "review", "deploy"],
        "document": ["draft", "review", "approve"]
    }
    
    for task in task_objects:
        for keyword, dependencies in keywords_map.items():
            if keyword.lower() in task.title.lower():
                for dep in dependencies:
                    matching_tasks = [t for t in task_objects if dep.lower() in t.title.lower() and t.id != task.id]
                    if matching_tasks:
                        suggested_dependencies.append({
                            "main_task": task.title,
                            "main_task_id": task.id,
                            "suggested_dependency": matching_tasks[0].title,
                            "suggested_dependency_id": matching_tasks[0].id,
                            "reason": f"Tasks involving '{keyword}' often require '{dep}'"
                        })
    
    # Enhanced focus recommendation
    pending_count = len(task_objects)
    high_priority_count = len([t for t in task_objects if t.priority == Priority.high])
    overdue_count = len([t for t in task_objects if t.deadline and t.deadline < datetime.utcnow()])
    
    if overdue_count > 0:
        focus_recommendation = f"🚨 You have {overdue_count} overdue task{'s' if overdue_count > 1 else ''}. Address these immediately to get back on track."
    elif high_priority_count > 3:
        focus_recommendation = f"🎯 Focus on your {high_priority_count} high-priority tasks. Complete 2-3 today for maximum impact."
    elif pending_count > 10:
        focus_recommendation = f"📊 You have {pending_count} pending tasks. Consider batching similar tasks to improve efficiency."
    else:
        focus_recommendation = "✨ Great job managing your workload! Focus on your high-impact tasks for maximum productivity."
    
    return GTDAnalysis(
        high_impact_tasks=high_impact_tasks[:5],
        batched_tasks=batched_tasks[:3],
        suggested_dependencies=suggested_dependencies[:5],
        focus_recommendation=focus_recommendation
    )

@api_router.post("/tasks/batch-create")
async def batch_create_tasks(tasks: List[TaskCreate]):
    """Create multiple tasks at once for batching scenarios"""
    created_tasks = []
    
    for task in tasks:
        task_dict = task.dict()
        task_obj = Task(**task_dict)
        
        if task.project_id:
            await db.projects.update_one(
                {"id": task.project_id},
                {"$inc": {"task_count": 1}}
            )
        
        await db.tasks.insert_one(task_obj.dict())
        created_tasks.append(task_obj)
    
    return {"created_tasks": created_tasks, "message": f"Successfully created {len(created_tasks)} tasks"}

# Pomodoro Timer Routes
@api_router.post("/pomodoro/start/{task_id}")
async def start_pomodoro(task_id: str):
    """Start a pomodoro session for a task"""
    task = await db.tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    # Update task status to in_progress if it's todo
    if task["status"] == "todo":
        await db.tasks.update_one(
            {"id": task_id},
            {"$set": {"status": "in_progress", "updated_at": datetime.utcnow()}}
        )
    
    return {
        "message": "Pomodoro session started",
        "task": task["title"],
        "duration": "35 minutes work + 5 minutes break",
        "status": "active"
    }

# Statistics Routes
@api_router.get("/stats/dashboard")
async def get_dashboard_stats():
    """Get comprehensive dashboard statistics including time tracking"""
    total_tasks = await db.tasks.count_documents({"is_template": {"$ne": True}})
    completed_tasks = await db.tasks.count_documents({"status": {"$in": ["completed", "approved"]}, "is_template": {"$ne": True}})
    pending_tasks = await db.tasks.count_documents({"status": {"$in": ["todo", "in_progress"]}, "is_template": {"$ne": True}})
    
    # Overdue tasks
    overdue_tasks = await db.tasks.count_documents({
        "deadline": {"$lt": datetime.utcnow()},
        "status": {"$nin": ["completed", "approved"]},
        "is_template": {"$ne": True}
    })
    
    # Time tracking stats
    total_time_entries = await db.time_entries.count_documents({})
    total_tracked_time = 0
    
    time_entries = await db.time_entries.find({"duration_minutes": {"$exists": True}}).to_list(1000)
    for entry in time_entries:
        total_tracked_time += entry.get("duration_minutes", 0)
    
    total_projects = await db.projects.count_documents({})
    active_projects = await db.projects.count_documents({"status": "active"})
    
    return {
        "tasks": {
            "total": total_tasks,
            "completed": completed_tasks,
            "pending": pending_tasks,
            "overdue": overdue_tasks,
            "completion_rate": round((completed_tasks / total_tasks * 100) if total_tasks > 0 else 0, 1)
        },
        "projects": {
            "total": total_projects,
            "active": active_projects
        },
        "time_tracking": {
            "total_entries": total_time_entries,
            "total_hours": round(total_tracked_time / 60, 1) if total_tracked_time > 0 else 0,
            "total_minutes": total_tracked_time
        }
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

@app.get("/")
async def root():
    return {"message": "Enhanced GTD Task Manager API is running", "version": "2.0.0", "features": ["time_tracking", "templates", "comments", "recurring_tasks", "smart_notifications", "task_dependencies"]}