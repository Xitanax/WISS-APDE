import React, { useState, useEffect } from 'react';
import { User, FileText, Calendar, Upload, Download, Trash2, Edit2, Clock, MapPin, AlertCircle } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const ApplicantPage = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [profile, setProfile] = useState({});
  const [applications, setApplications] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [cvs, setCvs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingProfile, setEditingProfile] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [profileRes, applicationsRes, meetingsRes, cvsRes] = await Promise.all([
        api.get('/applicant/profile'),
        api.get('/v2/applications/me'),
        api.get('/v2/meetings/me'),
        api.get('/v2/cv/me'),
      ]);

      setProfile(profileRes.data);
      setApplications(applicationsRes.data);
      setMeetings(meetingsRes.data);
      setCvs(cvsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      await api.put('/applicant/profile', profile);
      toast.success('Profil aktualisiert');
      setEditingProfile(false);
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const handleCvUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error('Nur PDF-Dateien sind erlaubt');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    try {
      await api.post('/v2/cv', formData);
      toast.success('CV erfolgreich hochgeladen');
      const response = await api.get('/v2/cv/me');
      setCvs(response.data);
      e.target.value = '';
    } catch (error) {
      console.error('Error uploading CV:', error);
    }
  };

  const handleCvDelete = async (cvId) => {
    if (!window.confirm('CV wirklich löschen?')) return;

    try {
      await api.delete(`/v2/cv/${cvId}`);
      toast.success('CV gelöscht');
      setCvs(cvs.filter(cv => cv.id !== cvId));
    } catch (error) {
      console.error('Error deleting CV:', error);
    }
  };

  const handleCvDownload = async (cvId, filename) => {
    try {
      const response = await api.get(`/v2/cv/${cvId}/download`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading CV:', error);
    }
  };

  const withdrawApplication = async (applicationId) => {
    if (!window.confirm('Bewerbung wirklich zurückziehen? Dies wird auch alle zugehörigen Meetings absagen.')) return;

    try {
      await api.patch(`/v2/applications/${applicationId}/withdraw`);
      toast.success('Bewerbung zurückgezogen');
      fetchData(); // Refresh all data
    } catch (error) {
      console.error('Error withdrawing application:', error);
    }
  };

  const selectMeetingSlot = async (meetingId, slotId) => {
    try {
      await api.post(`/v2/meetings/${meetingId}/select-slot`, { slotId });
      toast.success('Termin ausgewählt');
      fetchData();
    } catch (error) {
      console.error('Error selecting meeting slot:', error);
    }
  };

  const requestReschedule = async (meetingId, reason) => {
    try {
      await api.post(`/v2/meetings/${meetingId}/request-reschedule`, { reason });
      toast.success('Verschiebung beantragt');
      fetchData();
    } catch (error) {
      console.error('Error requesting reschedule:', error);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      submitted: { color: 'bg-blue-600', text: 'Eingereicht' },
      in_review: { color: 'bg-yellow-600', text: 'In Prüfung' },
      accepted: { color: 'bg-green-600', text: 'Angenommen' },
      rejected: { color: 'bg-red-600', text: 'Abgelehnt' },
      withdrawn: { color: 'bg-gray-600', text: 'Zurückgezogen' },
    };
    const { color, text } = statusMap[status] || { color: 'bg-gray-600', text: status };
    return <span className={`${color} text-white text-xs px-2 py-1 rounded`}>{text}</span>;
  };

  const getMeetingStatusBadge = (status) => {
    const statusMap = {
      proposed: { color: 'bg-blue-600', text: 'Termine vorgeschlagen' },
      confirmed: { color: 'bg-green-600', text: 'Bestätigt' },
      reschedule_requested: { color: 'bg-yellow-600', text: 'Verschiebung beantragt' },
      rescheduled: { color: 'bg-purple-600', text: 'Neue Termine' },
      cancelled: { color: 'bg-red-600', text: 'Abgesagt' },
      completed: { color: 'bg-gray-600', text: 'Abgeschlossen' },
    };
    const { color, text } = statusMap[status] || { color: 'bg-gray-600', text: status };
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
      <h1 className="text-3xl font-bold text-white mb-6">Mein Bereich</h1>
      
      <div className="mb-6">
        <div className="border-b border-gray-700">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'profile', label: 'Profil', icon: User },
              { id: 'applications', label: 'Bewerbungen', icon: FileText },
              { id: 'meetings', label: 'Termine', icon: Calendar },
              { id: 'cvs', label: 'Lebensläufe', icon: Upload },
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

      {activeTab === 'profile' && (
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-white">Persönliche Daten</h2>
            <button
              onClick={() => setEditingProfile(!editingProfile)}
              className="btn-secondary flex items-center gap-2"
            >
              <Edit2 size={16} />
              {editingProfile ? 'Abbrechen' : 'Bearbeiten'}
            </button>
          </div>

          <form onSubmit={handleProfileUpdate}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">E-Mail</label>
                <input
                  type="email"
                  value={profile.email || ''}
                  disabled
                  className="form-input bg-gray-600 cursor-not-allowed"
                />
              </div>

              <div>
                <label className="form-label">Name</label>
                <input
                  type="text"
                  value={profile.name || ''}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  disabled={!editingProfile}
                  className="form-input"
                  placeholder="Ihr vollständiger Name"
                />
              </div>

              <div>
                <label className="form-label">Geburtsdatum</label>
                <input
                  type="date"
                  value={profile.birthdate ? new Date(profile.birthdate).toISOString().split('T')[0] : ''}
                  onChange={(e) => setProfile({ ...profile, birthdate: e.target.value })}
                  disabled={!editingProfile}
                  className="form-input"
                />
              </div>

              <div className="md:col-span-2">
                <label className="form-label">Adresse</label>
                <textarea
                  value={profile.address || ''}
                  onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                  disabled={!editingProfile}
                  className="form-input"
                  rows={3}
                  placeholder="Ihre vollständige Adresse"
                />
              </div>
            </div>

            {editingProfile && (
              <div className="mt-4">
                <button type="submit" className="btn-primary">
                  Speichern
                </button>
              </div>
            )}
          </form>

          {profile.deleteAt && (
            <div className="mt-6 p-4 bg-red-900/20 border border-red-500 rounded-lg">
              <p className="text-red-400">
                <strong>Konto-Löschung beantragt</strong><br />
                Ihr Konto wird am {new Date(profile.deleteAt).toLocaleDateString('de-DE')} automatisch gelöscht.
              </p>
              <button
                onClick={async () => {
                  try {
                    await api.delete('/applicant/delete-request');
                    toast.success('Löschantrag zurückgezogen');
                    fetchData();
                  } catch (error) {
                    console.error('Error canceling deletion:', error);
                  }
                }}
                className="mt-2 btn-secondary"
              >
                Löschantrag zurückziehen
              </button>
            </div>
          )}

          {!profile.deleteAt && (
            <div className="mt-6 pt-6 border-t border-gray-700">
              <button
                onClick={async () => {
                  if (window.confirm('Möchten Sie die Löschung Ihres Kontos beantragen? Das Konto wird in 30 Tagen automatisch gelöscht.')) {
                    try {
                      await api.post('/applicant/delete-request');
                      toast.success('Löschantrag eingereicht');
                      fetchData();
                    } catch (error) {
                      console.error('Error requesting deletion:', error);
                    }
                  }
                }}
                className="btn-danger"
              >
                Konto löschen beantragen
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'applications' && (
        <div className="card">
          <h2 className="text-xl font-semibold text-white mb-4">Meine Bewerbungen</h2>
          {applications.length === 0 ? (
            <p className="text-gray-400">Sie haben noch keine Bewerbungen eingereicht.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Stelle</th>
                    <th>Eingereicht am</th>
                    <th>Status</th>
                    <th>Notiz</th>
                    <th>Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((application) => (
                    <tr key={application.id}>
                      <td className="font-medium">
                        {application.job?.title || 'Unbekannte Stelle'}
                      </td>
                      <td>
                        {new Date(application.createdAt).toLocaleDateString('de-DE')}
                      </td>
                      <td>{getStatusBadge(application.status)}</td>
                      <td className="max-w-xs truncate">
                        {application.applicantNote || '-'}
                      </td>
                      <td>
                        {['submitted', 'in_review'].includes(application.status) && (
                          <button
                            onClick={() => withdrawApplication(application.id)}
                            className="text-red-400 hover:text-red-300"
                            title="Bewerbung zurückziehen"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'meetings' && (
        <div className="card">
          <h2 className="text-xl font-semibold text-white mb-4">Meine Termine</h2>
          {meetings.length === 0 ? (
            <p className="text-gray-400">Keine Termine geplant.</p>
          ) : (
            <div className="space-y-4">
              {meetings.map((meeting) => (
                <MeetingCard 
                  key={meeting.id} 
                  meeting={meeting}
                  onSelectSlot={selectMeetingSlot}
                  onRequestReschedule={requestReschedule}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'cvs' && (
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-white">Meine Lebensläufe</h2>
            <div>
              <input
                type="file"
                accept=".pdf"
                onChange={handleCvUpload}
                className="hidden"
                id="cv-upload"
              />
              <label
                htmlFor="cv-upload"
                className="btn-primary cursor-pointer flex items-center gap-2"
              >
                <Upload size={16} />
                CV hochladen
              </label>
            </div>
          </div>

          {cvs.length === 0 ? (
            <p className="text-gray-400">Noch keine Lebensläufe hochgeladen.</p>
          ) : (
            <div className="space-y-3">
              {cvs.map((cv) => (
                <div key={cv.id} className="flex items-center justify-between bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <FileText size={24} className="text-blue-400" />
                    <span className="text-white">{cv.originalName}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCvDownload(cv.id, cv.originalName)}
                      className="text-gray-400 hover:text-white"
                      title="Herunterladen"
                    >
                      <Download size={16} />
                    </button>
                    <button
                      onClick={() => handleCvDelete(cv.id)}
                      className="text-gray-400 hover:text-red-400"
                      title="Löschen"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Meeting Card Component for Applicants
const MeetingCard = ({ meeting, onSelectSlot, onRequestReschedule }) => {
  const [rescheduleReason, setRescheduleReason] = useState('');
  const [showRescheduleForm, setShowRescheduleForm] = useState(false);

  const handleRescheduleRequest = () => {
    if (!rescheduleReason.trim()) {
      toast.error('Bitte geben Sie einen Grund für die Verschiebung an');
      return;
    }
    onRequestReschedule(meeting.id, rescheduleReason);
    setShowRescheduleForm(false);
    setRescheduleReason('');
  };

  const getMeetingStatusBadge = (status) => {
    const statusMap = {
      proposed: { color: 'bg-blue-600', text: 'Termine vorgeschlagen' },
      confirmed: { color: 'bg-green-600', text: 'Bestätigt' },
      reschedule_requested: { color: 'bg-yellow-600', text: 'Verschiebung beantragt' },
      rescheduled: { color: 'bg-purple-600', text: 'Neue Termine' },
      cancelled: { color: 'bg-red-600', text: 'Abgesagt' },
      completed: { color: 'bg-gray-600', text: 'Abgeschlossen' },
    };
    const { color, text } = statusMap[status] || { color: 'bg-gray-600', text: status };
    return <span className={`${color} text-white text-xs px-2 py-1 rounded`}>{text}</span>;
  };

  return (
    <div className="bg-gray-700 rounded-lg p-4">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="font-medium text-white">
              {meeting.job?.title || 'Unbekannte Stelle'}
            </h3>
            {getMeetingStatusBadge(meeting.status)}
          </div>

          {meeting.status === 'proposed' || meeting.status === 'rescheduled' ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-300">Bitte wählen Sie einen Termin:</p>
              {meeting.timeSlots?.map((slot, index) => (
                <div key={slot._id} className="bg-gray-600 rounded p-3">
                  <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-300">
                      <div className="flex items-center gap-2">
                        <Calendar size={14} />
                        {new Date(slot.startsAt).toLocaleDateString('de-DE')}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock size={14} />
                        {new Date(slot.startsAt).toLocaleTimeString('de-DE', {
                          hour: '2-digit', minute: '2-digit'
                        })} - {new Date(slot.endsAt).toLocaleTimeString('de-DE', {
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <MapPin size={14} />
                        {meeting.mode} - {meeting.location || 'Keine Angabe'}
                      </div>
                    </div>
                    <button
                      onClick={() => onSelectSlot(meeting.id, slot._id)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                    >
                      Auswählen
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : meeting.finalStartsAt ? (
            <div className="text-sm text-gray-300 space-y-1">
              <div className="flex items-center gap-2">
                <Calendar size={14} />
                {new Date(meeting.finalStartsAt).toLocaleDateString('de-DE')}
              </div>
              <div className="flex items-center gap-2">
                <Clock size={14} />
                {new Date(meeting.finalStartsAt).toLocaleTimeString('de-DE', {
                  hour: '2-digit', minute: '2-digit'
                })} - {new Date(meeting.finalEndsAt).toLocaleTimeString('de-DE', {
                  hour: '2-digit', minute: '2-digit'
                })}
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={14} />
                {meeting.mode} - {meeting.location || 'Keine Angabe'}
              </div>
            </div>
          ) : null}

          {meeting.rescheduleReason && (
            <div className="mt-2 text-sm text-yellow-400">
              <AlertCircle size={14} className="inline mr-1" />
              Grund: {meeting.rescheduleReason}
            </div>
          )}

          {meeting.status === 'confirmed' && (
            <div className="mt-3">
              {!showRescheduleForm ? (
                <button
                  onClick={() => setShowRescheduleForm(true)}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded text-sm"
                >
                  Verschiebung beantragen
                </button>
              ) : (
                <div className="space-y-2">
                  <textarea
                    value={rescheduleReason}
                    onChange={(e) => setRescheduleReason(e.target.value)}
                    placeholder="Grund für die Verschiebung..."
                    className="w-full p-2 bg-gray-600 border border-gray-500 rounded text-white text-sm"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleRescheduleRequest}
                      className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded text-sm"
                    >
                      Beantragen
                    </button>
                    <button
                      onClick={() => setShowRescheduleForm(false)}
                      className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm"
                    >
                      Abbrechen
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApplicantPage;
