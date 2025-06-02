import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const EnhancedTaskManager = ({ tasks, refreshData }) => {
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showGTDAnalysis, setShowGTDAnalysis] = useState(false);
  const [showCommentsModal, setShowCommentsModal] = useState(false);
  const [gtdData, setGTDData] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [searchTerm, setSearchTerm] = useState('');
  const [templates, setTemplates] = useState([]);
  const [comments, setComments] = useState([]);
  const [activeTimers, setActiveTimers] = useState({});
  const [newComment, setNewComment] = useState('');

  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium',
    deadline: '',
    task_type: 'general',
    estimated_hours: '',
    tags: [],
    dependencies: [],
    recurrence_type: 'none',
    recurrence_interval: 1
  });

  const [newTemplate, setNewTemplate] = useState({
    name: '',
    title_template: '',
    description_template: '',
    priority: 'medium',
    task_type: 'general',
    estimated_hours: '',
    tags: []
  });

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    if (selectedTask) {
      fetchComments(selectedTask.id);
    }
  }, [selectedTask]);

  const fetchTemplates = async () => {
    try {
      const response = await axios.get(`${API}/templates`);
      setTemplates(response.data);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const fetchComments = async (taskId) => {
    try {
      const response = await axios.get(`${API}/comments/${taskId}`);
      setComments(response.data);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const fetchGTDAnalysis = async () => {
    try {
      const response = await axios.get(`${API}/gtd/analysis`);
      setGTDData(response.data);
      setShowGTDAnalysis(true);
    } catch (error) {
      console.error('Error fetching GTD analysis:', error);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      const taskData = {
        ...newTask,
        deadline: newTask.deadline ? new Date(newTask.deadline).toISOString() : null,
        estimated_hours: newTask.estimated_hours ? parseFloat(newTask.estimated_hours) : null,
        tags: Array.isArray(newTask.tags) ? newTask.tags.filter(tag => tag.trim() !== '') : [],
        dependencies: newTask.dependencies || []
      };
      await axios.post(`${API}/tasks`, taskData);
      setNewTask({
        title: '',
        description: '',
        priority: 'medium',
        deadline: '',
        task_type: 'general',
        estimated_hours: '',
        tags: [],
        dependencies: [],
        recurrence_type: 'none',
        recurrence_interval: 1
      });
      setShowCreateModal(false);
      refreshData();
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const handleCreateTemplate = async (e) => {
    e.preventDefault();
    try {
      const templateData = {
        ...newTemplate,
        estimated_hours: newTemplate.estimated_hours ? parseFloat(newTemplate.estimated_hours) : null,
        tags: Array.isArray(newTemplate.tags) ? newTemplate.tags.filter(tag => tag.trim() !== '') : []
      };
      await axios.post(`${API}/templates`, templateData);
      setNewTemplate({
        name: '',
        title_template: '',
        description_template: '',
        priority: 'medium',
        task_type: 'general',
        estimated_hours: '',
        tags: []
      });
      setShowTemplateModal(false);
      fetchTemplates();
    } catch (error) {
      console.error('Error creating template:', error);
    }
  };

  const createTaskFromTemplate = async (templateId) => {
    try {
      await axios.post(`${API}/templates/${templateId}/create-task`);
      refreshData();
    } catch (error) {
      console.error('Error creating task from template:', error);
    }
  };

  const handleUpdateTask = async (taskId, updates) => {
    try {
      await axios.put(`${API}/tasks/${taskId}`, updates);
      setEditingTask(null);
      refreshData();
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await axios.delete(`${API}/tasks/${taskId}`);
        refreshData();
      } catch (error) {
        console.error('Error deleting task:', error);
      }
    }
  };

  const startTimeTracking = async (taskId) => {
    try {
      await axios.post(`${API}/time-tracking/start/${taskId}`);
      setActiveTimers(prev => ({ ...prev, [taskId]: Date.now() }));
      refreshData();
    } catch (error) {
      console.error('Error starting time tracking:', error);
    }
  };

  const stopTimeTracking = async (taskId) => {
    try {
      await axios.post(`${API}/time-tracking/stop/${taskId}`);
      setActiveTimers(prev => {
        const updated = { ...prev };
        delete updated[taskId];
        return updated;
      });
      refreshData();
    } catch (error) {
      console.error('Error stopping time tracking:', error);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || !selectedTask) return;

    try {
      await axios.post(`${API}/comments`, {
        task_id: selectedTask.id,
        content: newComment,
        author: 'User'
      });
      setNewComment('');
      fetchComments(selectedTask.id);
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  // Enhanced filtering and searching
  const filteredTasks = tasks
    .filter(task => {
      // Search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        if (!task.title.toLowerCase().includes(searchLower) && 
            !task.description.toLowerCase().includes(searchLower) &&
            !task.tags.some(tag => tag.toLowerCase().includes(searchLower))) {
          return false;
        }
      }

      // Status filter
      if (filter === 'all') return true;
      if (filter === 'pending') return task.status === 'todo' || task.status === 'in_progress';
      if (filter === 'completed') return task.status === 'completed' || task.status === 'approved';
      if (filter === 'high_priority') return task.priority === 'high';
      if (filter === 'recurring') return task.recurrence_type && task.recurrence_type !== 'none';
      if (filter === 'overdue') {
        return task.deadline && new Date(task.deadline) < new Date() && 
               task.status !== 'completed' && task.status !== 'approved';
      }
      return task.status === filter;
    })
    .sort((a, b) => {
      if (sortBy === 'priority') {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      if (sortBy === 'deadline') {
        if (!a.deadline && !b.deadline) return 0;
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline) - new Date(b.deadline);
      }
      if (sortBy === 'time_tracked') {
        return (b.actual_hours || 0) - (a.actual_hours || 0);
      }
      return new Date(b.created_at) - new Date(a.created_at);
    });

  const getAvailableDependencies = (currentTaskId) => {
    return tasks.filter(task => task.id !== currentTaskId);
  };

  const TaskCard = ({ task }) => {
    const isOverdue = task.deadline && new Date(task.deadline) < new Date() && 
                     task.status !== 'completed' && task.status !== 'approved';
    const isActive = activeTimers[task.id];
    const elapsedTime = isActive ? Math.floor((Date.now() - activeTimers[task.id]) / 1000) : 0;
    
    return (
      <div className={`task-card ${isOverdue ? 'border-red-500' : ''} ${isActive ? 'border-cyan-500' : ''}`}>
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-semibold text-white text-lg">{task.title}</h3>
          <div className="flex items-center space-x-2">
            {/* Time Tracking Controls */}
            {isActive ? (
              <button
                onClick={() => stopTimeTracking(task.id)}
                className="text-red-400 hover:text-red-300 transition-colors"
                title="Stop Time Tracking"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z"/>
                </svg>
              </button>
            ) : (
              <button
                onClick={() => startTimeTracking(task.id)}
                className="text-green-400 hover:text-green-300 transition-colors"
                title="Start Time Tracking"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"/>
                </svg>
              </button>
            )}

            {/* Comments Button */}
            <button
              onClick={() => {
                setSelectedTask(task);
                setShowCommentsModal(true);
              }}
              className="text-blue-400 hover:text-blue-300 transition-colors"
              title="View Comments"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z"/>
              </svg>
            </button>

            <button
              onClick={() => setEditingTask(task)}
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
              </svg>
            </button>
            <button
              onClick={() => handleDeleteTask(task.id)}
              className="text-red-400 hover:text-red-300 transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"/>
              </svg>
            </button>
          </div>
        </div>
        
        {task.description && (
          <p className="text-slate-300 text-sm mb-3">{task.description}</p>
        )}
        
        {/* Time Tracking Display */}
        {isActive && (
          <div className="time-tracker mb-3">
            <div className="flex items-center">
              <svg className="w-4 h-4 text-cyan-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"/>
              </svg>
              <span className="time-display">
                {Math.floor(elapsedTime / 60)}:{(elapsedTime % 60).toString().padStart(2, '0')}
              </span>
              <span className="text-cyan-400 text-sm ml-2">tracking...</span>
            </div>
          </div>
        )}
        
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <span className={`priority-${task.priority}`}>
              {task.priority.toUpperCase()}
            </span>
            <span className={`status-${task.status.replace('_', '')}`}>
              {task.status.replace('_', ' ').toUpperCase()}
            </span>
            {task.template_id && (
              <span className="template-badge">TEMPLATE</span>
            )}
            {task.recurrence_type && task.recurrence_type !== 'none' && (
              <span className="recurring-badge">
                {task.recurrence_type.toUpperCase()}
              </span>
            )}
          </div>
          
          <div className="text-right">
            {task.estimated_hours && (
              <span className="text-xs text-slate-400 block">
                Est: {task.estimated_hours}h
              </span>
            )}
            {task.actual_hours > 0 && (
              <span className="text-xs text-cyan-400 block">
                Tracked: {task.actual_hours.toFixed(1)}h
              </span>
            )}
          </div>
        </div>
        
        {task.deadline && (
          <div className={`text-sm mb-2 ${isOverdue ? 'text-red-400' : 'text-slate-400'}`}>
            Due: {new Date(task.deadline).toLocaleDateString()}
            {isOverdue && <span className="ml-2 font-semibold">(OVERDUE)</span>}
          </div>
        )}
        
        {task.dependencies && task.dependencies.length > 0 && (
          <div className="mb-2">
            <p className="text-xs text-slate-400 mb-1">Dependencies:</p>
            <div className="dependency-line">
              {task.dependencies.map(depId => {
                const depTask = tasks.find(t => t.id === depId);
                return depTask ? (
                  <div key={depId} className="dependency-item mb-1">
                    {depTask.title}
                  </div>
                ) : null;
              })}
            </div>
          </div>
        )}
        
        {task.tags && task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {task.tags.map((tag, index) => (
              <span key={index} className="bg-slate-700 text-slate-300 text-xs px-2 py-1 rounded-full">
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Enhanced Task Manager</h1>
            <p className="text-slate-400">Advanced task management with time tracking, templates, and smart features</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => setShowTemplateModal(true)}
              className="btn-secondary flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2H4zm0 2h12v8H4V6z"/>
              </svg>
              New Template
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary flex items-center"
            >
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"/>
              </svg>
              New Task
            </button>
          </div>
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
        <button className="nav-item nav-item-active">
          <svg className="w-5 h-5 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
            <path fillRule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 001 1h6a1 1 0 001-1V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3z"/>
          </svg>
          Tasks
        </button>
        <button 
          onClick={() => navigate('/projects')} 
          className="nav-item nav-item-inactive"
        >
          <svg className="w-5 h-5 inline mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z"/>
          </svg>
          Projects
        </button>
      </div>

      {/* Templates and GTD Analysis */}
      <div className="flex flex-wrap gap-4 mb-6">
        <button
          onClick={fetchGTDAnalysis}
          className="btn-primary flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          Get GTD Analysis
        </button>

        {templates.length > 0 && (
          <div className="flex space-x-2">
            <span className="text-slate-400 py-2">Quick Templates:</span>
            {templates.slice(0, 3).map(template => (
              <button
                key={template.id}
                onClick={() => createTaskFromTemplate(template.id)}
                className="btn-secondary text-sm"
              >
                {template.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Enhanced Filters and Search */}
      <div className="bg-slate-800 border border-slate-600 rounded-2xl p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="text-slate-300 text-sm font-medium mb-1 block">Search:</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search tasks..."
              className="form-input w-full"
            />
          </div>
          
          <div>
            <label className="text-slate-300 text-sm font-medium mb-1 block">Filter:</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="form-select w-full"
            >
              <option value="all">All Tasks</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="high_priority">High Priority</option>
              <option value="recurring">Recurring</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
          
          <div>
            <label className="text-slate-300 text-sm font-medium mb-1 block">Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="form-select w-full"
            >
              <option value="created_at">Created Date</option>
              <option value="priority">Priority</option>
              <option value="deadline">Deadline</option>
              <option value="time_tracked">Time Tracked</option>
            </select>
          </div>
          
          <div className="flex items-end">
            <span className="text-slate-300 text-sm">
              Showing {filteredTasks.length} of {tasks.length} tasks
            </span>
          </div>
        </div>
      </div>

      {/* Tasks Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTasks.length > 0 ? (
          filteredTasks.map(task => (
            <TaskCard key={task.id} task={task} />
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <svg className="w-16 h-16 text-slate-600 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
              <path fillRule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 001 1h6a1 1 0 001-1V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5z"/>
            </svg>
            <p className="text-slate-400 text-lg">No tasks found</p>
            <p className="text-slate-500 text-sm">
              {searchTerm ? 'Try adjusting your search or filters' : 'Create your first task to get started!'}
            </p>
          </div>
        )}
      </div>

      {/* Create Task Modal - Enhanced */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content max-w-3xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Create Enhanced Task</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"/>
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-slate-300 text-sm font-medium mb-1 block">Title *</label>
                  <input
                    type="text"
                    required
                    value={newTask.title}
                    onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                    className="form-input w-full"
                    placeholder="Enter task title"
                  />
                </div>
                
                <div className="col-span-2">
                  <label className="text-slate-300 text-sm font-medium mb-1 block">Description</label>
                  <textarea
                    value={newTask.description}
                    onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                    className="form-input w-full h-24 resize-none"
                    placeholder="Enter task description"
                  />
                </div>
                
                <div>
                  <label className="text-slate-300 text-sm font-medium mb-1 block">Priority</label>
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
                  <label className="text-slate-300 text-sm font-medium mb-1 block">Task Type</label>
                  <select
                    value={newTask.task_type}
                    onChange={(e) => setNewTask({...newTask, task_type: e.target.value})}
                    className="form-select w-full"
                  >
                    <option value="general">General</option>
                    <option value="meeting">Meeting</option>
                    <option value="document">Document</option>
                    <option value="development">Development</option>
                    <option value="research">Research</option>
                    <option value="communication">Communication</option>
                  </select>
                </div>
                
                <div>
                  <label className="text-slate-300 text-sm font-medium mb-1 block">Deadline</label>
                  <input
                    type="datetime-local"
                    value={newTask.deadline}
                    onChange={(e) => setNewTask({...newTask, deadline: e.target.value})}
                    className="form-input w-full"
                  />
                </div>
                
                <div>
                  <label className="text-slate-300 text-sm font-medium mb-1 block">Estimated Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={newTask.estimated_hours}
                    onChange={(e) => setNewTask({...newTask, estimated_hours: e.target.value})}
                    className="form-input w-full"
                    placeholder="2.5"
                  />
                </div>
                
                <div>
                  <label className="text-slate-300 text-sm font-medium mb-1 block">Recurrence</label>
                  <select
                    value={newTask.recurrence_type}
                    onChange={(e) => setNewTask({...newTask, recurrence_type: e.target.value})}
                    className="form-select w-full"
                  >
                    <option value="none">None</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                
                <div>
                  <label className="text-slate-300 text-sm font-medium mb-1 block">Recurrence Interval</label>
                  <input
                    type="number"
                    min="1"
                    value={newTask.recurrence_interval}
                    onChange={(e) => setNewTask({...newTask, recurrence_interval: parseInt(e.target.value)})}
                    className="form-input w-full"
                    disabled={newTask.recurrence_type === 'none'}
                  />
                </div>
                
                <div className="col-span-2">
                  <label className="text-slate-300 text-sm font-medium mb-1 block">Dependencies</label>
                  <select
                    multiple
                    value={newTask.dependencies}
                    onChange={(e) => setNewTask({...newTask, dependencies: Array.from(e.target.selectedOptions, option => option.value)})}
                    className="form-select w-full h-24"
                  >
                    {getAvailableDependencies().map(task => (
                      <option key={task.id} value={task.id}>{task.title}</option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-400 mt-1">Hold Ctrl/Cmd to select multiple tasks</p>
                </div>
                
                <div className="col-span-2">
                  <label className="text-slate-300 text-sm font-medium mb-1 block">Tags (comma-separated)</label>
                  <input
                    type="text"
                    value={Array.isArray(newTask.tags) ? newTask.tags.join(', ') : ''}
                    onChange={(e) => setNewTask({...newTask, tags: e.target.value.split(',').map(tag => tag.trim())})}
                    className="form-input w-full"
                    placeholder="urgent, client-work, documentation"
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
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Template Modal */}
      {showTemplateModal && (
        <div className="modal-overlay">
          <div className="modal-content max-w-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Create Task Template</h2>
              <button
                onClick={() => setShowTemplateModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"/>
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleCreateTemplate} className="space-y-4">
              <div>
                <label className="text-slate-300 text-sm font-medium mb-1 block">Template Name *</label>
                <input
                  type="text"
                  required
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({...newTemplate, name: e.target.value})}
                  className="form-input w-full"
                  placeholder="e.g., Weekly Report Template"
                />
              </div>
              
              <div>
                <label className="text-slate-300 text-sm font-medium mb-1 block">Title Template *</label>
                <input
                  type="text"
                  required
                  value={newTemplate.title_template}
                  onChange={(e) => setNewTemplate({...newTemplate, title_template: e.target.value})}
                  className="form-input w-full"
                  placeholder="e.g., Weekly Report - Week of [DATE]"
                />
              </div>
              
              <div>
                <label className="text-slate-300 text-sm font-medium mb-1 block">Description Template</label>
                <textarea
                  value={newTemplate.description_template}
                  onChange={(e) => setNewTemplate({...newTemplate, description_template: e.target.value})}
                  className="form-input w-full h-24 resize-none"
                  placeholder="Template description with placeholders"
                />
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-slate-300 text-sm font-medium mb-1 block">Priority</label>
                  <select
                    value={newTemplate.priority}
                    onChange={(e) => setNewTemplate({...newTemplate, priority: e.target.value})}
                    className="form-select w-full"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                
                <div>
                  <label className="text-slate-300 text-sm font-medium mb-1 block">Task Type</label>
                  <select
                    value={newTemplate.task_type}
                    onChange={(e) => setNewTemplate({...newTemplate, task_type: e.target.value})}
                    className="form-select w-full"
                  >
                    <option value="general">General</option>
                    <option value="meeting">Meeting</option>
                    <option value="document">Document</option>
                    <option value="development">Development</option>
                    <option value="research">Research</option>
                    <option value="communication">Communication</option>
                  </select>
                </div>
                
                <div>
                  <label className="text-slate-300 text-sm font-medium mb-1 block">Est. Hours</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={newTemplate.estimated_hours}
                    onChange={(e) => setNewTemplate({...newTemplate, estimated_hours: e.target.value})}
                    className="form-input w-full"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-slate-300 text-sm font-medium mb-1 block">Default Tags</label>
                <input
                  type="text"
                  value={Array.isArray(newTemplate.tags) ? newTemplate.tags.join(', ') : ''}
                  onChange={(e) => setNewTemplate({...newTemplate, tags: e.target.value.split(',').map(tag => tag.trim())})}
                  className="form-input w-full"
                  placeholder="template, recurring, weekly"
                />
              </div>
              
              <div className="flex justify-end space-x-4 mt-6">
                <button
                  type="button"
                  onClick={() => setShowTemplateModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Comments Modal */}
      {showCommentsModal && selectedTask && (
        <div className="modal-overlay">
          <div className="modal-content max-w-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Comments: {selectedTask.title}</h2>
              <button
                onClick={() => setShowCommentsModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"/>
                </svg>
              </button>
            </div>
            
            {/* Comments List */}
            <div className="space-y-3 mb-6 max-h-60 overflow-y-auto">
              {comments.length > 0 ? (
                comments.map(comment => (
                  <div key={comment.id} className="comment-item">
                    <div className="flex items-center justify-between mb-2">
                      <span className="comment-author">{comment.author}</span>
                      <span className="comment-time">
                        {new Date(comment.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="comment-text">{comment.content}</p>
                  </div>
                ))
              ) : (
                <p className="text-slate-400 text-center py-4">No comments yet</p>
              )}
            </div>
            
            {/* Add Comment Form */}
            <form onSubmit={handleAddComment} className="space-y-4">
              <div>
                <label className="text-slate-300 text-sm font-medium mb-1 block">Add Comment</label>
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="form-input w-full h-24 resize-none"
                  placeholder="Enter your comment..."
                  required
                />
              </div>
              
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => setShowCommentsModal(false)}
                  className="btn-secondary"
                >
                  Close
                </button>
                <button type="submit" className="btn-primary">
                  Add Comment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GTD Analysis Modal (Enhanced) */}
      {showGTDAnalysis && gtdData && (
        <div className="modal-overlay">
          <div className="modal-content max-w-5xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Enhanced GTD Analysis</h2>
              <button
                onClick={() => setShowGTDAnalysis(false)}
                className="text-slate-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"/>
                </svg>
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Focus Recommendation */}
              <div className="bg-cyan-900 bg-opacity-50 border border-cyan-600 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-cyan-300 mb-2">Smart Focus Recommendation</h3>
                <p className="text-slate-300">{gtdData.focus_recommendation}</p>
              </div>
              
              {/* High Impact Tasks */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">🎯 High Impact Tasks (20% that yield 80%)</h3>
                <div className="space-y-2">
                  {gtdData.high_impact_tasks.length > 0 ? (
                    gtdData.high_impact_tasks.map(task => (
                      <div key={task.id} className="bg-emerald-900 bg-opacity-30 border border-emerald-600 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-white font-medium">{task.title}</span>
                          <div className="flex items-center space-x-2">
                            <span className={`priority-${task.priority}`}>{task.priority.toUpperCase()}</span>
                            {task.deadline && (
                              <span className="text-xs text-slate-400">
                                Due: {new Date(task.deadline).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-400">All current tasks are well-balanced. Great job!</p>
                  )}
                </div>
              </div>
              
              {/* Batched Tasks */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">📦 Similar Tasks (Batch Together)</h3>
                <div className="space-y-3">
                  {gtdData.batched_tasks.length > 0 ? (
                    gtdData.batched_tasks.map((batch, index) => (
                      <div key={index} className="bg-blue-900 bg-opacity-30 border border-blue-600 rounded-lg p-3">
                        <h4 className="text-blue-300 font-medium mb-2">
                          Batch {index + 1}: {batch[0].task_type} tasks ({batch.length} items)
                        </h4>
                        <div className="space-y-1">
                          {batch.map(task => (
                            <div key={task.id} className="text-slate-300 text-sm">• {task.title}</div>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-400">No obvious batching opportunities found.</p>
                  )}
                </div>
              </div>
              
              {/* Enhanced Dependencies */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">🔗 Suggested Task Dependencies</h3>
                <div className="space-y-2">
                  {gtdData.suggested_dependencies.length > 0 ? (
                    gtdData.suggested_dependencies.map((dep, index) => (
                      <div key={index} className="bg-amber-900 bg-opacity-30 border border-amber-600 rounded-lg p-3">
                        <div className="text-white font-medium">{dep.main_task}</div>
                        <div className="text-amber-300 text-sm">→ Consider: {dep.suggested_dependency}</div>
                        <div className="text-slate-400 text-xs mt-1">{dep.reason}</div>
                        {dep.main_task_id && dep.suggested_dependency_id && (
                          <button
                            onClick={() => {
                              // Auto-add dependency
                              handleUpdateTask(dep.main_task_id, {
                                dependencies: [...(tasks.find(t => t.id === dep.main_task_id)?.dependencies || []), dep.suggested_dependency_id]
                              });
                            }}
                            className="btn-warning text-xs mt-2"
                          >
                            Add Dependency
                          </button>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-400">No obvious dependencies detected.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Task Modal (Enhanced) */}
      {editingTask && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Edit Task</h2>
              <button
                onClick={() => setEditingTask(null)}
                className="text-slate-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"/>
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-slate-300 text-sm font-medium mb-1 block">Status</label>
                <select
                  value={editingTask.status}
                  onChange={(e) => setEditingTask({...editingTask, status: e.target.value})}
                  className="form-select w-full"
                >
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="approved">Approved</option>
                </select>
              </div>
              
              <div>
                <label className="text-slate-300 text-sm font-medium mb-1 block">Priority</label>
                <select
                  value={editingTask.priority}
                  onChange={(e) => setEditingTask({...editingTask, priority: e.target.value})}
                  className="form-select w-full"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              
              <div>
                <label className="text-slate-300 text-sm font-medium mb-1 block">Actual Hours Worked</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={editingTask.actual_hours || 0}
                  onChange={(e) => setEditingTask({...editingTask, actual_hours: parseFloat(e.target.value) || 0})}
                  className="form-input w-full"
                />
              </div>
              
              <div className="flex justify-end space-x-4 mt-6">
                <button
                  onClick={() => setEditingTask(null)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleUpdateTask(editingTask.id, {
                    status: editingTask.status,
                    priority: editingTask.priority,
                    actual_hours: editingTask.actual_hours
                  })}
                  className="btn-primary"
                >
                  Update Task
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedTaskManager;