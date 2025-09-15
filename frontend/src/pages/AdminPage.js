import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Users, Key, RotateCcw, Copy, Eye, EyeOff } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const AdminPage = () => {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showUserModal, setShowUserModal] = useState(false);
  const [showAgencyModal, setShowAgencyModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editingAgency, setEditingAgency] = useState(null);

  useEffect(() => {
    fetchUsers();
    fetchAgencies();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/v2/admin/users');
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAgencies = async () => {
    try {
      const response = await api.get('/v2/agencies');
      setAgencies(response.data);
    } catch (error) {
      console.error('Error fetching agencies:', error);
    }
  };

  const handleCreateUser = async (userData) => {
    try {
      await api.post('/v2/admin/users', userData);
      toast.success('Benutzer erstellt');
      fetchUsers();
      setShowUserModal(false);
      setEditingUser(null);
    } catch (error) {
      console.error('Error creating user:', error);
    }
  };

  const handleUpdateUser = async (userData) => {
    try {
      await api.patch(`/v2/admin/users/${editingUser.id}`, userData);
      toast.success('Benutzer aktualisiert');
      fetchUsers();
      setShowUserModal(false);
      setEditingUser(null);
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Benutzer wirklich löschen?')) return;
    try {
      await api.delete(`/v2/admin/users/${userId}`);
      toast.success('Benutzer gelöscht');
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  const handleCreateAgency = async (agencyData) => {
    try {
      const response = await api.post('/v2/agencies', agencyData);
      toast.success(`Agency erstellt. API Key: ${response.data.apiKey}`);
      fetchAgencies();
      setShowAgencyModal(false);
      setEditingAgency(null);
    } catch (error) {
      console.error('Error creating agency:', error);
    }
  };

  const handleUpdateAgency = async (agencyData) => {
    try {
      await api.patch(`/v2/agencies/${editingAgency.id}`, agencyData);
      toast.success('Agency aktualisiert');
      fetchAgencies();
      setShowAgencyModal(false);
      setEditingAgency(null);
    } catch (error) {
      console.error('Error updating agency:', error);
    }
  };

  const handleRotateApiKey = async (agencyId) => {
    if (!window.confirm('API Key wirklich rotieren? Der alte Key wird ungültig.')) return;
    try {
      const response = await api.post(`/v2/agencies/${agencyId}/rotate-key`);
      toast.success(`Neuer API Key: ${response.data.apiKey}`);
      fetchAgencies();
    } catch (error) {
      console.error('Error rotating API key:', error);
    }
  };

  const handleDeleteAgency = async (agencyId) => {
    if (!window.confirm('Agency wirklich löschen?')) return;
    try {
      await api.delete(`/v2/agencies/${agencyId}`);
      toast.success('Agency gelöscht');
      fetchAgencies();
    } catch (error) {
      console.error('Error deleting agency:', error);
    }
  };

  const copyToClipboard = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('In Zwischenablage kopiert');
    } catch (error) {
      toast.error('Kopieren fehlgeschlagen');
    }
  };

  const getRoleBadge = (role) => {
    const roleMap = {
      admin: { color: 'bg-red-600', text: 'Admin' },
      hr: { color: 'bg-blue-600', text: 'HR' },
      applicant: { color: 'bg-green-600', text: 'Bewerber' },
    };
    const { color, text } = roleMap[role] || { color: 'bg-gray-600', text: role };
    return <span className={`${color} text-white text-xs px-2 py-1 rounded`}>{text}</span>;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Daten werden geladen...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      <h1 className="text-3xl font-bold text-white mb-6">Admin Bereich</h1>
      
      <div className="mb-6">
        <div className="border-b border-gray-700">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'users', label: 'Benutzerverwaltung', icon: Users },
              { id: 'agencies', label: 'Partner APIs', icon: Key },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-500'
                      : 'border-transparent text-gray-400 hover:text-gray-300'
                  }`}
                >
                  <Icon size={16} />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {activeTab === 'users' && (
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-white">Benutzer</h2>
            <button
              onClick={() => {
                setEditingUser(null);
                setShowUserModal(true);
              }}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={16} />
              Neuer Benutzer
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>E-Mail</th>
                  <th>Name</th>
                  <th>Rolle</th>
                  <th>Erstellt am</th>
                  <th>Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="font-medium">{user.email}</td>
                    <td>{user.name || '-'}</td>
                    <td>{getRoleBadge(user.role)}</td>
                    <td>
                      {user.createdAt ? new Date(user.createdAt).toLocaleDateString('de-DE') : '-'}
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingUser(user);
                            setShowUserModal(true);
                          }}
                          className="text-blue-400 hover:text-blue-300"
                          title="Bearbeiten"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-red-400 hover:text-red-300"
                          title="Löschen"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'agencies' && (
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-white">Partner APIs</h2>
            <button
              onClick={() => {
                setEditingAgency(null);
                setShowAgencyModal(true);
              }}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={16} />
              Neue Agency
            </button>
          </div>

          <div className="space-y-4">
            {agencies.map((agency) => (
              <AgencyCard
                key={agency.id}
                agency={agency}
                onEdit={(agency) => {
                  setEditingAgency(agency);
                  setShowAgencyModal(true);
                }}
                onRotateKey={() => handleRotateApiKey(agency.id)}
                onDelete={() => handleDeleteAgency(agency.id)}
                onCopyKey={(key) => copyToClipboard(key)}
              />
            ))}
          </div>
        </div>
      )}

      {/* User Modal */}
      {showUserModal && (
        <UserModal
          user={editingUser}
          onClose={() => {
            setShowUserModal(false);
            setEditingUser(null);
          }}
          onSave={editingUser ? handleUpdateUser : handleCreateUser}
        />
      )}

      {/* Agency Modal */}
      {showAgencyModal && (
        <AgencyModal
          agency={editingAgency}
          onClose={() => {
            setShowAgencyModal(false);
            setEditingAgency(null);
          }}
          onSave={editingAgency ? handleUpdateAgency : handleCreateAgency}
        />
      )}
    </div>
  );
};

// Agency Card Component
const AgencyCard = ({ agency, onEdit, onRotateKey, onDelete, onCopyKey }) => {
  const [showKey, setShowKey] = useState(false);
  
  const maskedKey = agency.apiKey.slice(0, 8) + '****' + agency.apiKey.slice(-4);

  return (
    <div className="bg-gray-700 rounded-lg p-4">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <h3 className="text-white font-medium mb-2">{agency.name}</h3>
          <div className="flex items-center gap-2 mb-2">
            <code className="bg-gray-800 px-2 py-1 rounded text-sm text-gray-300 font-mono">
              {showKey ? agency.apiKey : maskedKey}
            </code>
            <button
              onClick={() => setShowKey(!showKey)}
              className="text-gray-400 hover:text-white"
              title={showKey ? 'Verstecken' : 'Anzeigen'}
            >
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
            <button
              onClick={() => onCopyKey(agency.apiKey)}
              className="text-gray-400 hover:text-white"
              title="Kopieren"
            >
              <Copy size={16} />
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {agency.permissions?.map((permission) => (
              <span
                key={permission}
                className="bg-blue-600 text-white text-xs px-2 py-1 rounded"
              >
                {permission}
              </span>
            ))}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onEdit(agency)}
            className="text-blue-400 hover:text-blue-300"
            title="Bearbeiten"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={onRotateKey}
            className="text-yellow-400 hover:text-yellow-300"
            title="API Key rotieren"
          >
            <RotateCcw size={16} />
          </button>
          <button
            onClick={onDelete}
            className="text-red-400 hover:text-red-300"
            title="Löschen"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
      <div className="text-sm text-gray-400">
        Status: {agency.active ? 'Aktiv' : 'Inaktiv'} • 
        Erstellt: {new Date(agency.createdAt).toLocaleDateString('de-DE')}
      </div>
    </div>
  );
};

// User Modal Component
const UserModal = ({ user, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    email: user?.email || '',
    password: '',
    role: user?.role || 'applicant',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = { ...formData };
    if (!data.password && user) {
      delete data.password; // Don't update password if empty for existing users
    }
    onSave(data);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg max-w-md w-full p-6">
        <h3 className="text-xl font-semibold text-white mb-4">
          {user ? 'Benutzer bearbeiten' : 'Neuer Benutzer'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="form-label">E-Mail *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="form-input"
              required
              disabled={!!user}
            />
          </div>

          <div>
            <label className="form-label">
              Passwort {user ? '(leer lassen für keine Änderung)' : '*'}
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="form-input"
              required={!user}
            />
          </div>

          <div>
            <label className="form-label">Rolle *</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="form-input"
              required
            >
              <option value="applicant">Bewerber</option>
              <option value="hr">HR</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="flex gap-3">
            <button type="submit" className="flex-1 btn-primary">
              {user ? 'Aktualisieren' : 'Erstellen'}
            </button>
            <button type="button" onClick={onClose} className="flex-1 btn-secondary">
              Abbrechen
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Agency Modal Component
const AgencyModal = ({ agency, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    name: agency?.name || '',
    permissions: agency?.permissions || ['jobs:read', 'applications:read'],
    active: agency?.active ?? true,
  });

  const availablePermissions = [
    'jobs:read',
    'jobs:write', 
    'jobs:delete',
    'applications:read',
    'applications:write',
    'applications:delete',
  ];

  const handlePermissionChange = (permission, checked) => {
    if (checked) {
      setFormData({
        ...formData,
        permissions: [...formData.permissions, permission],
      });
    } else {
      setFormData({
        ...formData,
        permissions: formData.permissions.filter((p) => p !== permission),
      });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-semibold text-white mb-4">
          {agency ? 'Agency bearbeiten' : 'Neue Agency'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="form-label">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="form-input"
              required
            />
          </div>

          <div>
            <label className="form-label">Berechtigungen</label>
            <div className="space-y-2">
              {availablePermissions.map((permission) => (
                <label key={permission} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.permissions.includes(permission)}
                    onChange={(e) => handlePermissionChange(permission, e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-gray-300">{permission}</span>
                </label>
              ))}
            </div>
          </div>

          {agency && (
            <div>
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="mr-2"
                />
                <span className="text-gray-300">Aktiv</span>
              </label>
            </div>
          )}

          <div className="flex gap-3">
            <button type="submit" className="flex-1 btn-primary">
              {agency ? 'Aktualisieren' : 'Erstellen'}
            </button>
            <button type="button" onClick={onClose} className="flex-1 btn-secondary">
              Abbrechen
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminPage;
