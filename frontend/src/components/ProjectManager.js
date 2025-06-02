import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const ProjectManager = ({ projects, refreshData }) => {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectTasks, setProjectTasks] = useState([]);
  const [draggingTask, setDraggingTask] = useState(null);

  const [newProject, setNewProject] = useState({
    title: '',
    description: '',
    deadline: '',
    color: '#8B5CF6'
  });

  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium',
    deadline: '',
    project_id: projectId || ''
  });

  // Fetch project tasks when project is selected
  useEffect(() => {
    if (projectId) {
      const project = projects.find(p => p.id === projectId);
      setSelectedProject(project);
      fetchProjectTasks(projectId);
    }
  }, [projectId, projects]);

  const fetchProjectTasks = async (id) => {
    try {
      const response = await axios.get(`${API}/tasks?project_id=${id}`);
      setProjectTasks(response.data);
    } catch (error) {
      console.error('Error fetching project tasks:', error);
    }
  };

  // Create project
  const handleCreateProject = async (e) => {
    e.preventDefault();
    try {
      const projectData = {
        ...newProject,
        deadline: newProject.deadline ? new Date(newProject.deadline).toISOString() : null
      };
      await axios.post(`${API}/projects`, projectData);
      setNewProject({
        title: '',
        description: '',
        deadline: '',
        color: '#8B5CF6'
      });
      setShowCreateModal(false);
      refreshData();
    } catch (error) {
      console.error('Error creating project:', error);
    }
  };

  // Create task for project
  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      const taskData = {
        ...newTask,
        deadline: newTask.deadline ? new Date(newTask.deadline).toISOString() : null,
        project_id: selectedProject.id
      };
      await axios.post(`${API}/tasks`, taskData);
      setNewTask({
        title: '',
        description: '',
        priority: 'medium',
        deadline: '',
        project_id: selectedProject.id
      });
      setShowTaskModal(false);
      fetchProjectTasks(selectedProject.id);
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  // Update task status
  const handleUpdateTaskStatus = async (taskId, newStatus) => {
    try {
      await axios.put(`${API}/tasks/${taskId}`, { status: newStatus });
      fetchProjectTasks(selectedProject.id);
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  // Delete project
  const handleDeleteProject = async (projectId) => {
    if (window.confirm('Are you sure? This will also delete all associated tasks.')) {
      try {
        await axios.delete(`${API}/projects/${projectId}`);
        refreshData();
        if (selectedProject && selectedProject.id === projectId) {
          navigate('/projects');
        }
      } catch (error) {
        console.error('Error deleting project:', error);
      }
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e, task) => {
    setDraggingTask(task);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, newStatus) => {
    e.preventDefault();
    if (draggingTask && draggingTask.status !== newStatus) {
      handleUpdateTaskStatus(draggingTask.id, newStatus);
    }
    setDraggingTask(null);
  };

  // Group tasks by status
  const tasksByStatus = {
    todo: projectTasks.filter(task => task.status === 'todo'),
    in_progress: projectTasks.filter(task => task.status === 'in_progress'),
    completed: projectTasks.filter(task => task.status === 'completed'),
    approved: projectTasks.filter(task => task.status === 'approved')
  };

  const statusLabels = {
    todo: 'To Do',
    in_progress: 'In Progress',
    completed: 'Completed',
    approved: 'Approved'
  };

  const statusColors = {
    todo: 'border-gray-500',
    in_progress: 'border-blue-500',
    completed: 'border-green-500',
    approved: 'border-purple-500'
  };

  const TaskCard = ({ task }) => {
    return (
      <div
        draggable
        onDragStart={(e) => handleDragStart(e, task)}
        className={`task-card cursor-move ${draggingTask?.id === task.id ? 'task-card-dragging' : ''}`}
      >
        <h4 className="font-medium text-white mb-2">{task.title}</h4>
        {task.description && (
          <p className="text-gray-300 text-sm mb-2">{task.description}</p>
        )}
        <div className="flex items-center justify-between">
          <span className={`priority-${task.priority}`}>
            {task.priority.toUpperCase()}
          </span>
          {task.deadline && (
            <span className="text-xs text-gray-400">
              {new Date(task.deadline).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
    );
  };

  const KanbanColumn = ({ status, tasks }) => {
    return (
      <div
        className={`kanban-column ${statusColors[status]}`}
        onDragOver={handleDragOver}
        onDrop={(e) => handleDrop(e, status)}
      >
        <div className="kanban-header">
          <div className="flex items-center justify-between">
            <span>{statusLabels[status]}</span>
            <span className="bg-gray-700 text-gray-300 px-2 py-1 rounded-full text-xs">
              {tasks.length}
            </span>
          </div>
        </div>
        <div className="space-y-3">
          {tasks.map(task => (
            <TaskCard key={task.id} task={task} />
          ))}
          {tasks.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-2 opacity-50" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z"/>
              </svg>
              <p className="text-sm">Drop tasks here</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // If viewing a specific project
  if (selectedProject) {
    return (
      <div className="min-h-screen bg-gray-900 p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <button
              onClick={() => navigate('/projects')}
              className="text-gray-400 hover:text-white mr-4"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z"/>
              </svg>
            </button>
            <div>
              <h1 className="text-4xl font-bold text-white">{selectedProject.title}</h1>
              <p className="text-gray-400">{selectedProject.description}</p>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="bg-gray-700 text-gray-300 px-3 py-1 rounded-full text-sm">
                {projectTasks.length} tasks
              </span>
              {selectedProject.deadline && (
                <span className="text-gray-400 text-sm">
                  Due: {new Date(selectedProject.deadline).toLocaleDateString()}
                </span>
              )}
            </div>
            <button
              onClick={() => setShowTaskModal(true)}
              className="btn-primary flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"/>
              </svg>
              Add Task
            </button>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Object.entries(tasksByStatus).map(([status, tasks]) => (
            <KanbanColumn
              key={status}
              status={status}
              tasks={tasks}
            />
          ))}
        </div>

        {/* Add Task Modal */}
        {showTaskModal && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Add Task to {selectedProject.title}</h2>
                <button
                  onClick={() => setShowTaskModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"/>
                  </svg>
                </button>
              </div>
              
              <form onSubmit={handleCreateTask} className="space-y-4">
                <div>
                  <label className="text-gray-300 text-sm font-medium mb-1 block">Title *</label>
                  <input
                    type="text"
                    required
                    value={newTask.title}
                    onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                    className="form-input w-full"
                    placeholder="Enter task title"
                  />
                </div>
                
                <div>
                  <label className="text-gray-300 text-sm font-medium mb-1 block">Description</label>
                  <textarea
                    value={newTask.description}
                    onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                    className="form-input w-full h-24 resize-none"
                    placeholder="Enter task description"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-gray-300 text-sm font-medium mb-1 block">Priority</label>
                    <select
                      value={newTask.priority}
                      onChange={(e) => setNewTask({...newTask, priority: e.target.value})}
                      className="form-select w-full"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="text-gray-300 text-sm font-medium mb-1 block">Deadline</label>
                    <input
                      type="datetime-local"
                      value={newTask.deadline}
                      onChange={(e) => setNewTask({...newTask, deadline: e.target.value})}
                      className="form-input w-full"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-4 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowTaskModal(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Add Task
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Projects overview
  return (
    <div className="min-h-screen bg-gray-900 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Project Manager</h1>
            <p className="text-gray-400">Organize tasks by projects with Kanban boards</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"/>
            </svg>
            New Project
          </button>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex space-x-4 mb-8">
        <button 
          onClick={() => navigate('/')} 
          className="nav-item nav-item-inactive"
        >
          <svg className="w-5 h-5 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 2L3 7v11a1 1 0 001 1h12a1 1 0 001-1V7l-7-5z"/>
          </svg>
          Dashboard
        </button>
        <button 
          onClick={() => navigate('/tasks')} 
          className="nav-item nav-item-inactive"
        >
          <svg className="w-5 h-5 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
            <path fillRule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 001 1h6a1 1 0 001-1V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3z"/>
          </svg>
          Tasks
        </button>
        <button className="nav-item nav-item-active">
          <svg className="w-5 h-5 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z"/>
          </svg>
          Projects
        </button>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.length > 0 ? (
          projects.map(project => (
            <div key={project.id} className="task-card cursor-pointer group">
              <div className="flex items-start justify-between mb-4">
                <div 
                  onClick={() => navigate(`/project/${project.id}`)}
                  className="flex-1"
                >
                  <h3 className="font-semibold text-white text-lg mb-2">{project.title}</h3>
                  {project.description && (
                    <p className="text-gray-300 text-sm mb-3">{project.description}</p>
                  )}
                </div>
                <button
                  onClick={() => handleDeleteProject(project.id)}
                  className="text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"/>
                  </svg>
                </button>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className={`bg-${project.status === 'active' ? 'green' : 'gray'}-600 text-white px-2 py-1 rounded-full text-xs font-medium`}>
                    {project.status.toUpperCase()}
                  </span>
                  <span className="bg-gray-700 text-gray-300 px-2 py-1 rounded-full text-xs">
                    {project.task_count || 0} tasks
                  </span>
                </div>
                {project.deadline && (
                  <span className="text-xs text-gray-400">
                    Due: {new Date(project.deadline).toLocaleDateString()}
                  </span>
                )}
              </div>
              
              <div 
                onClick={() => navigate(`/project/${project.id}`)}
                className="mt-4 flex items-center text-purple-400 hover:text-purple-300 transition-colors"
              >
                <span className="text-sm font-medium">Open Project</span>
                <svg className="w-4 h-4 ml-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"/>
                </svg>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z"/>
            </svg>
            <p className="text-gray-400 text-lg">No projects found</p>
            <p className="text-gray-500 text-sm">Create your first project to get started!</p>
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Create New Project</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"/>
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleCreateProject} className="space-y-4">
              <div>
                <label className="text-gray-300 text-sm font-medium mb-1 block">Title *</label>
                <input
                  type="text"
                  required
                  value={newProject.title}
                  onChange={(e) => setNewProject({...newProject, title: e.target.value})}
                  className="form-input w-full"
                  placeholder="Enter project title"
                />
              </div>
              
              <div>
                <label className="text-gray-300 text-sm font-medium mb-1 block">Description</label>
                <textarea
                  value={newProject.description}
                  onChange={(e) => setNewProject({...newProject, description: e.target.value})}
                  className="form-input w-full h-24 resize-none"
                  placeholder="Enter project description"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-300 text-sm font-medium mb-1 block">Deadline</label>
                  <input
                    type="datetime-local"
                    value={newProject.deadline}
                    onChange={(e) => setNewProject({...newProject, deadline: e.target.value})}
                    className="form-input w-full"
                  />
                </div>
                
                <div>
                  <label className="text-gray-300 text-sm font-medium mb-1 block">Color</label>
                  <input
                    type="color"
                    value={newProject.color}
                    onChange={(e) => setNewProject({...newProject, color: e.target.value})}
                    className="form-input w-full h-10"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectManager;