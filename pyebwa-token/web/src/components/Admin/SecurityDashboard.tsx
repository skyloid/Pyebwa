import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  FaShieldAlt, 
  FaExclamationTriangle, 
  FaBan,
  FaChartLine,
  FaClock,
  FaGlobe,
  FaLock,
  FaUserShield,
  FaNetworkWired,
  FaCheckCircle,
  FaTimesCircle
} from 'react-icons/fa';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { format } from 'date-fns';
import { useWebSocket } from '../../hooks/useWebSocket';
import './SecurityDashboard.css';

interface SecurityEvent {
  id: string;
  timestamp: number;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  target?: string;
  description: string;
  metadata?: any;
  resolved?: boolean;
}

interface SecurityMetrics {
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsBySeverity: Record<string, number>;
  eventsPerHour: number[];
  topThreats: string[];
  blockedIPs: string[];
  activeThreatLevel: 'low' | 'medium' | 'high' | 'critical';
}

export const SecurityDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [recentEvents, setRecentEvents] = useState<SecurityEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null);
  const [filter, setFilter] = useState({
    severity: 'all',
    type: 'all',
    timeRange: '1h',
  });
  const [loading, setLoading] = useState(true);

  const { messages, isConnected } = useWebSocket('/security');

  // Handle WebSocket messages
  useEffect(() => {
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      
      if (lastMessage.type === 'initial-data') {
        setMetrics(lastMessage.data.metrics);
        setRecentEvents(lastMessage.data.recentEvents);
        setLoading(false);
      } else if (lastMessage.type === 'security-event') {
        // Add new event to the list
        setRecentEvents(prev => [lastMessage.data, ...prev].slice(0, 100));
        
        // Update metrics
        updateMetricsWithNewEvent(lastMessage.data);
      } else if (lastMessage.type === 'security-alert') {
        // Show alert notification
        showAlert(lastMessage.data);
      }
    }
  }, [messages]);

  // Update metrics when new event arrives
  const updateMetricsWithNewEvent = (event: SecurityEvent) => {
    setMetrics(prev => {
      if (!prev) return null;
      
      return {
        ...prev,
        totalEvents: prev.totalEvents + 1,
        eventsByType: {
          ...prev.eventsByType,
          [event.type]: (prev.eventsByType[event.type] || 0) + 1,
        },
        eventsBySeverity: {
          ...prev.eventsBySeverity,
          [event.severity]: (prev.eventsBySeverity[event.severity] || 0) + 1,
        },
      };
    });
  };

  // Show security alert
  const showAlert = (alert: any) => {
    // Implement notification system
    console.log('Security Alert:', alert);
  };

  // Get threat level color
  const getThreatLevelColor = (level: string) => {
    switch (level) {
      case 'critical': return '#f44336';
      case 'high': return '#ff9800';
      case 'medium': return '#ffeb3b';
      case 'low': return '#4caf50';
      default: return '#9e9e9e';
    }
  };

  // Get severity color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'severity-critical';
      case 'high': return 'severity-high';
      case 'medium': return 'severity-medium';
      case 'low': return 'severity-low';
      default: return '';
    }
  };

  // Filter events
  const filteredEvents = recentEvents.filter(event => {
    if (filter.severity !== 'all' && event.severity !== filter.severity) return false;
    if (filter.type !== 'all' && event.type !== filter.type) return false;
    
    const now = Date.now();
    const eventTime = event.timestamp;
    
    switch (filter.timeRange) {
      case '1h':
        return now - eventTime < 3600000;
      case '24h':
        return now - eventTime < 86400000;
      case '7d':
        return now - eventTime < 604800000;
      default:
        return true;
    }
  });

  // Chart data
  const hourlyChartData = {
    labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
    datasets: [
      {
        label: 'Security Events',
        data: metrics?.eventsPerHour || [],
        borderColor: '#00217D',
        backgroundColor: 'rgba(0, 33, 125, 0.1)',
        tension: 0.4,
      },
    ],
  };

  const severityChartData = {
    labels: ['Critical', 'High', 'Medium', 'Low'],
    datasets: [
      {
        data: [
          metrics?.eventsBySeverity.critical || 0,
          metrics?.eventsBySeverity.high || 0,
          metrics?.eventsBySeverity.medium || 0,
          metrics?.eventsBySeverity.low || 0,
        ],
        backgroundColor: ['#f44336', '#ff9800', '#ffeb3b', '#4caf50'],
      },
    ],
  };

  const typeChartData = {
    labels: Object.keys(metrics?.eventsByType || {}),
    datasets: [
      {
        label: 'Events by Type',
        data: Object.values(metrics?.eventsByType || {}),
        backgroundColor: '#00217D',
      },
    ],
  };

  if (loading) {
    return (
      <div className="security-dashboard-loading">
        <FaShieldAlt className="loading-icon" />
        <p>Loading security data...</p>
      </div>
    );
  }

  return (
    <div className="security-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <div className="header-title">
          <FaShieldAlt className="header-icon" />
          <h1>Security Monitoring Dashboard</h1>
        </div>
        
        <div className="connection-status">
          {isConnected ? (
            <>
              <FaCheckCircle className="status-icon connected" />
              <span>Live Monitoring Active</span>
            </>
          ) : (
            <>
              <FaTimesCircle className="status-icon disconnected" />
              <span>Reconnecting...</span>
            </>
          )}
        </div>
      </div>

      {/* Threat Level Banner */}
      <motion.div 
        className={`threat-level-banner threat-level-${metrics?.activeThreatLevel}`}
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="threat-level-content">
          <FaExclamationTriangle className="threat-icon" />
          <div>
            <h2>Current Threat Level: {metrics?.activeThreatLevel?.toUpperCase()}</h2>
            <p>System is operating under {metrics?.activeThreatLevel} security threat conditions</p>
          </div>
        </div>
        
        <div className="threat-level-indicator">
          <div 
            className="indicator-bar"
            style={{ 
              backgroundColor: getThreatLevelColor(metrics?.activeThreatLevel || 'low'),
              width: `${
                metrics?.activeThreatLevel === 'critical' ? 100 :
                metrics?.activeThreatLevel === 'high' ? 75 :
                metrics?.activeThreatLevel === 'medium' ? 50 : 25
              }%`
            }}
          />
        </div>
      </motion.div>

      {/* Key Metrics */}
      <div className="metrics-grid">
        <motion.div className="metric-card" whileHover={{ scale: 1.02 }}>
          <div className="metric-icon">
            <FaChartLine />
          </div>
          <div className="metric-content">
            <h3>Total Events</h3>
            <div className="metric-value">{metrics?.totalEvents || 0}</div>
            <div className="metric-change">Last 24 hours</div>
          </div>
        </motion.div>

        <motion.div className="metric-card" whileHover={{ scale: 1.02 }}>
          <div className="metric-icon">
            <FaBan />
          </div>
          <div className="metric-content">
            <h3>Blocked IPs</h3>
            <div className="metric-value">{metrics?.blockedIPs.length || 0}</div>
            <div className="metric-change">Currently blocked</div>
          </div>
        </motion.div>

        <motion.div className="metric-card" whileHover={{ scale: 1.02 }}>
          <div className="metric-icon">
            <FaExclamationTriangle />
          </div>
          <div className="metric-content">
            <h3>Critical Events</h3>
            <div className="metric-value">{metrics?.eventsBySeverity.critical || 0}</div>
            <div className="metric-change">Requires attention</div>
          </div>
        </motion.div>

        <motion.div className="metric-card" whileHover={{ scale: 1.02 }}>
          <div className="metric-icon">
            <FaUserShield />
          </div>
          <div className="metric-content">
            <h3>Failed Logins</h3>
            <div className="metric-value">{metrics?.eventsByType.login_failure || 0}</div>
            <div className="metric-change">Authentication failures</div>
          </div>
        </motion.div>
      </div>

      {/* Charts Section */}
      <div className="charts-section">
        <div className="chart-container">
          <h3>Security Events Timeline</h3>
          <Line 
            data={hourlyChartData} 
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: false },
              },
              scales: {
                y: { beginAtZero: true },
              },
            }}
          />
        </div>

        <div className="chart-row">
          <div className="chart-container small">
            <h3>Events by Severity</h3>
            <Doughnut 
              data={severityChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'bottom' },
                },
              }}
            />
          </div>

          <div className="chart-container small">
            <h3>Events by Type</h3>
            <Bar 
              data={typeChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                },
                scales: {
                  y: { beginAtZero: true },
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* Recent Events */}
      <div className="events-section">
        <div className="events-header">
          <h2>Recent Security Events</h2>
          
          <div className="event-filters">
            <select 
              value={filter.severity}
              onChange={(e) => setFilter({ ...filter, severity: e.target.value })}
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <select 
              value={filter.type}
              onChange={(e) => setFilter({ ...filter, type: e.target.value })}
            >
              <option value="all">All Types</option>
              {Object.keys(metrics?.eventsByType || {}).map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>

            <select 
              value={filter.timeRange}
              onChange={(e) => setFilter({ ...filter, timeRange: e.target.value })}
            >
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="all">All Time</option>
            </select>
          </div>
        </div>

        <div className="events-list">
          {filteredEvents.map(event => (
            <motion.div 
              key={event.id}
              className={`event-item ${getSeverityColor(event.severity)}`}
              onClick={() => setSelectedEvent(event)}
              whileHover={{ x: 5 }}
            >
              <div className="event-time">
                <FaClock />
                {format(event.timestamp, 'HH:mm:ss')}
              </div>
              
              <div className="event-severity">
                <span className={`severity-badge ${event.severity}`}>
                  {event.severity.toUpperCase()}
                </span>
              </div>
              
              <div className="event-type">{event.type}</div>
              
              <div className="event-source">
                <FaGlobe />
                {event.source}
              </div>
              
              <div className="event-description">{event.description}</div>
              
              <div className="event-status">
                {event.resolved ? (
                  <span className="resolved">Resolved</span>
                ) : (
                  <span className="active">Active</span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Event Details Modal */}
      {selectedEvent && (
        <motion.div 
          className="event-modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => setSelectedEvent(null)}
        >
          <motion.div 
            className="event-modal"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2>Security Event Details</h2>
            
            <div className="event-details">
              <div className="detail-row">
                <span className="detail-label">Event ID:</span>
                <span className="detail-value">{selectedEvent.id}</span>
              </div>
              
              <div className="detail-row">
                <span className="detail-label">Timestamp:</span>
                <span className="detail-value">
                  {format(selectedEvent.timestamp, 'yyyy-MM-dd HH:mm:ss')}
                </span>
              </div>
              
              <div className="detail-row">
                <span className="detail-label">Type:</span>
                <span className="detail-value">{selectedEvent.type}</span>
              </div>
              
              <div className="detail-row">
                <span className="detail-label">Severity:</span>
                <span className={`severity-badge ${selectedEvent.severity}`}>
                  {selectedEvent.severity.toUpperCase()}
                </span>
              </div>
              
              <div className="detail-row">
                <span className="detail-label">Source:</span>
                <span className="detail-value">{selectedEvent.source}</span>
              </div>
              
              {selectedEvent.target && (
                <div className="detail-row">
                  <span className="detail-label">Target:</span>
                  <span className="detail-value">{selectedEvent.target}</span>
                </div>
              )}
              
              <div className="detail-row">
                <span className="detail-label">Description:</span>
                <span className="detail-value">{selectedEvent.description}</span>
              </div>
              
              {selectedEvent.metadata && (
                <div className="detail-row">
                  <span className="detail-label">Additional Data:</span>
                  <pre className="detail-value">
                    {JSON.stringify(selectedEvent.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>
            
            <div className="modal-actions">
              <button 
                className="btn-action resolve"
                onClick={() => {
                  // Handle resolve action
                  setSelectedEvent(null);
                }}
              >
                Mark as Resolved
              </button>
              
              <button 
                className="btn-action block"
                onClick={() => {
                  // Handle block action
                  setSelectedEvent(null);
                }}
              >
                Block Source IP
              </button>
              
              <button 
                className="btn-action close"
                onClick={() => setSelectedEvent(null)}
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Top Threats */}
      {metrics?.topThreats.length > 0 && (
        <div className="threats-section">
          <h2>Active Threats</h2>
          <div className="threats-list">
            {metrics.topThreats.map((threat, index) => (
              <div key={index} className="threat-item">
                <FaExclamationTriangle className="threat-icon" />
                <span>{threat}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Blocked IPs */}
      <div className="blocked-ips-section">
        <h2>Blocked IP Addresses</h2>
        <div className="blocked-ips-grid">
          {metrics?.blockedIPs.slice(0, 10).map((ip, index) => (
            <div key={index} className="blocked-ip">
              <FaBan className="block-icon" />
              <span>{ip}</span>
              <button className="unblock-btn">Unblock</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};