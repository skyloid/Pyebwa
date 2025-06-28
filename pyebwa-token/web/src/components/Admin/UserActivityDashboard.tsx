import React, { useState, useEffect, useMemo } from 'react';
import { 
  FaUsers, 
  FaEye, 
  FaSearch, 
  FaFilter,
  FaDownload,
  FaRefresh,
  FaClock,
  FaMapMarkerAlt,
  FaDesktop,
  FaMobile,
  FaTablet,
  FaExclamationTriangle,
  FaCheckCircle,
  FaTimesCircle,
  FaSpinner,
  FaSignInAlt,
  FaDollarSign,
  FaSeedling,
  FaShieldAlt,
  FaMousePointer
} from 'react-icons/fa';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { useWebSocket } from '../../hooks/useWebSocket';
import { 
  UserActivity, 
  UserSession, 
  ActivityFilter, 
  UserAnalytics, 
  SuspiciousActivity,
  RealTimeUpdate 
} from '../../types/admin.types';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export const UserActivityDashboard: React.FC = () => {
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [analytics, setAnalytics] = useState<UserAnalytics | null>(null);
  const [suspiciousActivities, setSuspiciousActivities] = useState<SuspiciousActivity[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<UserActivity | null>(null);
  const [selectedSession, setSelectedSession] = useState<UserSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [filter, setFilter] = useState<ActivityFilter>({
    userType: 'all',
    category: 'all',
    timeRange: '24h',
    success: 'all',
    limit: 50,
    offset: 0,
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState<'activities' | 'sessions' | 'analytics' | 'suspicious'>('activities');

  // WebSocket connection for real-time updates
  const { isConnected, lastMessage } = useWebSocket('/admin/user-activity', {
    onMessage: handleRealTimeUpdate,
  });

  function handleRealTimeUpdate(message: any) {
    const update = message as RealTimeUpdate;
    
    switch (update.type) {
      case 'user_activity':
        setActivities(prev => [update.data as UserActivity, ...prev].slice(0, 100));
        break;
      case 'user_session':
        const sessionData = update.data as UserSession;
        setSessions(prev => {
          const existingIndex = prev.findIndex(s => s.id === sessionData.id);
          if (existingIndex >= 0) {
            const updated = [...prev];
            updated[existingIndex] = sessionData;
            return updated;
          } else {
            return [sessionData, ...prev].slice(0, 50);
          }
        });
        break;
      case 'suspicious_activity':
        setSuspiciousActivities(prev => [update.data as SuspiciousActivity, ...prev]);
        break;
      case 'user_analytics':
        setAnalytics(prev => prev ? { ...prev, ...update.data } : update.data as UserAnalytics);
        break;
    }
  }

  // Fetch initial data
  useEffect(() => {
    fetchUserActivities();
    fetchUserSessions();
    fetchUserAnalytics();
    fetchSuspiciousActivities();
  }, [filter]);

  const fetchUserActivities = async () => {
    try {
      setRefreshing(true);
      const queryParams = new URLSearchParams({
        userType: filter.userType || 'all',
        category: filter.category || 'all',
        timeRange: filter.timeRange,
        success: filter.success?.toString() || 'all',
        limit: filter.limit.toString(),
        offset: filter.offset.toString(),
        ...(filter.searchTerm && { search: filter.searchTerm }),
      });

      const response = await fetch(`/api/admin/user-activities?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setActivities(data.activities);
      }
    } catch (error) {
      console.error('Error fetching user activities:', error);
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  const fetchUserSessions = async () => {
    try {
      const response = await fetch('/api/admin/user-sessions?active=true&limit=50', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions);
      }
    } catch (error) {
      console.error('Error fetching user sessions:', error);
    }
  };

  const fetchUserAnalytics = async () => {
    try {
      const response = await fetch(`/api/admin/user-analytics?timeRange=${filter.timeRange}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAnalytics(data.analytics);
      }
    } catch (error) {
      console.error('Error fetching user analytics:', error);
    }
  };

  const fetchSuspiciousActivities = async () => {
    try {
      const response = await fetch('/api/admin/suspicious-activities?limit=20&status=new,investigating', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSuspiciousActivities(data.activities);
      }
    } catch (error) {
      console.error('Error fetching suspicious activities:', error);
    }
  };

  // Filter activities based on search term
  const filteredActivities = useMemo(() => {
    if (!searchTerm) return activities;
    
    const term = searchTerm.toLowerCase();
    return activities.filter(activity => 
      activity.userName.toLowerCase().includes(term) ||
      activity.userEmail.toLowerCase().includes(term) ||
      activity.action.toLowerCase().includes(term) ||
      activity.description.toLowerCase().includes(term)
    );
  }, [activities, searchTerm]);

  const getActivityIcon = (category: string) => {
    switch (category) {
      case 'authentication': return <FaSignInAlt />;
      case 'transaction': return <FaDollarSign />;
      case 'planting': return <FaSeedling />;
      case 'verification': return <FaShieldAlt />;
      case 'admin': return <FaShieldAlt />;
      case 'navigation': return <FaMousePointer />;
      default: return <FaEye />;
    }
  };

  const getUserTypeColor = (userType: string) => {
    switch (userType) {
      case 'admin': return 'text-red-600 bg-red-100';
      case 'validator': return 'text-blue-600 bg-blue-100';
      case 'planter': return 'text-green-600 bg-green-100';
      case 'family': return 'text-purple-600 bg-purple-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3600000) return `${(ms / 60000).toFixed(1)}m`;
    return `${(ms / 3600000).toFixed(1)}h`;
  };

  const exportData = async (type: 'activities' | 'sessions' | 'analytics') => {
    try {
      const response = await fetch(`/api/admin/export/${type}?${new URLSearchParams(filter as any)}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type}_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error(`Error exporting ${type}:`, error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <FaSpinner className="animate-spin text-3xl text-blue-600" />
        <span className="ml-2 text-lg">Loading user activity data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <FaUsers className="text-3xl text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">User Activity Dashboard</h1>
              <p className="text-gray-600">Monitor user behavior and system usage in real-time</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Connection Status */}
            <div className="flex items-center space-x-2">
              {isConnected ? (
                <>
                  <FaCheckCircle className="text-green-500" />
                  <span className="text-sm text-green-600">Live</span>
                </>
              ) : (
                <>
                  <FaTimesCircle className="text-red-500" />
                  <span className="text-sm text-red-600">Offline</span>
                </>
              )}
            </div>

            {/* Refresh Button */}
            <button
              onClick={() => {
                fetchUserActivities();
                fetchUserSessions();
                fetchUserAnalytics();
              }}
              disabled={refreshing}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
            >
              <FaRefresh className={refreshing ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>

            {/* Export Button */}
            <button
              onClick={() => exportData(activeTab)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center space-x-2"
            >
              <FaDownload />
              <span>Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* Analytics Cards */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Users</p>
                <p className="text-2xl font-bold text-green-600">{analytics.activeUsers.now}</p>
              </div>
              <FaUsers className="text-3xl text-green-600" />
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {analytics.activeUsers.last24h} in last 24h
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Users</p>
                <p className="text-2xl font-bold text-blue-600">{analytics.totalUsers}</p>
              </div>
              <FaUsers className="text-3xl text-blue-600" />
            </div>
            <p className="text-sm text-gray-500 mt-2">
              +{analytics.newUsers.today} today
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Session</p>
                <p className="text-2xl font-bold text-purple-600">
                  {analytics.averageSessionDuration.toFixed(1)}m
                </p>
              </div>
              <FaClock className="text-3xl text-purple-600" />
            </div>
            <p className="text-sm text-gray-500 mt-2">
              {analytics.bounceRate.toFixed(1)}% bounce rate
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Error Rate</p>
                <p className="text-2xl font-bold text-red-600">
                  {analytics.errorRate.toFixed(1)}%
                </p>
              </div>
              <FaExclamationTriangle className="text-3xl text-red-600" />
            </div>
            <p className="text-sm text-gray-500 mt-2">
              System health metric
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { key: 'activities', label: 'Activities', count: activities.length },
              { key: 'sessions', label: 'Live Sessions', count: sessions.length },
              { key: 'analytics', label: 'Analytics', count: null },
              { key: 'suspicious', label: 'Suspicious', count: suspiciousActivities.length },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`py-4 px-2 border-b-2 font-medium text-sm ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
                {tab.count !== null && (
                  <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Search and Filters */}
          {(activeTab === 'activities' || activeTab === 'sessions') && (
            <div className="mb-6 space-y-4">
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                {/* Search */}
                <div className="flex-1 relative">
                  <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search users, actions, or descriptions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                {/* Filter Toggle */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 flex items-center space-x-2"
                >
                  <FaFilter />
                  <span>Filters</span>
                </button>
              </div>

              {/* Filter Options */}
              {showFilters && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                  <select
                    value={filter.userType}
                    onChange={(e) => setFilter(prev => ({ ...prev, userType: e.target.value as any }))}
                    className="border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="all">All User Types</option>
                    <option value="family">Family</option>
                    <option value="planter">Planter</option>
                    <option value="validator">Validator</option>
                    <option value="admin">Admin</option>
                  </select>

                  <select
                    value={filter.category}
                    onChange={(e) => setFilter(prev => ({ ...prev, category: e.target.value as any }))}
                    className="border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="all">All Categories</option>
                    <option value="authentication">Authentication</option>
                    <option value="transaction">Transaction</option>
                    <option value="planting">Planting</option>
                    <option value="verification">Verification</option>
                    <option value="admin">Admin</option>
                    <option value="navigation">Navigation</option>
                  </select>

                  <select
                    value={filter.timeRange}
                    onChange={(e) => setFilter(prev => ({ ...prev, timeRange: e.target.value as any }))}
                    className="border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="1h">Last Hour</option>
                    <option value="24h">Last 24 Hours</option>
                    <option value="7d">Last 7 Days</option>
                    <option value="30d">Last 30 Days</option>
                  </select>

                  <select
                    value={filter.success?.toString() || 'all'}
                    onChange={(e) => setFilter(prev => ({ 
                      ...prev, 
                      success: e.target.value === 'all' ? 'all' : e.target.value === 'true'
                    }))}
                    className="border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="all">All Results</option>
                    <option value="true">Success Only</option>
                    <option value="false">Failures Only</option>
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Tab Content */}
          {activeTab === 'activities' && (
            <div className="space-y-4">
              {filteredActivities.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <FaEye className="mx-auto text-4xl mb-4" />
                  <p>No activities found matching your criteria</p>
                </div>
              ) : (
                filteredActivities.map(activity => (
                  <div
                    key={activity.id}
                    onClick={() => setSelectedActivity(activity)}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="text-2xl text-gray-600">
                          {getActivityIcon(activity.category)}
                        </div>
                        
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium text-gray-900">{activity.userName}</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getUserTypeColor(activity.userType)}`}>
                              {activity.userType}
                            </span>
                            {activity.success ? (
                              <FaCheckCircle className="text-green-500" />
                            ) : (
                              <FaTimesCircle className="text-red-500" />
                            )}
                          </div>
                          <p className="text-sm text-gray-600">{activity.description}</p>
                          <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                            <span>{activity.action}</span>
                            <span>•</span>
                            <span>{new Date(activity.timestamp).toLocaleString()}</span>
                            {activity.duration && (
                              <>
                                <span>•</span>
                                <span>{formatDuration(activity.duration)}</span>
                              </>
                            )}
                            {activity.metadata?.ipAddress && (
                              <>
                                <span>•</span>
                                <span>{activity.metadata.ipAddress}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-sm text-gray-500">
                        {activity.metadata?.location?.country && (
                          <div className="flex items-center space-x-1">
                            <FaMapMarkerAlt />
                            <span>{activity.metadata.location.country}</span>
                          </div>
                        )}
                        {activity.metadata?.deviceInfo?.isMobile ? (
                          <FaMobile className="text-gray-400" />
                        ) : (
                          <FaDesktop className="text-gray-400" />
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'sessions' && (
            <div className="space-y-4">
              {sessions.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <FaUsers className="mx-auto text-4xl mb-4" />
                  <p>No active sessions</p>
                </div>
              ) : (
                sessions.map(session => (
                  <div
                    key={session.id}
                    onClick={() => setSelectedSession(session)}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-medium">{session.userName}</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getUserTypeColor(session.userType)}`}>
                              {session.userType}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">{session.userEmail}</p>
                          <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
                            <span>Started: {new Date(session.startTime).toLocaleString()}</span>
                            <span>•</span>
                            <span>Duration: {formatDuration(session.duration)}</span>
                            <span>•</span>
                            <span>{session.activityCount} actions</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right text-sm text-gray-500">
                        <div className="flex items-center space-x-2">
                          {session.deviceInfo.isMobile ? <FaMobile /> : <FaDesktop />}
                          <span>{session.deviceInfo.browser}</span>
                        </div>
                        {session.location && (
                          <div className="flex items-center space-x-1 mt-1">
                            <FaMapMarkerAlt />
                            <span>{session.location.city}, {session.location.country}</span>
                          </div>
                        )}
                        <div className="text-xs text-gray-400 mt-1">
                          {session.ipAddress}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'analytics' && analytics && (
            <div className="space-y-6">
              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-lg border">
                  <h3 className="text-lg font-semibold mb-4">Activity Over Time</h3>
                  <Line
                    data={{
                      labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
                      datasets: [{
                        label: 'Activities',
                        data: analytics.activityByHour,
                        borderColor: '#3B82F6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        fill: true,
                      }],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false } },
                    }}
                    height={300}
                  />
                </div>

                <div className="bg-white p-6 rounded-lg border">
                  <h3 className="text-lg font-semibold mb-4">User Distribution</h3>
                  <Doughnut
                    data={{
                      labels: ['Family', 'Planter', 'Validator', 'Admin'],
                      datasets: [{
                        data: [
                          analytics.usersByType.family,
                          analytics.usersByType.planter,
                          analytics.usersByType.validator,
                          analytics.usersByType.admin,
                        ],
                        backgroundColor: ['#8B5CF6', '#10B981', '#3B82F6', '#EF4444'],
                      }],
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { position: 'bottom' } },
                    }}
                    height={300}
                  />
                </div>
              </div>

              {/* Top Activities */}
              <div className="bg-white p-6 rounded-lg border">
                <h3 className="text-lg font-semibold mb-4">Top Activities</h3>
                <div className="space-y-2">
                  {analytics.topActivities.map((activity, index) => (
                    <div key={index} className="flex items-center justify-between py-2">
                      <div className="flex items-center space-x-3">
                        <span className="w-6 h-6 bg-blue-100 text-blue-600 rounded-full text-xs flex items-center justify-center">
                          {index + 1}
                        </span>
                        <span>{activity.action}</span>
                        <span className="text-xs text-gray-500 px-2 py-1 bg-gray-100 rounded">
                          {activity.category}
                        </span>
                      </div>
                      <span className="font-medium">{activity.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'suspicious' && (
            <div className="space-y-4">
              {suspiciousActivities.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <FaShieldAlt className="mx-auto text-4xl mb-4" />
                  <p>No suspicious activities detected</p>
                </div>
              ) : (
                suspiciousActivities.map(activity => (
                  <div
                    key={activity.id}
                    className={`border-l-4 p-4 rounded-lg ${
                      activity.severity === 'critical' ? 'border-red-500 bg-red-50' :
                      activity.severity === 'high' ? 'border-orange-500 bg-orange-50' :
                      activity.severity === 'medium' ? 'border-yellow-500 bg-yellow-50' :
                      'border-blue-500 bg-blue-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <FaExclamationTriangle className={
                            activity.severity === 'critical' ? 'text-red-600' :
                            activity.severity === 'high' ? 'text-orange-600' :
                            activity.severity === 'medium' ? 'text-yellow-600' :
                            'text-blue-600'
                          } />
                          <span className="font-medium">{activity.userName}</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            activity.severity === 'critical' ? 'bg-red-100 text-red-800' :
                            activity.severity === 'high' ? 'bg-orange-100 text-orange-800' :
                            activity.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {activity.severity.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(activity.detectedAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          activity.status === 'new' ? 'bg-red-100 text-red-800' :
                          activity.status === 'investigating' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {activity.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Activity Detail Modal */}
      {selectedActivity && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto m-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Activity Details</h2>
                <button
                  onClick={() => setSelectedActivity(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FaTimesCircle size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">User</label>
                    <p>{selectedActivity.userName} ({selectedActivity.userEmail})</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">User Type</label>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getUserTypeColor(selectedActivity.userType)}`}>
                      {selectedActivity.userType}
                    </span>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Action</label>
                    <p>{selectedActivity.action}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Category</label>
                    <p>{selectedActivity.category}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Timestamp</label>
                    <p>{new Date(selectedActivity.timestamp).toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Success</label>
                    <div className="flex items-center space-x-2">
                      {selectedActivity.success ? (
                        <><FaCheckCircle className="text-green-500" /> <span>Yes</span></>
                      ) : (
                        <><FaTimesCircle className="text-red-500" /> <span>No</span></>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <p>{selectedActivity.description}</p>
                </div>

                {selectedActivity.errorMessage && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Error Message</label>
                    <p className="text-red-600">{selectedActivity.errorMessage}</p>
                  </div>
                )}

                {selectedActivity.metadata && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Metadata</label>
                    <pre className="bg-gray-100 p-3 rounded text-sm overflow-x-auto">
                      {JSON.stringify(selectedActivity.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Session Detail Modal */}
      {selectedSession && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto m-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">Session Details</h2>
                <button
                  onClick={() => setSelectedSession(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <FaTimesCircle size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">User</label>
                    <p>{selectedSession.userName} ({selectedSession.userEmail})</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${selectedSession.isActive ? 'bg-green-400' : 'bg-red-400'}`}></div>
                      <span>{selectedSession.isActive ? 'Active' : 'Ended'}</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Start Time</label>
                    <p>{new Date(selectedSession.startTime).toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Duration</label>
                    <p>{formatDuration(selectedSession.duration)}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">IP Address</label>
                    <p>{selectedSession.ipAddress}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Activity Count</label>
                    <p>{selectedSession.activityCount}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Device Info</label>
                  <div className="bg-gray-100 p-3 rounded">
                    <p><strong>Platform:</strong> {selectedSession.deviceInfo.platform}</p>
                    <p><strong>Browser:</strong> {selectedSession.deviceInfo.browser}</p>
                    <p><strong>Mobile:</strong> {selectedSession.deviceInfo.isMobile ? 'Yes' : 'No'}</p>
                    {selectedSession.deviceInfo.screenResolution && (
                      <p><strong>Screen:</strong> {selectedSession.deviceInfo.screenResolution}</p>
                    )}
                  </div>
                </div>

                {selectedSession.location && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Location</label>
                    <div className="bg-gray-100 p-3 rounded">
                      <p><strong>Country:</strong> {selectedSession.location.country}</p>
                      <p><strong>City:</strong> {selectedSession.location.city}</p>
                      {selectedSession.location.coordinates && (
                        <p><strong>Coordinates:</strong> {selectedSession.location.coordinates.lat}, {selectedSession.location.coordinates.lng}</p>
                      )}
                    </div>
                  </div>
                )}

                {selectedSession.pagesVisited.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Pages Visited</label>
                    <div className="bg-gray-100 p-3 rounded max-h-32 overflow-y-auto">
                      {selectedSession.pagesVisited.map((page, index) => (
                        <p key={index} className="text-sm">{page}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};