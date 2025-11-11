// ============================================
// services/api.js
// ============================================
import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getCurrentUser: () => api.get('/auth/me'),
};

// Threats API
export const threatsAPI = {
  getAll: (params) => api.get('/threats', { params }),
  search: (value) => api.get('/ioc/search', { params: { value } }),
  getStats: () => api.get('/threats/stats'),
};

// Alerts API
export const alertsAPI = {
  getAll: () => api.get('/alerts'),
  create: (alertData) => api.post('/alerts', alertData),
  update: (id, alertData) => api.put(`/alerts/${id}`, alertData),
  delete: (id) => api.delete(`/alerts/${id}`),
};

// Reports API
export const reportsAPI = {
  generate: (params) => api.get('/reports/generate', { params }),
  getRecent: () => api.get('/reports'),
  exportPDF: (id) => api.get(`/reports/export/${id}`, { responseType: 'blob' }),
};

export default api;


// ============================================
// store/useThreatStore.js
// ============================================
import { create } from 'zustand';
import { authAPI, threatsAPI, alertsAPI } from '../services/api';

const useThreatStore = create((set, get) => ({
  // User state
  user: null,
  token: localStorage.getItem('token'),
  
  // Threats state
  threats: [],
  threatStats: null,
  searchResults: null,
  
  // Alerts state
  alerts: [],
  
  // UI state
  loading: false,
  error: null,
  
  // Auth actions
  login: async (credentials) => {
    set({ loading: true, error: null });
    try {
      const response = await authAPI.login(credentials);
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      set({ token, user, loading: false });
      return true;
    } catch (error) {
      set({ error: error.response?.data?.message || 'Login failed', loading: false });
      return false;
    }
  },
  
  register: async (userData) => {
    set({ loading: true, error: null });
    try {
      const response = await authAPI.register(userData);
      const { token, user } = response.data;
      localStorage.setItem('token', token);
      set({ token, user, loading: false });
      return true;
    } catch (error) {
      set({ error: error.response?.data?.message || 'Registration failed', loading: false });
      return false;
    }
  },
  
  logout: () => {
    localStorage.removeItem('token');
    set({ token: null, user: null, threats: [], alerts: [] });
  },
  
  fetchCurrentUser: async () => {
    try {
      const response = await authAPI.getCurrentUser();
      set({ user: response.data });
    } catch (error) {
      console.error('Failed to fetch user:', error);
    }
  },
  
  // Threat actions
  fetchThreats: async (filters = {}) => {
    set({ loading: true, error: null });
    try {
      const response = await threatsAPI.getAll(filters);
      set({ threats: response.data, loading: false });
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to fetch threats', loading: false });
    }
  },
  
  searchIoC: async (value) => {
    set({ loading: true, error: null });
    try {
      const response = await threatsAPI.search(value);
      set({ searchResults: response.data, loading: false });
    } catch (error) {
      set({ error: error.response?.data?.message || 'Search failed', loading: false });
    }
  },
  
  fetchThreatStats: async () => {
    try {
      const response = await threatsAPI.getStats();
      set({ threatStats: response.data });
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  },
  
  // Alert actions
  fetchAlerts: async () => {
    set({ loading: true, error: null });
    try {
      const response = await alertsAPI.getAll();
      set({ alerts: response.data, loading: false });
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to fetch alerts', loading: false });
    }
  },
  
  createAlert: async (alertData) => {
    set({ loading: true, error: null });
    try {
      const response = await alertsAPI.create(alertData);
      set((state) => ({ 
        alerts: [...state.alerts, response.data], 
        loading: false 
      }));
      return true;
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to create alert', loading: false });
      return false;
    }
  },
  
  deleteAlert: async (id) => {
    try {
      await alertsAPI.delete(id);
      set((state) => ({ 
        alerts: state.alerts.filter(a => a._id !== id) 
      }));
    } catch (error) {
      set({ error: error.response?.data?.message || 'Failed to delete alert' });
    }
  },
  
  // Clear error
  clearError: () => set({ error: null }),
}));

export default useThreatStore;


// ============================================
// components/Navbar.jsx
// ============================================
import React from 'react';
import { useNavigate } from 'react-router-dom';
import useThreatStore from '../store/useThreatStore';

const Navbar = () => {
  const { user, logout } = useThreatStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getTierBadgeColor = (tier) => {
    switch (tier) {
      case 'Business': return 'bg-purple-600';
      case 'Pro': return 'bg-blue-600';
      default: return 'bg-gray-600';
    }
  };

  return (
    <nav className="bg-gray-900 border-b border-gray-800 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">T</span>
          </div>
          <h1 className="text-xl font-bold text-white">ThreatView</h1>
        </div>
        
        <div className="flex items-center space-x-4">
          {user && (
            <>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${getTierBadgeColor(user.tier)}`}>
                {user.tier}
              </span>
              <span className="text-gray-300 text-sm">
                {user.firstName} {user.lastName}
              </span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm transition"
              >
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;


// ============================================
// components/Sidebar.jsx
// ============================================
import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Sidebar = () => {
  const location = useLocation();
  
  const menuItems = [
    { path: '/dashboard', label: 'Dashboard', icon: '📊' },
    { path: '/search', label: 'IoC Search', icon: '🔍' },
    { path: '/alerts', label: 'Alerts', icon: '🔔' },
    { path: '/reports', label: 'Reports', icon: '📄' },
  ];

  return (
    <aside className="w-64 bg-gray-900 border-r border-gray-800 min-h-screen p-4">
      <nav className="space-y-2">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition ${
              location.pathname === item.path
                ? 'bg-red-600 text-white'
                : 'text-gray-400 hover:bg-gray-800 hover:text-white'
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;


// ============================================
// components/ThreatChart.jsx
// ============================================
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#ef4444', '#f59e0b', '#eab308', '#22c55e', '#3b82f6'];

export const SeverityChart = ({ data }) => {
  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Threats by Severity</h3>
      <ResponsiveContainer width="100%" height={250}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis dataKey="name" stroke="#9ca3af" />
          <YAxis stroke="#9ca3af" />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
            labelStyle={{ color: '#fff' }}
          />
          <Bar dataKey="count" fill="#ef4444" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export const MalwareFamilyChart = ({ data }) => {
  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Top Malware Families</h3>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};


// ============================================
// components/WorldMap.jsx
// ============================================
import React from 'react';

const WorldMap = ({ threatsByCountry = [] }) => {
  // Simple representation - in production, use a real map library like react-simple-maps
  const topCountries = threatsByCountry.slice(0, 5);

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Threat Origins</h3>
      <div className="space-y-3">
        {topCountries.map((country, idx) => (
          <div key={idx} className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{country.flag || '🌍'}</span>
              <span className="text-gray-300">{country.name}</span>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-32 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-red-600"
                  style={{ width: `${(country.count / threatsByCountry[0].count) * 100}%` }}
                />
              </div>
              <span className="text-white font-semibold w-12 text-right">{country.count}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default WorldMap;


// ============================================
// components/AlertCard.jsx
// ============================================
import React from 'react';

const AlertCard = ({ alert, onDelete }) => {
  const statusColor = alert.isActive ? 'bg-green-600' : 'bg-gray-600';

  return (
    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <h4 className="text-white font-semibold">{alert.name}</h4>
            <span className={`px-2 py-1 rounded-full text-xs text-white ${statusColor}`}>
              {alert.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          <p className="text-gray-400 text-sm">{alert.description}</p>
        </div>
        <button
          onClick={() => onDelete(alert._id)}
          className="text-red-400 hover:text-red-300 ml-4"
        >
          🗑️
        </button>
      </div>
      
      <div className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <span className="text-gray-500">Type:</span>
          <span className="text-gray-300 ml-2">{alert.conditions.type}</span>
        </div>
        <div>
          <span className="text-gray-500">Triggers:</span>
          <span className="text-gray-300 ml-2">{alert.triggerCount}</span>
        </div>
      </div>
      
      {alert.conditions.severity?.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {alert.conditions.severity.map((sev, idx) => (
            <span key={idx} className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs">
              {sev}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default AlertCard;


// ============================================
// pages/Login.jsx
// ============================================
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useThreatStore from '../store/useThreatStore';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    company: '',
  });
  
  const { login, register, loading, error, token, clearError } = useThreatStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (token) {
      navigate('/dashboard');
    }
  }, [token, navigate]);

  useEffect(() => {
    clearError();
  }, [isLogin]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const success = isLogin 
      ? await login({ email: formData.email, password: formData.password })
      : await register(formData);
    
    if (success) {
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-block w-16 h-16 bg-red-600 rounded-xl flex items-center justify-center mb-4">
            <span className="text-white font-bold text-3xl">T</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">ThreatView</h1>
          <p className="text-gray-400">Threat Intelligence Dashboard</p>
        </div>

        <div className="bg-gray-900 rounded-xl p-8 border border-gray-800">
          <div className="flex space-x-2 mb-6">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2 rounded-lg font-semibold transition ${
                isLogin ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2 rounded-lg font-semibold transition ${
                !isLogin ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-400'
              }`}
            >
              Register
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-800 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="First Name"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-red-600"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Last Name"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-red-600"
                    required
                  />
                </div>
                <input
                  type="text"
                  placeholder="Company (Optional)"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-red-600"
                />
              </>
            )}
            
            <input
              type="email"
              placeholder="Email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-red-600"
              required
            />
            
            <input
              type="password"
              placeholder="Password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-red-600"
              required
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : (isLogin ? 'Login' : 'Create Account')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;


// ============================================
// pages/Dashboard.jsx
// ============================================
import React, { useEffect } from 'react';
import useThreatStore from '../store/useThreatStore';
import { SeverityChart, MalwareFamilyChart } from '../components/ThreatChart';
import WorldMap from '../components/WorldMap';

const Dashboard = () => {
  const { threats, threatStats, fetchThreats, fetchThreatStats, loading } = useThreatStore();

  useEffect(() => {
    fetchThreats({ limit: 10 });
    fetchThreatStats();
  }, []);

  // Mock data for charts (replace with real data from threatStats)
  const severityData = [
    { name: 'Critical', count: 45 },
    { name: 'High', count: 128 },
    { name: 'Medium', count: 234 },
    { name: 'Low', count: 89 },
  ];

  const malwareData = [
    { name: 'Emotet', value: 89 },
    { name: 'TrickBot', value: 67 },
    { name: 'Qbot', value: 45 },
    { name: 'IcedID', value: 34 },
    { name: 'Other', value: 112 },
  ];

  const countryData = [
    { name: 'Russia', count: 234, flag: '🇷🇺' },
    { name: 'China', count: 189, flag: '🇨🇳' },
    { name: 'USA', count: 145, flag: '🇺🇸' },
    { name: 'Brazil', count: 98, flag: '🇧🇷' },
    { name: 'India', count: 76, flag: '🇮🇳' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Dashboard</h2>
        <p className="text-gray-400">Real-time threat intelligence overview</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="text-gray-400 text-sm mb-1">Total Threats</div>
          <div className="text-3xl font-bold text-white">2,847</div>
          <div className="text-green-400 text-sm mt-2">↑ 12% from last week</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="text-gray-400 text-sm mb-1">Critical</div>
          <div className="text-3xl font-bold text-red-400">45</div>
          <div className="text-red-400 text-sm mt-2">↑ 8 new today</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="text-gray-400 text-sm mb-1">Active Alerts</div>
          <div className="text-3xl font-bold text-white">12</div>
          <div className="text-gray-400 text-sm mt-2">3 triggered today</div>
        </div>
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="text-gray-400 text-sm mb-1">Countries</div>
          <div className="text-3xl font-bold text-white">87</div>
          <div className="text-gray-400 text-sm mt-2">Origins detected</div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SeverityChart data={severityData} />
        <MalwareFamilyChart data={malwareData} />
      </div>

      <WorldMap threatsByCountry={countryData} />

      {/* Recent Threats Table */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Threats</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b border-gray-700">
              <tr className="text-left text-gray-400 text-sm">
                <th className="pb-3 font-semibold">Type</th>
                <th className="pb-3 font-semibold">Value</th>
                <th className="pb-3 font-semibold">Severity</th>
                <th className="pb-3 font-semibold">Source</th>
                <th className="pb-3 font-semibold">Country</th>
                <th className="pb-3 font-semibold">Detected</th>
              </tr>
            </thead>
            <tbody className="text-gray-300 text-sm">
              {threats.slice(0, 10).map((threat, idx) => (
                <tr key={idx} className="border-b border-gray-700 hover:bg-gray-750">
                  <td className="py-3">{threat.type}</td>
                  <td className="py-3 font-mono text-xs">{threat.value}</td>
                  <td className="py-3">
                    <span className={`px-2 py-1 rounded text-xs ${
                      threat.severity === 'Critical' ? 'bg-red-900 text-red-300' :
                      threat.severity === 'High' ? 'bg-orange-900 text-orange-300' :
                      'bg-yellow-900 text-yellow-300'
                    }`}>
                      {threat.severity}
                    </span>
                  </td>
                  <td className="py-3">{threat.source}</td>
                  <td className="py-3">{threat.country}</td>
                  <td className="py-3">{new Date(threat.dateDetected).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;


// ============================================
// pages/IoCSearch.jsx
// ============================================
import React, { useState } from 'react';
import useThreatStore from '../store/useThreatStore';

const IoCSearch = () => {
  const [searchValue, setSearchValue] = useState('');
  const { searchResults, searchIoC, loading } = useThreatStore();

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchValue.trim()) {
      searchIoC(searchValue.trim());
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">IoC Search</h2>
        <p className="text-gray-400">Search for Indicators of Compromise</p>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="bg-gray-800 rounded-lg p-6">
        <div className="flex space-x-4">
          <input
            type="text"
            placeholder="Enter IP, Domain, Hash, URL..."
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="flex-1 px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-red-600"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition disabled:opacity-50"
          >
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>
        <div className="mt-3 text-sm text-gray-400">
          Examples: 8.8.8.8, example.com, 44d88612fea8a8f36de82e1278abb02f
        </div>
      </form>

      {/* Results */}
      {searchResults && (
        <div className="bg-gray-800 rounded-lg p-6">
          {searchResults.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">✓</div>
              <div className="text-xl font-semibold text-white mb-2">No Threats Found</div>
              <div className="text-gray-400">This IoC is not currently in our threat database</div>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white mb-4">
                Found {searchResults.length} result(s)
              </h3>
              {searchResults.map((threat, idx) => (
                <div key={idx} className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-white font-semibold text-lg">{threat.type}</span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          threat.severity === 'Critical' ? 'bg-red-900 text-red-300' :
                          threat.severity === 'High' ? 'bg-orange-900 text-orange-300' :
                          threat.severity === 'Medium' ? 'bg-yellow-900 text-yellow-300' :
                          'bg-gray-700 text-gray-300'
                        }`}>
                          {threat.severity}
                        </span>
                      </div>
                      <div className="font-mono text-gray-300 text-sm bg-gray-800 px-3 py-2 rounded inline-block">
                        {threat.value}
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <div className="text-gray-400">Source</div>
                      <div className="text-white font-semibold">{threat.source}</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    {threat.country && (
                      <div>
                        <div className="text-gray-500">Country</div>
                        <div className="text-gray-300">{threat.country}</div>
                      </div>
                    )}
                    {threat.category && (
                      <div>
                        <div className="text-gray-500">Category</div>
                        <div className="text-gray-300">{threat.category}</div>
                      </div>
                    )}
                    {threat.malwareFamily && (
                      <div>
                        <div className="text-gray-500">Malware Family</div>
                        <div className="text-gray-300">{threat.malwareFamily}</div>
                      </div>
                    )}
                    <div>
                      <div className="text-gray-500">First Seen</div>
                      <div className="text-gray-300">{new Date(threat.firstSeen).toLocaleDateString()}</div>
                    </div>
                  </div>
                  
                  {threat.description && (
                    <div className="mt-3 pt-3 border-t border-gray-700">
                      <div className="text-gray-400 text-sm">{threat.description}</div>
                    </div>
                  )}
                  
                  {threat.tags && threat.tags.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {threat.tags.map((tag, i) => (
                        <span key={i} className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default IoCSearch;


// ============================================
// pages/Alerts.jsx
// ============================================
import React, { useEffect, useState } from 'react';
import useThreatStore from '../store/useThreatStore';
import AlertCard from '../components/AlertCard';

const Alerts = () => {
  const { alerts, fetchAlerts, createAlert, deleteAlert, loading, user } = useThreatStore();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'Any',
    severity: [],
    sources: [],
    categories: [],
  });

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleCreateAlert = async (e) => {
    e.preventDefault();
    const success = await createAlert({
      ...formData,
      conditions: {
        type: formData.type,
        severity: formData.severity,
        sources: formData.sources,
        categories: formData.categories,
      },
    });
    
    if (success) {
      setShowCreateForm(false);
      setFormData({
        name: '',
        description: '',
        type: 'Any',
        severity: [],
        sources: [],
        categories: [],
      });
    }
  };

  const handleCheckboxChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(v => v !== value)
        : [...prev[field], value]
    }));
  };

  // Check tier limits
  const alertLimit = user?.tier === 'Free' ? 3 : user?.tier === 'Pro' ? 10 : Infinity;
  const canCreateMore = alerts.length < alertLimit;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Alerts</h2>
          <p className="text-gray-400">
            Manage threat alerts ({alerts.length}/{alertLimit === Infinity ? '∞' : alertLimit} alerts)
          </p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          disabled={!canCreateMore}
          className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          + Create Alert
        </button>
      </div>

      {!canCreateMore && (
        <div className="bg-yellow-900/30 border border-yellow-800 rounded-lg p-4">
          <div className="text-yellow-400 font-semibold mb-1">Alert Limit Reached</div>
          <div className="text-yellow-300 text-sm">
            Upgrade to {user?.tier === 'Free' ? 'Pro' : 'Business'} to create more alerts
          </div>
        </div>
      )}

      {/* Create Alert Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 border border-gray-800">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Create New Alert</h3>
              <button
                onClick={() => setShowCreateForm(false)}
                className="text-gray-400 hover:text-white text-2xl"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateAlert} className="space-y-4">
              <div>
                <label className="block text-gray-300 text-sm font-semibold mb-2">
                  Alert Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-red-600"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-semibold mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-red-600 h-20"
                />
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-semibold mb-2">
                  IoC Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-red-600"
                >
                  <option>Any</option>
                  <option>IP</option>
                  <option>Domain</option>
                  <option>URL</option>
                  <option>Hash</option>
                  <option>Email</option>
                </select>
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-semibold mb-2">
                  Severity Levels
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['Critical', 'High', 'Medium', 'Low'].map(sev => (
                    <label key={sev} className="flex items-center space-x-2 text-gray-300">
                      <input
                        type="checkbox"
                        checked={formData.severity.includes(sev)}
                        onChange={() => handleCheckboxChange('severity', sev)}
                        className="rounded bg-gray-800 border-gray-700"
                      />
                      <span>{sev}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-semibold mb-2">
                  Sources
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['AlienVault', 'PhishTank', 'AbuseIPDB', 'URLhaus'].map(src => (
                    <label key={src} className="flex items-center space-x-2 text-gray-300">
                      <input
                        type="checkbox"
                        checked={formData.sources.includes(src)}
                        onChange={() => handleCheckboxChange('sources', src)}
                        className="rounded bg-gray-800 border-gray-700"
                      />
                      <span>{src}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition disabled:opacity-50"
                >
                  {loading ? 'Creating...' : 'Create Alert'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Alerts List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {alerts.map(alert => (
          <AlertCard key={alert._id} alert={alert} onDelete={deleteAlert} />
        ))}
      </div>

      {alerts.length === 0 && (
        <div className="bg-gray-800 rounded-lg p-12 text-center">
          <div className="text-6xl mb-4">🔔</div>
          <div className="text-xl font-semibold text-white mb-2">No Alerts Yet</div>
          <div className="text-gray-400 mb-4">Create your first alert to get notified about threats</div>
        </div>
      )}
    </div>
  );
};

export default Alerts;


// ============================================
// pages/Reports.jsx
// ============================================
import React, { useState } from 'react';
import { reportsAPI } from '../services/api';
import jsPDF from 'jspdf';

const Reports = () => {
  const [generating, setGenerating] = useState(false);
  const [reportType, setReportType] = useState('weekly');

  const generatePDFReport = async () => {
    setGenerating(true);
    try {
      // Fetch report data from API
      const response = await reportsAPI.generate({ type: reportType });
      const reportData = response.data;

      // Create PDF
      const doc = new jsPDF();
      
      // Header
      doc.setFontSize(24);
      doc.setTextColor(220, 38, 38);
      doc.text('ThreatView', 20, 20);
      
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text('Threat Intelligence Report', 20, 35);
      
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 42);
      doc.text(`Report Type: ${reportType.charAt(0).toUpperCase() + reportType.slice(1)}`, 20, 48);
      
      // Summary section
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text('Executive Summary', 20, 60);
      
      doc.setFontSize(10);
      doc.text(`Total Threats Detected: ${reportData.totalThreats || 2847}`, 20, 70);
      doc.text(`Critical Threats: ${reportData.criticalThreats || 45}`, 20, 76);
      doc.text(`High Severity: ${reportData.highThreats || 128}`, 20, 82);
      doc.text(`Unique Countries: ${reportData.countries || 87}`, 20, 88);
      
      // Top threats section
      doc.setFontSize(14);
      doc.text('Top Malware Families', 20, 105);
      
      doc.setFontSize(10);
      const malware = reportData.topMalware || [
        'Emotet - 89 detections',
        'TrickBot - 67 detections',
        'Qbot - 45 detections',
        'IcedID - 34 detections',
      ];
      malware.forEach((m, idx) => {
        doc.text(`${idx + 1}. ${m}`, 25, 115 + (idx * 6));
      });
      
      // Recommendations
      doc.setFontSize(14);
      doc.text('Recommendations', 20, 145);
      
      doc.setFontSize(10);
      const recommendations = [
        '• Update firewall rules to block identified malicious IPs',
        '• Increase monitoring for Emotet-related indicators',
        '• Review and update email security policies',
        '• Conduct security awareness training for staff',
      ];
      recommendations.forEach((rec, idx) => {
        doc.text(rec, 20, 155 + (idx * 6));
      });
      
      // Footer
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text('ThreatView - Threat Intelligence Dashboard', 20, 280);
      doc.text('Confidential - For Internal Use Only', 20, 285);
      
      // Download
      doc.save(`threatview-report-${reportType}-${Date.now()}.pdf`);
      
    } catch (error) {
      console.error('Failed to generate report:', error);
      alert('Failed to generate report. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Reports</h2>
        <p className="text-gray-400">Generate and download threat intelligence reports</p>
      </div>

      {/* Report Generator */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Generate Report</h3>
        
        <div className="max-w-md space-y-4">
          <div>
            <label className="block text-gray-300 text-sm font-semibold mb-2">
              Report Type
            </label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-red-600"
            >
              <option value="daily">Daily Summary</option>
              <option value="weekly">Weekly Summary</option>
              <option value="monthly">Monthly Summary</option>
            </select>
          </div>

        <button
  onClick={generateReport}          // ✅ first generates the report in backend
  disabled={generating}
  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition disabled:opacity-50 flex items-center justify-center space-x-2"
>
  {generating ? (
    <>
      <span className="animate-spin">⟳</span>
      <span>Generating Report...</span>
    </>
  ) : (
    <>
      <span>⚡</span>
      <span>Generate Report</span>
    </>
  )}
</button>

<button
  onClick={generatePDFReport}       // ✅ then triggers PDF download
  disabled={generating}
  className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition disabled:opacity-50 flex items-center justify-center space-x-2"
>
  {generating ? (
    <>
      <span className="animate-spin">⟳</span>
      <span>Generating PDF...</span>
    </>
  ) : (
    <>
      <span>📄</span>
      <span>Download PDF Report</span>
    </>
  )}
</button> 

        </div>
      </div>

      {/* Report Preview/Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="text-gray-400 text-sm mb-2">Report Coverage</div>
          <div className="text-2xl font-bold text-white mb-1">Last 7 Days</div>
          <div className="text-gray-400 text-sm">2,847 threats analyzed</div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="text-gray-400 text-sm mb-2">Data Sources</div>
          <div className="text-2xl font-bold text-white mb-1">5 Feeds</div>
          <div className="text-gray-400 text-sm">AlienVault, PhishTank, AbuseIPDB, URLhaus, MalwareBazaar</div>
        </div>
        
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="text-gray-400 text-sm mb-2">Report Format</div>
          <div className="text-2xl font-bold text-white mb-1">PDF</div>
          <div className="text-gray-400 text-sm">Professional executive summary</div>
        </div>
      </div>

      {/* Sample Report Content */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Report Contents</h3>
        <div className="space-y-3 text-gray-300">
          <div className="flex items-center space-x-3">
            <span className="text-green-400">✓</span>
            <span>Executive Summary with key metrics</span>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-green-400">✓</span>
            <span>Threat severity breakdown</span>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-green-400">✓</span>
            <span>Top malware families and attack vectors</span>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-green-400">✓</span>
            <span>Geographic distribution of threats</span>
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-green-400">✓</span>
            <span>Actionable security recommendations</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;


// ============================================
// App.jsx
// ============================================
import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useThreatStore from './store/useThreatStore';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import IoCSearch from './pages/IoCSearch';
import Alerts from './pages/Alerts';
import Reports from './pages/Reports';

const ProtectedLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-950">
      <Navbar />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
};

const ProtectedRoute = ({ children }) => {
  const { token } = useThreatStore();
  return token ? children : <Navigate to="/login" />;
};

function App() {
  const { token, fetchCurrentUser } = useThreatStore();

  useEffect(() => {
    if (token) {
      fetchCurrentUser();
    }
  }, [token]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <ProtectedLayout>
                <Dashboard />
              </ProtectedLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/search"
          element={
            <ProtectedRoute>
              <ProtectedLayout>
                <IoCSearch />
              </ProtectedLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/alerts"
          element={
            <ProtectedRoute>
              <ProtectedLayout>
                <Alerts />
              </ProtectedLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <ProtectedLayout>
                <Reports />
              </ProtectedLayout>
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/dashboard" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;