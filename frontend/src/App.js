import React, { useState, useEffect } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import axios from "axios";
import Dashboard from "./components/Dashboard";
import EnhancedTaskManager from "./components/EnhancedTaskManager";
import ProjectManager from "./components/ProjectManager";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Fetch tasks and projects on app load
  useEffect(() => {
    fetchTasks();
    fetchProjects();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await axios.get(`${API}/tasks`);
      setTasks(response.data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await axios.get(`${API}/projects`);
      setProjects(response.data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const refreshData = () => {
    fetchTasks();
    fetchProjects();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <BrowserRouter>
        <Routes>
          <Route 
            path="/" 
            element={
              <Dashboard 
                tasks={tasks} 
                projects={projects} 
                refreshData={refreshData}
              />
            } 
          />
          <Route 
            path="/tasks" 
            element={
              <TaskManager 
                tasks={tasks} 
                refreshData={refreshData}
              />
            } 
          />
          <Route 
            path="/projects" 
            element={
              <ProjectManager 
                projects={projects} 
                refreshData={refreshData}
              />
            } 
          />
          <Route 
            path="/project/:projectId" 
            element={
              <ProjectManager 
                projects={projects} 
                refreshData={refreshData}
              />
            } 
          />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;