import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import './FeedbackForm.css';

function FeedbackForm() {
  const [config, setConfig] = useState(null);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [driverSearch, setDriverSearch] = useState('');
  const [showDriverDropdown, setShowDriverDropdown] = useState(false);
  const navigate = useNavigate();

  const userName = localStorage.getItem('userName');

  const [formData, setFormData] = useState({
    entity_type: 'driver',
    entity_id: '',
    rating: 3,
    text: ''
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.driver-search-container')) {
        setShowDriverDropdown(false);
      }
    };
    
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await api.get('/config');
      setConfig(response.data.data);
    } catch (err) {
      setError('Failed to load configuration');
    } finally {
      setLoading(false);
    }
  };

  const fetchDrivers = async (search = '') => {
    try {
      const response = await api.get(`/feedback/drivers?search=${search}`);
      setDrivers(response.data.data);
      setShowDriverDropdown(true);
    } catch (err) {
      console.error('Failed to load drivers:', err);
      setDrivers([]);
    }
  };

  const handleDriverSearch = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      fetchDrivers(driverSearch);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      await api.post('/feedback', formData);
      setSuccess('Feedback submitted successfully!');
      
      setFormData({
        entity_type: 'driver',
        entity_id: '',
        rating: 3,
        text: ''
      });

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit feedback');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'rating' ? parseInt(value) : value
    }));
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div>
      <div className="header">
        <div className="header-content">
          <h1>Submit Feedback</h1>
          <div className="header-actions">
            <span className="user-info">{userName}</span>
            <button onClick={handleLogout} className="btn btn-secondary">
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="container">
        <div className="card">
          <h2>Share Your Experience</h2>
          <p style={{ color: '#666', marginBottom: '20px' }}>
            Help us improve our services by providing honest feedback
          </p>

          {success && <div className="alert alert-success">{success}</div>}
          {error && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="feedback-tabs">
              {config?.features.driver_feedback?.enabled && (
                <button
                  type="button"
                  className={`feedback-tab ${formData.entity_type === 'driver' ? 'active' : ''}`}
                  onClick={() => setFormData(prev => ({ ...prev, entity_type: 'driver', entity_id: '' }))}
                >
                  Driver
                </button>
              )}
              {config?.features.trip_feedback?.enabled && (
                <button
                  type="button"
                  className={`feedback-tab ${formData.entity_type === 'trip' ? 'active' : ''}`}
                  onClick={() => setFormData(prev => ({ ...prev, entity_type: 'trip', entity_id: '' }))}
                >
                  Trip
                </button>
              )}
              {config?.features.app_feedback?.enabled && (
                <button
                  type="button"
                  className={`feedback-tab ${formData.entity_type === 'app' ? 'active' : ''}`}
                  onClick={() => setFormData(prev => ({ ...prev, entity_type: 'app', entity_id: '' }))}
                >
                  Mobile App
                </button>
              )}
              {config?.features.marshal_feedback?.enabled && (
                <button
                  type="button"
                  className={`feedback-tab ${formData.entity_type === 'marshal' ? 'active' : ''}`}
                  onClick={() => setFormData(prev => ({ ...prev, entity_type: 'marshal', entity_id: '' }))}
                >
                  Marshal
                </button>
              )}
            </div>

            <div className="form-group">
              {formData.entity_type === 'driver' && (
                <>
                  <label>Search Driver by ID * <small style={{color: '#666', fontWeight: 'normal'}}>(Press Enter to search)</small></label>
                  <div className="driver-search-container">
                    <input
                      type="text"
                      name="driver_search"
                      value={driverSearch}
                      onChange={(e) => setDriverSearch(e.target.value)}
                      onKeyDown={handleDriverSearch}
                      placeholder="Type driver ID and press Enter (e.g., DRV001)"
                      autoComplete="off"
                    />
                    {showDriverDropdown && drivers.length > 0 && (
                      <div className="driver-dropdown">
                        {drivers.map(driver => (
                          <div
                            key={driver.driver_id}
                            className="driver-option"
                            onClick={() => {
                              setFormData(prev => ({ ...prev, entity_id: driver.driver_id }));
                              setDriverSearch(`${driver.driver_id} - ${driver.name}`);
                              setShowDriverDropdown(false);
                            }}
                          >
                            <strong>{driver.driver_id}</strong> - {driver.name}
                            <span className="driver-score">
                              Score: {driver.avg_score ? driver.avg_score.toFixed(2) : 'New'}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    {showDriverDropdown && driverSearch && drivers.length === 0 && (
                      <div className="driver-dropdown">
                        <div className="driver-option no-results">
                          No drivers found matching "{driverSearch}"
                        </div>
                      </div>
                    )}
                  </div>
                  {formData.entity_id && (
                    <small style={{ color: '#28a745', marginTop: '5px', display: 'block' }}>
                      ✓ Selected: {formData.entity_id}
                    </small>
                  )}
                  <input
                    type="hidden"
                    name="entity_id"
                    value={formData.entity_id}
                    required
                  />
                </>
              )}

              {formData.entity_type === 'trip' && (
                <>
                  <label>Trip ID *</label>
                  <input
                    type="text"
                    name="entity_id"
                    value={formData.entity_id}
                    onChange={handleChange}
                    placeholder="e.g., T-12345"
                    required
                  />
                </>
              )}

              {formData.entity_type === 'app' && (
                <>
                  <label>App Version *</label>
                  <input
                    type="text"
                    name="entity_id"
                    value={formData.entity_id}
                    onChange={handleChange}
                    placeholder="e.g., v2.5.0"
                    required
                  />
                </>
              )}

              {formData.entity_type === 'marshal' && (
                <>
                  <label>Marshal ID *</label>
                  <input
                    type="text"
                    name="entity_id"
                    value={formData.entity_id}
                    onChange={handleChange}
                    placeholder="e.g., M-001"
                    required
                  />
                </>
              )}
            </div>

            <div className="form-group">
              <label>Rating *</label>
              <div className="rating-container">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    type="button"
                    className={`star ${formData.rating >= star ? 'active' : ''}`}
                    onClick={() => setFormData(prev => ({ ...prev, rating: star }))}
                  >
                    {star}
                  </button>
                ))}
                <span className="rating-label">
                  {formData.rating === 1 && 'Very Bad'}
                  {formData.rating === 2 && 'Bad'}
                  {formData.rating === 3 && 'Average'}
                  {formData.rating === 4 && 'Good'}
                  {formData.rating === 5 && 'Excellent'}
                </span>
              </div>
            </div>

            <div className="form-group">
              <label>Your Feedback *</label>
              <textarea
                name="text"
                value={formData.text}
                onChange={handleChange}
                placeholder="Share your experience in detail..."
                maxLength={500}
                required
              />
              <small>{formData.text.length}/500 characters</small>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={submitting}
            >
              {submitting ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default FeedbackForm;
