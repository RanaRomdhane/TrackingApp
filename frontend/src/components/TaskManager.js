import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const TaskManager = ({ tasks, refreshData }) => {
  const navigate = useNavigate();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showGTDAnalysis, setShowGTDAnalysis] = useState(false);
  const [gtdData, setGTDData] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [showPomodoro, setShowPomodoro] = useState(null);

  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium',
    deadline: '',
    task_type: 'general',
    estimated_hours: '',
    tags: []
  });

  // Fetch GTD analysis
  const fetchGTDAnalysis = async () => {
    try {
      const response = await axios.get(`${API}/gtd/analysis`);
      setGTDData(response.data);
      setShowGTDAnalysis(true);
    } catch (error) {
      console.error('Error fetching GTD analysis:', error);
    }
  };

  // Create task
  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      const taskData = {
        ...newTask,
        deadline: newTask.deadline ? new Date(newTask.deadline).toISOString() : null,
        estimated_hours: newTask.estimated_hours ? parseFloat(newTask.estimated_hours) : null,
        tags: newTask.tags.filter(tag => tag.trim() !== '')
      };
      await axios.post(`${API}/tasks`, taskData);
      setNewTask({
        title: '',
        description: '',
        priority: 'medium',
        deadline: '',
        task_type: 'general',
        estimated_hours: '',
        tags: []
      });
      setShowCreateModal(false);
      refreshData();
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  // Update task
  const handleUpdateTask = async (taskId, updates) => {
    try {
      await axios.put(`${API}/tasks/${taskId}`, updates);
      setEditingTask(null);
      refreshData();
    } catch (error) {
      console.error('Error updating task:', error);
    }
  };

  // Delete task
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

  // Start Pomodoro
  const startPomodoro = async (taskId) => {
    try {
      await axios.post(`${API}/pomodoro/start/${taskId}`);
      setShowPomodoro(taskId);
      
      // Auto-hide after 5 seconds
      setTimeout(() => {
        setShowPomodoro(null);
      }, 5000);
      
      refreshData();
    } catch (error) {
      console.error('Error starting pomodoro:', error);
    }
  };

  // Filter and sort tasks
  const filteredTasks = tasks
    .filter(task => {
      if (filter === 'all') return true;
      if (filter === 'pending') return task.status === 'todo' || task.status === 'in_progress';
      if (filter === 'completed') return task.status === 'completed' || task.status === 'approved';
      if (filter === 'high_priority') return task.priority === 'high';
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
      return new Date(b.created_at) - new Date(a.created_at);
    });

  const TaskCard = ({ task }) => {
    const isOverdue = task.deadline && new Date(task.deadline) < new Date() && 
                     task.status !== 'completed' && task.status !== 'approved';
    
    return (
      <div className={`task-card ${isOverdue ? 'border-red-500' : ''}`}>
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-semibold text-white text-lg">{task.title}</h3>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => startPomodoro(task.id)}
              className="text-purple-400 hover:text-purple-300 transition-colors"
              title="Start Pomodoro"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"/>
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
          <p className="text-gray-300 text-sm mb-3">{task.description}</p>
        )}
        
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <span className={`priority-${task.priority}`}>
              {task.priority.toUpperCase()}
            </span>
            <span className={`status-${task.status.replace('_', '')}`}>
              {task.status.replace('_', ' ').toUpperCase()}
            </span>
          </div>
          
          {task.estimated_hours && (
            <span className="text-xs text-gray-400">
              ~{task.estimated_hours}h
            </span>
          )}
        </div>
        
        {task.deadline && (
          <div className={`text-sm ${isOverdue ? 'text-red-400' : 'text-gray-400'}`}>
            Due: {new Date(task.deadline).toLocaleDateString()}
            {isOverdue && <span className="ml-2 font-semibold">(OVERDUE)</span>}
          </div>
        )}
        
        {task.tags && task.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {task.tags.map((tag, index) => (
              <span key={index} className="bg-purple-900 text-purple-300 text-xs px-2 py-1 rounded-full">
                {tag}
              </span>
            ))}
          </div>
        )}
        
        {showPomodoro === task.id && (
          <div className="mt-3 bg-green-900 bg-opacity-50 border border-green-600 rounded-lg p-3 fade-in">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"/>
              </svg>
              <span className="text-green-300 text-sm font-medium">
                Pomodoro started! 35 min focus time 🍅
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Task Manager</h1>
            <p className="text-gray-400">Individual task management with GTD principles</p>
          </div>
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

      {/* GTD Analysis Button */}
      <div className="mb-6">
        <button
          onClick={fetchGTDAnalysis}
          className="btn-primary flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          Get GTD Analysis
        </button>
      </div>

      {/* Filters and Sorting */}
      <div className="bg-gray-800 border border-gray-600 rounded-2xl p-6 mb-8">
        <div className="flex flex-wrap gap-4 items-center">
          <div>
            <label className="text-gray-300 text-sm font-medium mb-1 block">Filter:</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="form-select"
            >
              <option value="all">All Tasks</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="high_priority">High Priority</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
          
          <div>
            <label className="text-gray-300 text-sm font-medium mb-1 block">Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="form-select"
            >
              <option value="created_at">Created Date</option>
              <option value="priority">Priority</option>
              <option value="deadline">Deadline</option>
            </select>
          </div>
          
          <div className="ml-auto">
            <span className="text-gray-300 text-sm">
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
            <svg className="w-16 h-16 text-gray-600 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
              <path fillRule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 001 1h6a1 1 0 001-1V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5z"/>
            </svg>
            <p className="text-gray-400 text-lg">No tasks found</p>
            <p className="text-gray-500 text-sm">Create your first task to get started!</p>
          </div>
        )}
      </div>

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="modal-overlay">
          <div className="modal-content max-w-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Create New Task</h2>
              <button
                onClick={() => setShowCreateModal(false)}
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
                  <label className="text-gray-300 text-sm font-medium mb-1 block">Task Type</label>
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
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-300 text-sm font-medium mb-1 block">Deadline</label>
                  <input
                    type="datetime-local"
                    value={newTask.deadline}
                    onChange={(e) => setNewTask({...newTask, deadline: e.target.value})}
                    className="form-input w-full"
                  />
                </div>
                
                <div>
                  <label className="text-gray-300 text-sm font-medium mb-1 block">Estimated Hours</label>
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
              </div>
              
              <div>
                <label className="text-gray-300 text-sm font-medium mb-1 block">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={newTask.tags.join(', ')}
                  onChange={(e) => setNewTask({...newTask, tags: e.target.value.split(',').map(tag => tag.trim())})}
                  className="form-input w-full"
                  placeholder="urgent, client-work, documentation"
                />
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

      {/* GTD Analysis Modal */}
      {showGTDAnalysis && gtdData && (
        <div className="modal-overlay">
          <div className="modal-content max-w-4xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">GTD Analysis</h2>
              <button
                onClick={() => setShowGTDAnalysis(false)}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"/>
                </svg>
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Focus Recommendation */}
              <div className="bg-purple-900 bg-opacity-50 border border-purple-600 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-purple-300 mb-2">Focus Recommendation</h3>
                <p className="text-gray-300">{gtdData.focus_recommendation}</p>
              </div>
              
              {/* High Impact Tasks */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">High Impact Tasks (20% that yield 80%)</h3>
                <div className="space-y-2">
                  {gtdData.high_impact_tasks.length > 0 ? (
                    gtdData.high_impact_tasks.map(task => (
                      <div key={task.id} className="bg-green-900 bg-opacity-30 border border-green-600 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-white font-medium">{task.title}</span>
                          <span className={`priority-${task.priority}`}>{task.priority.toUpperCase()}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-400">All current tasks are well-balanced. Great job!</p>
                  )}
                </div>
              </div>
              
              {/* Batched Tasks */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Similar Tasks (Batch Together)</h3>
                <div className="space-y-3">
                  {gtdData.batched_tasks.length > 0 ? (
                    gtdData.batched_tasks.map((batch, index) => (
                      <div key={index} className="bg-blue-900 bg-opacity-30 border border-blue-600 rounded-lg p-3">
                        <h4 className="text-blue-300 font-medium mb-2">
                          Batch {index + 1}: {batch[0].task_type} tasks ({batch.length} items)
                        </h4>
                        <div className="space-y-1">
                          {batch.map(task => (
                            <div key={task.id} className="text-gray-300 text-sm">• {task.title}</div>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-400">No obvious batching opportunities found.</p>
                  )}
                </div>
              </div>
              
              {/* Suggested Dependencies */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Suggested Task Dependencies</h3>
                <div className="space-y-2">
                  {gtdData.suggested_dependencies.length > 0 ? (
                    gtdData.suggested_dependencies.map((dep, index) => (
                      <div key={index} className="bg-yellow-900 bg-opacity-30 border border-yellow-600 rounded-lg p-3">
                        <div className="text-white font-medium">{dep.main_task}</div>
                        <div className="text-yellow-300 text-sm">→ Consider: {dep.suggested_dependency}</div>
                        <div className="text-gray-400 text-xs mt-1">{dep.reason}</div>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-400">No obvious dependencies detected.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {editingTask && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">Edit Task</h2>
              <button
                onClick={() => setEditingTask(null)}
                className="text-gray-400 hover:text-white"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"/>
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="text-gray-300 text-sm font-medium mb-1 block">Status</label>
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
                <label className="text-gray-300 text-sm font-medium mb-1 block">Priority</label>
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
                    priority: editingTask.priority
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

export default TaskManager;