import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const Dashboard = ({ tasks, projects, refreshData }) => {
  const navigate = useNavigate();
  const [dashboardStats, setDashboardStats] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    fetchDashboardStats();
    fetchNotifications();
    fetchTemplates();
    
    // Auto-refresh notifications every 5 minutes
    const interval = setInterval(fetchNotifications, 300000);
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await axios.get(`${API}/stats/dashboard`);
      setDashboardStats(response.data);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await axios.get(`${API}/notifications`);
      setNotifications(response.data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await axios.get(`${API}/templates`);
      setTemplates(response.data);
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const processRecurringTasks = async () => {
    try {
      const response = await axios.post(`${API}/recurring-tasks/process`);
      console.log(response.data.message);
      refreshData();
      fetchDashboardStats();
    } catch (error) {
      console.error('Error processing recurring tasks:', error);
    }
  };

  // Calculate statistics from tasks data
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(task => task.status === 'completed' || task.status === 'approved').length;
  const pendingTasks = tasks.filter(task => task.status === 'todo' || task.status === 'in_progress').length;
  const overdueTasks = tasks.filter(task => {
    if (!task.deadline) return false;
    return new Date(task.deadline) < new Date() && task.status !== 'completed' && task.status !== 'approved';
  }).length;

  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Get recent tasks and active projects
  const recentTasks = tasks.slice(0, 5);
  const activeProjects = projects.filter(project => project.status === 'active').slice(0, 4);

  // Get high priority and recurring tasks
  const highPriorityTasks = tasks.filter(task => 
    task.priority === 'high' && 
    (task.status === 'todo' || task.status === 'in_progress')
  ).slice(0, 3);

  const recurringTasks = tasks.filter(task => 
    task.recurrence_type && task.recurrence_type !== 'none'
  ).slice(0, 3);

  const NotificationItem = ({ notification }) => (
    <div className={`notification-${notification.type} rounded-lg p-3 mb-2 border-l-4`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-medium text-white text-sm">{notification.title}</h4>
          <p className="text-slate-300 text-xs mt-1">{notification.message}</p>
        </div>
        <button 
          className="text-slate-400 hover:text-white ml-2"
          onClick={() => setNotifications(notifications.filter(n => n.id !== notification.id))}
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"/>
          </svg>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">GTD Task Manager</h1>
            <p className="text-slate-400">Enhanced productivity with time tracking and smart features</p>
          </div>
          
          {/* Notifications Bell */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className={`p-3 rounded-xl transition-colors ${notifications.length > 0 ? 'bg-red-600 hover:bg-red-700 pulse-cyan' : 'bg-slate-700 hover:bg-slate-600'}`}
            >
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z"/>
              </svg>
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                  {notifications.length}
                </span>
              )}
            </button>
            
            {/* Notifications Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-slate-800 border border-slate-600 rounded-xl shadow-xl z-50 max-h-96 overflow-y-auto">
                <div className="p-4 border-b border-slate-600">
                  <h3 className="font-semibold text-white">Smart Notifications</h3>
                </div>
                <div className="p-4">
                  {notifications.length > 0 ? (
                    notifications.map(notification => (
                      <NotificationItem key={notification.id} notification={notification} />
                    ))
                  ) : (
                    <p className="text-slate-400 text-center py-4">No notifications</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex space-x-4 mb-8">
        <button className="nav-item nav-item-active">
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

      {/* Enhanced Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <div className="stats-card stats-card-total">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Total Tasks</h3>
              <p className="text-3xl font-bold">{totalTasks}</p>
            </div>
            <svg className="w-12 h-12 opacity-80" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/>
              <path fillRule="evenodd" d="M4 5a2 2 0 012-2v1a1 1 0 001 1h6a1 1 0 001-1V3a2 2 0 012 2v6a2 2 0 01-2 2H6a2 2 0 01-2-2V5z"/>
            </svg>
          </div>
        </div>

        <div className="stats-card stats-card-completed">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Completed</h3>
              <p className="text-3xl font-bold">{completedTasks}</p>
              <p className="text-sm opacity-80">{completionRate}% completion rate</p>
            </div>
            <svg className="w-12 h-12 opacity-80" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"/>
            </svg>
          </div>
        </div>

        <div className="stats-card stats-card-pending">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Pending</h3>
              <p className="text-3xl font-bold">{pendingTasks}</p>
            </div>
            <svg className="w-12 h-12 opacity-80" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"/>
            </svg>
          </div>
        </div>

        <div className="stats-card stats-card-overdue">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Overdue</h3>
              <p className="text-3xl font-bold">{overdueTasks}</p>
            </div>
            <svg className="w-12 h-12 opacity-80" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"/>
            </svg>
          </div>
        </div>

        {/* Time Tracking Stats */}
        <div className="stats-card stats-card-time">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Time Tracked</h3>
              <p className="text-3xl font-bold">
                {dashboardStats?.time_tracking?.total_hours || 0}h
              </p>
              <p className="text-sm opacity-80">
                {dashboardStats?.time_tracking?.total_entries || 0} sessions
              </p>
            </div>
            <svg className="w-12 h-12 opacity-80" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Quick Actions and Management Tools */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        <div className="bg-slate-800 border border-slate-600 rounded-2xl p-6">
          <h2 className="text-2xl font-bold text-white mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <button 
              onClick={() => navigate('/tasks')}
              className="w-full btn-primary text-left flex items-center"
            >
              <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"/>
              </svg>
              Create New Task
            </button>
            <button 
              onClick={() => navigate('/projects')}
              className="w-full btn-secondary text-left flex items-center"
            >
              <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z"/>
              </svg>
              Create New Project
            </button>
            <button 
              onClick={processRecurringTasks}
              className="w-full btn-warning text-left flex items-center"
            >
              <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z"/>
              </svg>
              Process Recurring Tasks
            </button>
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-600 rounded-2xl p-6">
          <h2 className="text-2xl font-bold text-white mb-4">Task Templates</h2>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {templates.length > 0 ? (
              templates.slice(0, 5).map(template => (
                <div key={template.id} className="template-item">
                  <h3 className="font-medium text-white text-sm">{template.name}</h3>
                  <p className="text-slate-400 text-xs mt-1">{template.title_template}</p>
                </div>
              ))
            ) : (
              <p className="text-slate-400 text-sm">No templates available</p>
            )}
          </div>
          {templates.length > 5 && (
            <button 
              onClick={() => navigate('/tasks')}
              className="mt-3 text-cyan-400 hover:text-cyan-300 text-sm font-medium"
            >
              View all templates →
            </button>
          )}
        </div>

        <div className="bg-slate-800 border border-slate-600 rounded-2xl p-6">
          <h2 className="text-2xl font-bold text-white mb-4">Smart Insights</h2>
          <div className="space-y-4">
            <div className="bg-cyan-900 bg-opacity-50 rounded-xl p-4 border border-cyan-700">
              <h3 className="font-semibold text-cyan-300 mb-2">Focus Recommendation</h3>
              <p className="text-slate-300 text-sm">
                {overdueTasks > 0 
                  ? `🚨 ${overdueTasks} overdue task${overdueTasks > 1 ? 's' : ''}. Address immediately!`
                  : pendingTasks > 0 
                    ? `🎯 You have ${pendingTasks} pending tasks. Focus on high-priority items first.`
                    : '✨ Great job! All tasks are up to date.'
                }
              </p>
            </div>
            
            {highPriorityTasks.length > 0 && (
              <div className="bg-amber-900 bg-opacity-50 rounded-xl p-4 border border-amber-700">
                <h3 className="font-semibold text-amber-300 mb-2">High Priority Alert</h3>
                <p className="text-slate-300 text-sm">
                  {highPriorityTasks.length} high-priority task{highPriorityTasks.length > 1 ? 's need' : ' needs'} attention.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Enhanced Activity Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-slate-800 border border-slate-600 rounded-2xl p-6">
          <h2 className="text-2xl font-bold text-white mb-4">Recent Tasks</h2>
          <div className="space-y-3">
            {recentTasks.length > 0 ? (
              recentTasks.map(task => (
                <div key={task.id} className="task-card">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-white">{task.title}</h3>
                      <p className="text-sm text-slate-400 mt-1">{task.description}</p>
                      {task.actual_hours > 0 && (
                        <p className="text-xs text-cyan-400 mt-1">
                          Tracked: {task.actual_hours.toFixed(1)}h
                        </p>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`priority-${task.priority}`}>
                        {task.priority.toUpperCase()}
                      </span>
                      <span className={`status-${task.status.replace('_', '')}`}>
                        {task.status.replace('_', ' ').toUpperCase()}
                      </span>
                      {task.recurrence_type && task.recurrence_type !== 'none' && (
                        <span className="recurring-badge">
                          RECURRING
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-400 text-center py-8">No tasks yet. Create your first task!</p>
            )}
          </div>
        </div>

        <div className="bg-slate-800 border border-slate-600 rounded-2xl p-6">
          <h2 className="text-2xl font-bold text-white mb-4">Active Projects</h2>
          <div className="space-y-3">
            {activeProjects.length > 0 ? (
              activeProjects.map(project => (
                <div key={project.id} className="task-card cursor-pointer" onClick={() => navigate(`/project/${project.id}`)}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-white">{project.title}</h3>
                      <p className="text-sm text-slate-400 mt-1">{project.description}</p>
                      <div className="flex items-center space-x-4 mt-2">
                        <span className="text-xs text-slate-400">
                          {project.task_count || 0} tasks
                        </span>
                        {project.deadline && (
                          <span className="text-xs text-slate-400">
                            Due: {new Date(project.deadline).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-cyan-400">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"/>
                      </svg>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-slate-400 text-center py-8">No active projects. Create your first project!</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;