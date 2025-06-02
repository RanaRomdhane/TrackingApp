import React from 'react';
import { useNavigate } from 'react-router-dom';

const Dashboard = ({ tasks, projects, refreshData }) => {
  const navigate = useNavigate();

  // Calculate statistics
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(task => task.status === 'completed' || task.status === 'approved').length;
  const pendingTasks = tasks.filter(task => task.status === 'todo' || task.status === 'in_progress').length;
  const overdueTasks = tasks.filter(task => {
    if (!task.deadline) return false;
    return new Date(task.deadline) < new Date() && task.status !== 'completed' && task.status !== 'approved';
  }).length;

  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Get recent tasks
  const recentTasks = tasks.slice(0, 5);
  const activeProjects = projects.filter(project => project.status === 'active').slice(0, 4);

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">GTD Task Manager</h1>
        <p className="text-gray-400">Getting Things Done - Organize, Prioritize, Execute</p>
      </div>

      {/* Navigation */}
      <div className="flex space-x-4 mb-8">
        <button 
          onClick={() => navigate('/')} 
          className="nav-item nav-item-active"
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

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
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
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-gray-800 border border-gray-600 rounded-2xl p-6">
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
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-600 rounded-2xl p-6">
          <h2 className="text-2xl font-bold text-white mb-4">GTD Insights</h2>
          <div className="space-y-4">
            <div className="bg-purple-900 bg-opacity-50 rounded-xl p-4 border border-purple-700">
              <h3 className="font-semibold text-purple-300 mb-2">Focus Recommendation</h3>
              <p className="text-gray-300 text-sm">
                You have {pendingTasks} pending tasks. Focus on high-priority items first to maximize productivity.
              </p>
            </div>
            {overdueTasks > 0 && (
              <div className="bg-red-900 bg-opacity-50 rounded-xl p-4 border border-red-700">
                <h3 className="font-semibold text-red-300 mb-2">Attention Needed</h3>
                <p className="text-gray-300 text-sm">
                  {overdueTasks} task{overdueTasks > 1 ? 's are' : ' is'} overdue. Consider rescheduling or prioritizing.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-gray-800 border border-gray-600 rounded-2xl p-6">
          <h2 className="text-2xl font-bold text-white mb-4">Recent Tasks</h2>
          <div className="space-y-3">
            {recentTasks.length > 0 ? (
              recentTasks.map(task => (
                <div key={task.id} className="task-card">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-white">{task.title}</h3>
                      <p className="text-sm text-gray-400 mt-1">{task.description}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`priority-${task.priority}`}>
                        {task.priority.toUpperCase()}
                      </span>
                      <span className={`status-${task.status.replace('_', '')}`}>
                        {task.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-center py-8">No tasks yet. Create your first task!</p>
            )}
          </div>
        </div>

        <div className="bg-gray-800 border border-gray-600 rounded-2xl p-6">
          <h2 className="text-2xl font-bold text-white mb-4">Active Projects</h2>
          <div className="space-y-3">
            {activeProjects.length > 0 ? (
              activeProjects.map(project => (
                <div key={project.id} className="task-card cursor-pointer" onClick={() => navigate(`/project/${project.id}`)}>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-white">{project.title}</h3>
                      <p className="text-sm text-gray-400 mt-1">{project.description}</p>
                    </div>
                    <div className="text-purple-400">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"/>
                      </svg>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-center py-8">No active projects. Create your first project!</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;