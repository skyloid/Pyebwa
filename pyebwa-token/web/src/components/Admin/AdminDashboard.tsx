import React, { useState, useEffect } from 'react';
import { 
  FaShieldAlt, 
  FaUsers, 
  FaChartBar, 
  FaCog,
  FaSignOutAlt,
  FaBell,
  FaSearch,
  FaHome
} from 'react-icons/fa';
import { SecurityDashboard } from './SecurityDashboard';
import { UserActivityDashboard } from './UserActivityDashboard';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatar?: string;
}

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'security' | 'users' | 'analytics'>('overview');
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [notifications, setNotifications] = useState<number>(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    // Load admin user info
    const loadAdminUser = async () => {
      try {
        const response = await fetch('/api/admin/profile', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          setAdminUser(data.user);
        }
      } catch (error) {
        console.error('Error loading admin profile:', error);
      }
    };

    loadAdminUser();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = '/login';
  };

  const menuItems = [
    {
      key: 'overview',
      label: 'Overview',
      icon: <FaHome />,
      description: 'System overview and quick stats',
    },
    {
      key: 'security',
      label: 'Security Monitoring',
      icon: <FaShieldAlt />,
      description: 'Security events and threat monitoring',
    },
    {
      key: 'users',
      label: 'User Activity',
      icon: <FaUsers />,
      description: 'User behavior and activity tracking',
    },
    {
      key: 'analytics',
      label: 'Analytics',
      icon: <FaChartBar />,
      description: 'Platform analytics and insights',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <div className={`bg-white shadow-lg transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-64'}`}>
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {!sidebarCollapsed && (
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <FaShieldAlt className="text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900">PYEBWA Admin</h1>
                  <p className="text-xs text-gray-500">Control Panel</p>
                </div>
              </div>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <FaCog className="text-gray-600" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-2">
          {menuItems.map(item => (
            <button
              key={item.key}
              onClick={() => setActiveTab(item.key as any)}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                activeTab === item.key
                  ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <div className="text-lg">{item.icon}</div>
              {!sidebarCollapsed && (
                <div className="text-left">
                  <div className="font-medium">{item.label}</div>
                  <div className="text-xs text-gray-500">{item.description}</div>
                </div>
              )}
            </button>
          ))}
        </nav>

        {/* User Profile */}
        {adminUser && (
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 bg-white">
            {!sidebarCollapsed ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                    {adminUser.avatar ? (
                      <img src={adminUser.avatar} alt="Avatar" className="w-8 h-8 rounded-full" />
                    ) : (
                      <span className="text-sm font-medium text-gray-600">
                        {adminUser.name.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{adminUser.name}</p>
                    <p className="text-xs text-gray-500">{adminUser.role}</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Logout"
                >
                  <FaSignOutAlt />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center space-y-2">
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                  {adminUser.avatar ? (
                    <img src={adminUser.avatar} alt="Avatar" className="w-8 h-8 rounded-full" />
                  ) : (
                    <span className="text-sm font-medium text-gray-600">
                      {adminUser.name.charAt(0)}
                    </span>
                  )}
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Logout"
                >
                  <FaSignOutAlt />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                {menuItems.find(item => item.key === activeTab)?.label}
              </h2>
              <p className="text-gray-600">
                {menuItems.find(item => item.key === activeTab)?.description}
              </p>
            </div>

            <div className="flex items-center space-x-4">
              {/* Search */}
              <div className="relative">
                <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Notifications */}
              <button className="relative p-2 text-gray-400 hover:text-gray-600 transition-colors">
                <FaBell className="text-xl" />
                {notifications > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {notifications}
                  </span>
                )}
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6">
          {activeTab === 'overview' && <OverviewDashboard />}
          {activeTab === 'security' && <SecurityDashboard />}
          {activeTab === 'users' && <UserActivityDashboard />}
          {activeTab === 'analytics' && <AnalyticsDashboard />}
        </main>
      </div>
    </div>
  );
};

// Overview Dashboard Component
const OverviewDashboard: React.FC = () => {
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    totalTransactions: 0,
    totalTreesPlanted: 0,
    systemHealth: 'healthy',
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch('/api/admin/overview-stats', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
          },
        });
        
        if (response.ok) {
          const data = await response.json();
          setStats(data.stats);
        }
      } catch (error) {
        console.error('Error fetching overview stats:', error);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-blue-600">{stats.totalUsers.toLocaleString()}</p>
            </div>
            <FaUsers className="text-3xl text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Users</p>
              <p className="text-2xl font-bold text-green-600">{stats.activeUsers.toLocaleString()}</p>
            </div>
            <FaUsers className="text-3xl text-green-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Transactions</p>
              <p className="text-2xl font-bold text-purple-600">{stats.totalTransactions.toLocaleString()}</p>
            </div>
            <FaChartBar className="text-3xl text-purple-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Trees Planted</p>
              <p className="text-2xl font-bold text-green-600">{stats.totalTreesPlanted.toLocaleString()}</p>
            </div>
            <FaShieldAlt className="text-3xl text-green-600" />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <button className="bg-blue-600 text-white p-4 rounded-lg hover:bg-blue-700 transition-colors">
            <FaUsers className="text-2xl mb-2" />
            <div className="text-sm font-medium">View Users</div>
          </button>
          <button className="bg-green-600 text-white p-4 rounded-lg hover:bg-green-700 transition-colors">
            <FaShieldAlt className="text-2xl mb-2" />
            <div className="text-sm font-medium">Security</div>
          </button>
          <button className="bg-purple-600 text-white p-4 rounded-lg hover:bg-purple-700 transition-colors">
            <FaChartBar className="text-2xl mb-2" />
            <div className="text-sm font-medium">Analytics</div>
          </button>
          <button className="bg-gray-600 text-white p-4 rounded-lg hover:bg-gray-700 transition-colors">
            <FaCog className="text-2xl mb-2" />
            <div className="text-sm font-medium">Settings</div>
          </button>
        </div>
      </div>

      {/* System Status */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">System Status</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span>Database</span>
            <span className="text-green-600 flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              Healthy
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>IPFS Network</span>
            <span className="text-green-600 flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              Connected
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Blockchain</span>
            <span className="text-green-600 flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              Synced
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Security Monitor</span>
            <span className="text-green-600 flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              Active
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Analytics Dashboard Component
const AnalyticsDashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h3 className="text-lg font-semibold mb-4">Platform Analytics</h3>
        <p className="text-gray-600">Comprehensive analytics dashboard coming soon...</p>
      </div>
    </div>
  );
};