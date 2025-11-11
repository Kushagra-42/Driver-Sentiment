import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import api from '../api';
import './AdminDashboard.css';

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(null);
  const navigate = useNavigate();

  const userName = localStorage.getItem('userName');

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, driversRes, alertsRes, feedbackRes, configRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/drivers?sort=avg_score&order=desc'),
        api.get('/admin/alerts'),
        api.get('/admin/feedback?limit=100'),
        api.get('/config')
      ]);

      setStats(statsRes.data.data);
      setDrivers(driversRes.data.data.drivers);
      setAlerts(alertsRes.data.data);
      setFeedbacks(feedbackRes.data.data.feedbacks);
      setConfig(configRes.data.data);
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  return (
    <div>
      <div className="header">
        <div className="header-content">
          <h1>Admin Dashboard</h1>
          <div className="header-actions">
            <span className="user-info">{userName} (Admin)</span>
            <button onClick={handleLogout} className="btn btn-danger">
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="container">
        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <h3>Total Drivers</h3>
            <div className="value">{stats?.total_drivers || 0}</div>
          </div>
          <div className="stat-card">
            <h3>Total Feedback</h3>
            <div className="value">{stats?.total_feedback || 0}</div>
          </div>
          <div className="stat-card">
            <h3>Alerts</h3>
            <div className="value" style={{ color: stats?.alert_count > 0 ? '#dc3545' : '#28a745' }}>
              {stats?.alert_count || 0}
            </div>
          </div>
          <div className="stat-card">
            <h3>Avg Score</h3>
            <div className="value">{stats?.avg_score_stats?.avg?.toFixed(2) || '0.00'}</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button 
            className={`tab ${activeTab === 'drivers' ? 'active' : ''}`}
            onClick={() => setActiveTab('drivers')}
          >
            Drivers
          </button>
          <button 
            className={`tab ${activeTab === 'alerts' ? 'active' : ''}`}
            onClick={() => setActiveTab('alerts')}
          >
            Alerts ({alerts.drivers?.length || 0})
          </button>
          <button 
            className={`tab ${activeTab === 'feedback' ? 'active' : ''}`}
            onClick={() => setActiveTab('feedback')}
          >
            Feedback
          </button>
          <button 
            className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            Settings
          </button>
        </div>

        {activeTab === 'overview' && <OverviewTab stats={stats} drivers={drivers} />}
        {activeTab === 'drivers' && <DriversTab drivers={drivers} />}
        {activeTab === 'alerts' && <AlertsTab alerts={alerts} />}
        {activeTab === 'feedback' && <FeedbackTab feedbacks={feedbacks} />}
        {activeTab === 'settings' && <SettingsTab config={config} onUpdate={fetchData} />}
      </div>
    </div>
  );
}

function OverviewTab({ stats, drivers }) {
  const topDrivers = drivers.slice(0, 10);
  const chartData = topDrivers.map(d => ({
    name: d.name.split(' ')[0],
    score: d.avg_score,
    feedback: d.total_feedback
  }));

  const sentimentData = [
    { name: 'Positive', count: stats?.sentiment_breakdown?.positive || 0, fill: '#28a745' },
    { name: 'Neutral', count: stats?.sentiment_breakdown?.neutral || 0, fill: '#ffc107' },
    { name: 'Negative', count: stats?.sentiment_breakdown?.negative || 0, fill: '#dc3545' }
  ];

  return (
    <div>
      <div className="card">
        <h2>Sentiment Distribution</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={sentimentData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="count" fill="#8884d8" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <h2>Top 10 Drivers by Score</h2>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis domain={[0, 5]} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="score" stroke="#007bff" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function DriversTab({ drivers }) {
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('avg_score');
  const [sortOrder, setSortOrder] = useState('desc');

  const filteredDrivers = drivers
    .filter(d => 
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.driver_id.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });

  return (
    <div className="card">
      <div style={{ marginBottom: '20px', display: 'flex', gap: '10px' }}>
        <input
          type="text"
          placeholder="Search drivers..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
        />
        <select 
          value={sortField}
          onChange={(e) => setSortField(e.target.value)}
          style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '4px' }}
        >
          <option value="avg_score">Avg Score</option>
          <option value="total_feedback">Total Feedback</option>
          <option value="name">Name</option>
        </select>
        <button 
          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          className="btn btn-secondary"
        >
          {sortOrder === 'asc' ? '↑' : '↓'}
        </button>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Driver ID</th>
              <th>Name</th>
              <th>Vehicle</th>
              <th>Avg Score</th>
              <th>Total Feedback</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredDrivers.map(driver => (
              <tr key={driver._id}>
                <td>{driver.driver_id}</td>
                <td>{driver.name}</td>
                <td>{driver.vehicle_number}</td>
                <td>
                  <span style={{ 
                    fontWeight: 'bold',
                    color: driver.avg_score < 2.5 ? '#dc3545' : driver.avg_score < 3.5 ? '#ffc107' : '#28a745'
                  }}>
                    {driver.avg_score.toFixed(2)}
                  </span>
                </td>
                <td>{driver.total_feedback}</td>
                <td>
                  <span className={`badge badge-${driver.status}`}>
                    {driver.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function AlertsTab({ alerts }) {
  const lowScoreDrivers = alerts.drivers || [];

  return (
    <div className="card">
      <h2>Low-Scoring Drivers (Score &lt; {alerts.threshold || 2.5})</h2>
      
      {lowScoreDrivers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          <h3>No Alerts!</h3>
          <p>All drivers are performing well.</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Driver ID</th>
                <th>Name</th>
                <th>Phone</th>
                <th>Avg Score</th>
                <th>Total Feedback</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {lowScoreDrivers.map(driver => (
                <tr key={driver._id} style={{ backgroundColor: '#fff3cd' }}>
                  <td>{driver.driver_id}</td>
                  <td><strong>{driver.name}</strong></td>
                  <td>{driver.phone}</td>
                  <td>
                    <span style={{ color: '#dc3545', fontWeight: 'bold', fontSize: '16px' }}>
                      {driver.avg_score.toFixed(2)}
                    </span>
                  </td>
                  <td>{driver.total_feedback}</td>
                  <td>
                    <span className={`badge badge-${driver.status}`}>
                      {driver.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function FeedbackTab({ feedbacks }) {
  const [filter, setFilter] = useState('all');

  const filteredFeedbacks = feedbacks.filter(f => {
    if (filter === 'all') return true;
    return f.entity_type === filter;
  });

  return (
    <div className="card">
      <div style={{ marginBottom: '20px' }}>
        <label style={{ marginRight: '10px', fontWeight: 500 }}>Filter by Type:</label>
        <select 
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          style={{ padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }}
        >
          <option value="all">All Feedback</option>
          <option value="driver">Driver</option>
          <option value="trip">Trip</option>
          <option value="app">App</option>
          <option value="marshal">Marshal</option>
        </select>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>Entity ID</th>
              <th>Rating</th>
              <th>Sentiment</th>
              <th>Feedback</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {filteredFeedbacks.map(feedback => (
              <tr key={feedback._id}>
                <td>
                  <span className="badge" style={{ backgroundColor: '#007bff', color: 'white' }}>
                    {feedback.entity_type}
                  </span>
                </td>
                <td>{feedback.entity_id}</td>
                <td>{feedback.rating} ⭐</td>
                <td>
                  {feedback.sentiment && (
                    <span className={`badge badge-${feedback.sentiment}`}>
                      {feedback.sentiment}
                    </span>
                  )}
                  {!feedback.sentiment && <span style={{ color: '#999' }}>N/A</span>}
                </td>
                <td style={{ maxWidth: '300px' }}>{feedback.text}</td>
                <td>{new Date(feedback.timestamp).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SettingsTab({ config, onUpdate }) {
  const [alertThreshold, setAlertThreshold] = useState(config?.alert_threshold || 2.5);
  const [emaAlpha, setEmaAlpha] = useState(config?.ema_alpha || 0.25);
  const [alertCooldown, setAlertCooldown] = useState(config?.alert_cooldown_s || 3600);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (config) {
      setAlertThreshold(config.alert_threshold || 2.5);
      setEmaAlpha(config.ema_alpha || 0.25);
      setAlertCooldown(config.alert_cooldown_s || 3600);
    }
  }, [config]);

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    
    try {
      await api.patch('/config', {
        alert_threshold: parseFloat(alertThreshold),
        ema_alpha: parseFloat(emaAlpha),
        alert_cooldown_s: parseInt(alertCooldown)
      });
      
      setMessage('Settings saved successfully!');
      setTimeout(() => setMessage(''), 3000);
      onUpdate();
    } catch (error) {
      setMessage('Failed to save settings: ' + (error.response?.data?.message || error.message));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card">
      <h2>System Configuration</h2>
      
      {message && (
        <div className={`alert ${message.includes('success') ? 'alert-success' : 'alert-error'}`}>
          {message}
        </div>
      )}

      <div style={{ maxWidth: '600px' }}>
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Alert Threshold
          </label>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
            Drivers with average score below this threshold will trigger alerts. 
            This also defines sentiment ranges: Negative (&lt; threshold), Neutral (threshold to threshold+1), Positive (≥ threshold+1)
          </p>
          <input
            type="number"
            min="1"
            max="4"
            step="0.1"
            value={alertThreshold}
            onChange={(e) => setAlertThreshold(e.target.value)}
            style={{ width: '100%', padding: '8px', fontSize: '16px' }}
          />
          <p style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>
            Current: {alertThreshold} (Range: 1.0 - 4.0)
          </p>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            EMA Alpha (Smoothing Factor)
          </label>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
            Weight given to new feedback in exponential moving average calculation. 
            Higher values make scores more responsive to recent feedback.
          </p>
          <input
            type="number"
            min="0.1"
            max="1"
            step="0.05"
            value={emaAlpha}
            onChange={(e) => setEmaAlpha(e.target.value)}
            style={{ width: '100%', padding: '8px', fontSize: '16px' }}
          />
          <p style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>
            Current: {emaAlpha} (Range: 0.1 - 1.0)
          </p>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
            Alert Cooldown (seconds)
          </label>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '10px' }}>
            Minimum time between alerts for the same driver to prevent alert spam.
          </p>
          <input
            type="number"
            min="60"
            max="86400"
            step="60"
            value={alertCooldown}
            onChange={(e) => setAlertCooldown(e.target.value)}
            style={{ width: '100%', padding: '8px', fontSize: '16px' }}
          />
          <p style={{ fontSize: '12px', color: '#999', marginTop: '5px' }}>
            Current: {(alertCooldown / 3600).toFixed(1)} hours (Range: 1 minute - 24 hours)
          </p>
        </div>

        <button 
          onClick={handleSave} 
          disabled={saving}
          className="btn btn-primary"
          style={{ width: '100%', padding: '12px', fontSize: '16px' }}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}

export default AdminDashboard;
