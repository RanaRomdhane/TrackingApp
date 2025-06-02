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
from datetime import datetime
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI(title="GTD Task Manager API", version="1.0.0")

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

# Task Models
class TaskBase(BaseModel):
    title: str
    description: Optional[str] = ""
    priority: Priority = Priority.medium
    status: TaskStatus = TaskStatus.todo
    deadline: Optional[datetime] = None
    project_id: Optional[str] = None
    task_type: Optional[str] = "general"
    estimated_hours: Optional[float] = None
    tags: List[str] = []

class TaskCreate(TaskBase):
    pass

class Task(TaskBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[Priority] = None
    status: Optional[TaskStatus] = None
    deadline: Optional[datetime] = None
    task_type: Optional[str] = None
    estimated_hours: Optional[float] = None
    tags: Optional[List[str]] = None

# Project Models
class ProjectBase(BaseModel):
    title: str
    description: Optional[str] = ""
    status: ProjectStatus = ProjectStatus.active
    deadline: Optional[datetime] = None
    color: Optional[str] = "#8B5CF6"  # Purple default

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

# Task Routes
@api_router.post("/tasks", response_model=Task)
async def create_task(task: TaskCreate):
    task_dict = task.dict()
    task_obj = Task(**task_dict)
    
    # Update project task count if task belongs to a project
    if task.project_id:
        await db.projects.update_one(
            {"id": task.project_id},
            {"$inc": {"task_count": 1}}
        )
    
    await db.tasks.insert_one(task_obj.dict())
    return task_obj

@api_router.get("/tasks", response_model=List[Task])
async def get_tasks(project_id: Optional[str] = None):
    query = {}
    if project_id:
        query["project_id"] = project_id
    
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
    
    await db.tasks.delete_one({"id": task_id})
    return {"message": "Task deleted successfully"}

# Project Routes
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

# GTD Analysis Routes
@api_router.get("/gtd/analysis", response_model=GTDAnalysis)
async def get_gtd_analysis():
    # Get all active tasks
    tasks = await db.tasks.find({"status": {"$nin": ["completed", "approved"]}}).to_list(1000)
    task_objects = [Task(**task) for task in tasks]
    
    # Identify high-impact tasks (20% that yield 80% results)
    # Simple algorithm: high priority + near deadline
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
            if days_until_deadline <= 3:
                score += 3
            elif days_until_deadline <= 7:
                score += 2
            else:
                score += 1
        
        if score >= 4:  # High impact threshold
            high_impact_tasks.append(task)
    
    # Group similar tasks for batching
    batched_tasks = []
    task_groups = {}
    
    for task in task_objects:
        key = f"{task.task_type}_{task.priority}"
        if key not in task_groups:
            task_groups[key] = []
        task_groups[key].append(task)
    
    # Only include groups with more than 1 task
    for group in task_groups.values():
        if len(group) > 1:
            batched_tasks.append(group)
    
    # Suggest dependencies (simple keyword matching)
    suggested_dependencies = []
    keywords_map = {
        "contract": ["nda", "agreement"],
        "presentation": ["slides", "document"],
        "meeting": ["agenda", "invite"],
        "launch": ["test", "review"]
    }
    
    for task in task_objects:
        for keyword, dependencies in keywords_map.items():
            if keyword.lower() in task.title.lower():
                for dep in dependencies:
                    matching_tasks = [t for t in task_objects if dep.lower() in t.title.lower() and t.id != task.id]
                    if matching_tasks:
                        suggested_dependencies.append({
                            "main_task": task.title,
                            "suggested_dependency": matching_tasks[0].title,
                            "reason": f"Tasks involving '{keyword}' often require '{dep}'"
                        })
    
    # Generate focus recommendation
    pending_count = len(task_objects)
    high_priority_count = len([t for t in task_objects if t.priority == Priority.high])
    
    if high_priority_count > 3:
        focus_recommendation = f"You have {high_priority_count} high-priority tasks. Focus on completing 2-3 today before adding new tasks."
    elif pending_count > 10:
        focus_recommendation = f"You have {pending_count} pending tasks. Consider batching similar tasks to improve efficiency."
    else:
        focus_recommendation = "Great job managing your workload! Focus on your high-impact tasks for maximum productivity."
    
    return GTDAnalysis(
        high_impact_tasks=high_impact_tasks[:5],  # Top 5
        batched_tasks=batched_tasks[:3],  # Top 3 groups
        suggested_dependencies=suggested_dependencies[:3],  # Top 3 suggestions
        focus_recommendation=focus_recommendation
    )

@api_router.post("/tasks/batch-create")
async def batch_create_tasks(tasks: List[TaskCreate]):
    """Create multiple tasks at once for batching scenarios"""
    created_tasks = []
    
    for task in tasks:
        task_dict = task.dict()
        task_obj = Task(**task_dict)
        
        # Update project task count if task belongs to a project
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
    
    # Log pomodoro session (you can extend this to track actual sessions)
    return {
        "message": "Pomodoro session started",
        "task": task["title"],
        "duration": "35 minutes work + 5 minutes break",
        "status": "active"
    }

# Statistics Routes
@api_router.get("/stats/dashboard")
async def get_dashboard_stats():
    """Get comprehensive dashboard statistics"""
    total_tasks = await db.tasks.count_documents({})
    completed_tasks = await db.tasks.count_documents({"status": {"$in": ["completed", "approved"]}})
    pending_tasks = await db.tasks.count_documents({"status": {"$in": ["todo", "in_progress"]}})
    
    # Overdue tasks
    overdue_tasks = await db.tasks.count_documents({
        "deadline": {"$lt": datetime.utcnow()},
        "status": {"$nin": ["completed", "approved"]}
    })
    
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
    return {"message": "GTD Task Manager API is running", "version": "1.0.0"}