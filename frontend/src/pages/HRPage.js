import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Calendar, Users, MapPin, Clock, ChevronDown, ChevronUp, AlertCircle, LayoutDashboard } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const meetingStatusMeta = {
  proposed: { color: 'bg-blue-600', label: 'Termine vorgeschlagen' },
  confirmed: { color: 'bg-green-600', label: 'Bestätigt' },
  reschedule_requested: { color: 'bg-yellow-600', label: 'Verschiebung beantragt' },
  rescheduled: { color: 'bg-purple-600', label: 'Neue Termine vorgeschlagen' },
  cancelled: { color: 'bg-red-600', label: 'Abgesagt' },
  completed: { color: 'bg-gray-600', label: 'Abgeschlossen' }
};

const getMeetingStatusColor = (status) => meetingStatusMeta[status]?.color || 'bg-gray-600';

const getMeetingStatusText = (status) => meetingStatusMeta[status]?.label || status;

function getMeetingSchedule(meeting) {
  if (!meeting) {
    return null;
  }

  if (meeting.finalStartsAt) {
    return {
      start: new Date(meeting.finalStartsAt),
      end: meeting.finalEndsAt ? new Date(meeting.finalEndsAt) : null,
      tentative: false
    };
  }

  const slots = (meeting.timeSlots || [])
    .map((slot) => ({
      start: new Date(slot.startsAt),
      end: slot.endsAt ? new Date(slot.endsAt) : null,
      selected: slot.selected
    }))
    .filter((slot) => slot.start instanceof Date && !Number.isNaN(slot.start.getTime()));

  if (!slots.length) {
    return null;
  }

  const preferredSlot = slots.find((slot) => slot.selected);
  const slotToUse = preferredSlot || slots.sort((a, b) => a.start - b.start)[0];

  return {
    start: slotToUse.start,
    end: slotToUse.end,
    tentative: true
  };
}

const HRPage = () => {
  const [activeTab, setActiveTab] = useState('applications');
  const [jobs, setJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [unprocessedApplications, setUnprocessedApplications] = useState([]);
  const [archivedApplications, setArchivedApplications] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [overviewApplications, setOverviewApplications] = useState([]);
  const [overviewMeetings, setOverviewMeetings] = useState([]);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showJobModal, setShowJobModal] = useState(false);
  const [showMeetingModal, setShowMeetingModal] = useState(false);
  const [showArchivedApps, setShowArchivedApps] = useState(false);
  const [editingJob, setEditingJob] = useState(null);

  useEffect(() => {
    fetchJobs();
  }, []);

  useEffect(() => {
    if (selectedJob) {
      fetchApplications();
      fetchMeetings();
    }
  }, [selectedJob]);

  useEffect(() => {
    if (activeTab === 'overview') {
      fetchOverviewData();
    }
  }, [activeTab]);

  const fetchJobs = async () => {
    try {
      const response = await api.get('/v2/jobs');
      setJobs(response.data);
      if (response.data.length > 0 && !selectedJob) {
        setSelectedJob(response.data[0]);
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchApplications = async () => {
    if (!selectedJob) return;
    try {
      // Fetch unprocessed applications
      const unprocessedRes = await api.get(`/v2/applications?jobId=${selectedJob.id}&status=unprocessed`);
      setUnprocessedApplications(unprocessedRes.data);
      
      // Fetch active applications (submitted + in_review)
      const activeRes = await api.get(`/v2/applications?jobId=${selectedJob.id}&status=active`);
      setApplications(activeRes.data);
      
      // Fetch archived applications
      const archivedRes = await api.get(`/v2/applications?jobId=${selectedJob.id}&status=archived`);
      setArchivedApplications(archivedRes.data);
    } catch (error) {
      console.error('Error fetching applications:', error);
    }
  };

  const fetchMeetings = async () => {
    if (!selectedJob) return;
    try {
      const response = await api.get(`/v2/meetings?jobId=${selectedJob.id}`);
      setMeetings(response.data);
    } catch (error) {
      console.error('Error fetching meetings:', error);
    }
  };

  const fetchOverviewData = async () => {
    try {
      setOverviewLoading(true);
      const [applicationsRes, meetingsRes] = await Promise.all([
        api.get('/v2/applications?status=active'),
        api.get('/v2/meetings/me')
      ]);
      setOverviewApplications(applicationsRes.data);
      setOverviewMeetings(meetingsRes.data);
    } catch (error) {
      console.error('Error fetching overview data:', error);
    } finally {
      setOverviewLoading(false);
    }
  };

  const handleCreateJob = async (jobData) => {
    try {
      await api.post('/v2/jobs', jobData);
      toast.success('Job erfolgreich erstellt');
      fetchJobs();
      setShowJobModal(false);
      setEditingJob(null);
    } catch (error) {
      console.error('Error creating job:', error);
    }
  };

  const handleUpdateJob = async (jobData) => {
    try {
      await api.patch(`/v2/jobs/${editingJob.id}`, jobData);
      toast.success('Job aktualisiert');
      fetchJobs();
      setShowJobModal(false);
      setEditingJob(null);
    } catch (error) {
      console.error('Error updating job:', error);
    }
  };

  const handleDeleteJob = async (jobId) => {
    if (!window.confirm('Job wirklich löschen?')) return;
    try {
      await api.delete(`/v2/jobs/${jobId}`);
      toast.success('Job gelöscht');
      fetchJobs();
      if (selectedJob?.id === jobId) {
        setSelectedJob(null);
      }
      if (activeTab === 'overview') {
        fetchOverviewData();
      }
    } catch (error) {
      console.error('Error deleting job:', error);
    }
  };

  const handleUpdateApplicationStatus = async (applicationId, status) => {
    try {
      await api.patch(`/v2/applications/${applicationId}`, { status });
      toast.success('Status aktualisiert');
      fetchApplications();
      if (activeTab === 'overview') {
        fetchOverviewData();
      }
    } catch (error) {
      console.error('Error updating application status:', error);
    }
  };

  const handleCreateMeeting = async (meetingData) => {
    try {
      await api.post('/v2/meetings', {
        ...meetingData,
        jobId: selectedJob.id,
      });
      toast.success('Meeting-Terminvorschläge gesendet');
      fetchMeetings();
      setShowMeetingModal(false);
      if (activeTab === 'overview') {
        fetchOverviewData();
      }
    } catch (error) {
      if (error.response?.data?.error === 'applicant_must_be_in_review_status') {
        toast.error('Applicant muss sich im Status "In Prüfung" befinden');
      } else {
        console.error('Error creating meeting:', error);
      }
    }
  };

  const handleLinkedInPublish = async (jobId) => {
    try {
      const response = await api.post(`/v2/linkedin/publish/${jobId}`);
      toast.success(`Job auf LinkedIn veröffentlicht: ${response.data.url}`);
      fetchJobs();
    } catch (error) {
      console.error('Error publishing to LinkedIn:', error);
    }
  };

  const handleLinkedInUnpublish = async (jobId) => {
    try {
      await api.delete(`/v2/linkedin/publish/${jobId}`);
      toast.success('LinkedIn-Veröffentlichung zurückgezogen');
      fetchJobs();
    } catch (error) {
      console.error('Error unpublishing from LinkedIn:', error);
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

  const submittedOverviewCount = overviewApplications.filter((application) => application.status === 'submitted').length;
  const inReviewOverviewCount = overviewApplications.filter((application) => application.status === 'in_review').length;

  const sortedOverviewMeetings = [...overviewMeetings].sort((a, b) => {
    const scheduleA = getMeetingSchedule(a);
    const scheduleB = getMeetingSchedule(b);

    if (!scheduleA?.start && !scheduleB?.start) return 0;
    if (!scheduleA?.start) return 1;
    if (!scheduleB?.start) return -1;

    return scheduleA.start - scheduleB.start;
  });

  const confirmedMeetings = sortedOverviewMeetings.filter((meeting) => meeting.status === 'confirmed');
  const rescheduleMeetings = sortedOverviewMeetings.filter((meeting) => meeting.status === 'reschedule_requested');
  const pendingMeetings = sortedOverviewMeetings.filter((meeting) => ['proposed', 'rescheduled'].includes(meeting.status));

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
      <h1 className="text-3xl font-bold text-white mb-6">HR Bereich</h1>
      
      <div className="mb-6">
        <div className="border-b border-gray-700">
          <nav className="-mb-px flex space-x-8">
            {[ 
              { id: 'overview', label: 'Aktuelles', icon: LayoutDashboard },
              { id: 'applications', label: 'Bewerbungen', icon: Users },
              { id: 'jobs', label: 'Jobs verwalten', icon: Users },
              { id: 'meetings', label: 'Meetings', icon: Calendar },
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

      {/* Job Selection */}
      {activeTab !== 'overview' && (
        <div className="mb-6 flex gap-4 items-center">
          <div className="flex-1">
            <select
              value={selectedJob?.id || ''}
              onChange={(e) => {
                const job = jobs.find(j => j.id === e.target.value);
                setSelectedJob(job || null);
              }}
              className="form-input"
            >
              <option value="">Job auswählen</option>
              {jobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title} {!job.open && '(Geschlossen)'}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => {
              setEditingJob(null);
              setShowJobModal(true);
            }}
            className="btn-primary flex items-center gap-2"
          >
            <Plus size={16} />
            Neuer Job
          </button>
        </div>
      )}

      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="card">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-white">Aktive Bewerbungen</h2>
                  <p className="text-sm text-gray-400">Alle eingegangenen und in Prüfung befindlichen Bewerbungen.</p>
                </div>
                <div className="text-right text-sm text-gray-400">
                  <div>Eingereicht: {submittedOverviewCount}</div>
                  <div>In Prüfung: {inReviewOverviewCount}</div>
                </div>
              </div>
              {overviewLoading ? (
                <p className="text-gray-400">Daten werden geladen...</p>
              ) : overviewApplications.length === 0 ? (
                <p className="text-gray-400">Keine aktiven Bewerbungen vorhanden.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Bewerber</th>
                        <th>Name</th>
                        <th>Job</th>
                        <th>Eingereicht am</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {overviewApplications.map((application) => (
                        <tr key={application.id}>
                          <td>{application.applicant?.email || 'Unbekannt'}</td>
                          <td>{application.applicant?.name || '-'}</td>
                          <td>{application.job?.title || 'Job unbekannt'}</td>
                          <td>{application.createdAt ? new Date(application.createdAt).toLocaleDateString('de-DE') : '-'}</td>
                          <td>{getStatusBadge(application.status)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="card">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-white">Meetings Übersicht</h2>
                  <p className="text-sm text-gray-400">Verfolgen Sie bestätigte Termine, offene Vorschläge und Verschiebungen.</p>
                </div>
                <div className="text-sm text-gray-400">{overviewMeetings.length} Meetings</div>
              </div>
              {overviewLoading ? (
                <p className="text-gray-400">Daten werden geladen...</p>
              ) : (
                <div className="space-y-6">
                  <MeetingStatusList
                    title="Bestätigte Meetings"
                    emptyText="Keine bestätigten Meetings."
                    meetings={confirmedMeetings}
                  />
                  <MeetingStatusList
                    title="Verschiebung beantragt"
                    emptyText="Keine offenen Verschiebungsanfragen."
                    meetings={rescheduleMeetings}
                  />
                  <MeetingStatusList
                    title="Offene Terminvorschläge"
                    emptyText="Keine offenen Vorschläge."
                    meetings={pendingMeetings}
                  />
                </div>
              )}
            </div>
          </div>
          <div className="card">
            <h2 className="text-xl font-semibold text-white mb-4">Kalender (nächste 7 Tage)</h2>
            {overviewLoading ? (
              <p className="text-gray-400">Daten werden geladen...</p>
            ) : (
              <MeetingCalendar meetings={overviewMeetings} />
            )}
            <p className="text-xs text-gray-500 mt-4">
              Geplante und vorgeschlagene Meetings werden chronologisch dargestellt. Verschiebungen und offene Vorschläge bleiben sichtbar.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'applications' && selectedJob && (
        <div className="space-y-6">
          {/* 1. Unprocessed Applications */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle size={20} className="text-yellow-500" />
              <h2 className="text-xl font-semibold text-white">
                Neue Bewerbungen ({unprocessedApplications.length})
              </h2>
            </div>
            {unprocessedApplications.length === 0 ? (
              <p className="text-gray-400">Keine neuen Bewerbungen.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Bewerber</th>
                      <th>Name</th>
                      <th>Eingereicht am</th>
                      <th>Aktionen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unprocessedApplications.map((application) => (
                      <tr key={application.id} className="bg-yellow-900/10">
                        <td>{application.applicant?.email || 'Unbekannt'}</td>
                        <td>{application.applicant?.name || '-'}</td>
                        <td>
                          {new Date(application.createdAt).toLocaleDateString('de-DE')}
                        </td>
                        <td>
                          <button
                            onClick={() => handleUpdateApplicationStatus(application.id, 'in_review')}
                            className="bg-yellow-600 hover:bg-yellow-700 text-white text-xs px-3 py-1 rounded"
                          >
                            In Prüfung nehmen
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 2. Active Applications */}
          <div className="card">
            <h2 className="text-xl font-semibold text-white mb-4">
              Aktive Bewerbungen bearbeiten
            </h2>
            {applications.length === 0 ? (
              <p className="text-gray-400">Keine aktiven Bewerbungen.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Bewerber</th>
                      <th>Name</th>
                      <th>Eingereicht am</th>
                      <th>Status</th>
                      <th>Notiz</th>
                      <th>Aktionen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {applications.map((application) => (
                      <tr key={application.id}>
                        <td>{application.applicant?.email || 'Unbekannt'}</td>
                        <td>{application.applicant?.name || '-'}</td>
                        <td>
                          {new Date(application.createdAt).toLocaleDateString('de-DE')}
                        </td>
                        <td>{getStatusBadge(application.status)}</td>
                        <td className="max-w-xs truncate">
                          {application.applicantNote || '-'}
                        </td>
                        <td>
                          <div className="flex gap-2">
                            <select
                              value={application.status}
                              onChange={(e) => handleUpdateApplicationStatus(application.id, e.target.value)}
                              className="text-xs bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white"
                            >
                              <option value="submitted">Eingereicht</option>
                              <option value="in_review">In Prüfung</option>
                              <option value="accepted">Angenommen</option>
                              <option value="rejected">Abgelehnt</option>
                            </select>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 3. Archived Applications (Collapsible) */}
          <div className="card">
            <button
              onClick={() => setShowArchivedApps(!showArchivedApps)}
              className="flex items-center justify-between w-full text-left"
            >
              <h2 className="text-xl font-semibold text-white">
                Archivierte Bewerbungen ({archivedApplications.length})
              </h2>
              {showArchivedApps ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
            
            {showArchivedApps && (
              <div className="mt-4">
                {archivedApplications.length === 0 ? (
                  <p className="text-gray-400">Keine archivierten Bewerbungen.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Bewerber</th>
                          <th>Name</th>
                          <th>Eingereicht am</th>
                          <th>Status</th>
                          <th>Notiz</th>
                        </tr>
                      </thead>
                      <tbody>
                        {archivedApplications.map((application) => (
                          <tr key={application.id} className="opacity-75">
                            <td>{application.applicant?.email || 'Unbekannt'}</td>
                            <td>{application.applicant?.name || '-'}</td>
                            <td>
                              {new Date(application.createdAt).toLocaleDateString('de-DE')}
                            </td>
                            <td>{getStatusBadge(application.status)}</td>
                            <td className="max-w-xs truncate">
                              {application.applicantNote || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'jobs' && selectedJob && (
        <div className="card">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-semibold text-white mb-2">{selectedJob.title}</h2>
              <p className="text-gray-400 mb-2">{selectedJob.description}</p>
              <div className="flex gap-2 items-center">
                <span className={`text-xs px-2 py-1 rounded ${selectedJob.open ? 'bg-green-600' : 'bg-red-600'} text-white`}>
                  {selectedJob.open ? 'Offen' : 'Geschlossen'}
                </span>
                {selectedJob.linkedinPostId && (
                  <span className="text-xs px-2 py-1 rounded bg-blue-600 text-white">
                    LinkedIn veröffentlicht
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setEditingJob(selectedJob);
                  setShowJobModal(true);
                }}
                className="btn-secondary flex items-center gap-2"
              >
                <Edit2 size={16} />
                Bearbeiten
              </button>
              <button
                onClick={() => handleDeleteJob(selectedJob.id)}
                className="btn-danger flex items-center gap-2"
              >
                <Trash2 size={16} />
                Löschen
              </button>
            </div>
          </div>

          <div className="flex gap-2">
            {selectedJob.linkedinPostId ? (
              <button
                onClick={() => handleLinkedInUnpublish(selectedJob.id)}
                className="btn-secondary"
              >
                LinkedIn-Veröffentlichung zurückziehen
              </button>
            ) : (
              <button
                onClick={() => handleLinkedInPublish(selectedJob.id)}
                className="btn-primary"
              >
                Auf LinkedIn veröffentlichen
              </button>
            )}
          </div>
        </div>
      )}

      {activeTab === 'meetings' && selectedJob && (
        <div className="card">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-white">
              Meetings für "{selectedJob.title}"
            </h2>
            <button
              onClick={() => setShowMeetingModal(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={16} />
              Meeting-Termine vorschlagen
            </button>
          </div>

          {meetings.length === 0 ? (
            <p className="text-gray-400">Noch keine Meetings geplant.</p>
          ) : (
            <div className="space-y-4">
              {meetings.map((meeting) => (
                <MeetingCard key={meeting.id} meeting={meeting} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Job Modal */}
      {showJobModal && (
        <JobModal
          job={editingJob}
          onClose={() => {
            setShowJobModal(false);
            setEditingJob(null);
          }}
          onSave={editingJob ? handleUpdateJob : handleCreateJob}
        />
      )}

      {/* Meeting Modal */}
      {showMeetingModal && (
        <MeetingModal
          onClose={() => setShowMeetingModal(false)}
          onSave={handleCreateMeeting}
        />
      )}
    </div>
  );
};

const MeetingStatusList = ({ title, meetings = [], emptyText }) => (
  <div>
    <h3 className="text-sm font-semibold text-white mb-3">{title}</h3>
    {meetings.length === 0 ? (
      <p className="text-sm text-gray-400">{emptyText}</p>
    ) : (
      <div className="space-y-3">
        {meetings.map((meeting) => {
          const schedule = getMeetingSchedule(meeting);
          const applicantName = meeting.applicant?.name || meeting.applicant?.email || 'Unbekannt';
          const jobTitle = meeting.job?.title || 'Job unbekannt';

          return (
            <div key={meeting.id} className="bg-gray-700/60 border border-gray-600/60 rounded-lg p-3">
              <div className="flex justify-between items-start gap-3">
                <div>
                  <p className="text-sm font-medium text-white">{applicantName}</p>
                  <p className="text-xs text-gray-400">{jobTitle}</p>
                </div>
                <span className={`${getMeetingStatusColor(meeting.status)} text-white text-[10px] px-2 py-0.5 rounded whitespace-nowrap`}>
                  {getMeetingStatusText(meeting.status)}
                </span>
              </div>

              {schedule?.start ? (
                <div className="mt-2 text-xs text-gray-300 space-y-1">
                  <div>{schedule.start.toLocaleDateString('de-DE')}</div>
                  <div className="flex items-center gap-1 text-gray-400">
                    <Clock size={12} />
                    <span>
                      {schedule.start.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                      {schedule.end ? ` - ${schedule.end.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}` : ''}
                      {schedule.tentative ? ' · Vorschlag' : ''}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="mt-2 text-xs text-gray-400">Keine Terminzeiten hinterlegt.</p>
              )}

              {meeting.rescheduleReason && (
                <p className="mt-2 text-xs text-yellow-400">Grund: {meeting.rescheduleReason}</p>
              )}
            </div>
          );
        })}
      </div>
    )}
  </div>
);

const MeetingCalendar = ({ meetings = [] }) => {
  const days = React.useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    return Array.from({ length: 7 }, (_, index) => {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      return day;
    });
  }, []);

  const eventsByDay = React.useMemo(() => {
    const map = {};

    meetings.forEach((meeting) => {
      const schedule = getMeetingSchedule(meeting);
      if (!schedule?.start) {
        return;
      }

      const day = new Date(schedule.start);
      day.setHours(0, 0, 0, 0);
      const key = day.toISOString().split('T')[0];

      if (!map[key]) {
        map[key] = [];
      }

      map[key].push({ ...meeting, schedule });
    });

    Object.keys(map).forEach((key) => {
      map[key].sort((a, b) => {
        if (!a.schedule?.start || !b.schedule?.start) return 0;
        return a.schedule.start - b.schedule.start;
      });
    });

    return map;
  }, [meetings]);

  return (
    <div className="bg-gray-900/40 border border-gray-700 rounded-lg p-4">
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4 md:gap-2">
        {days.map((day) => {
          const key = day.toISOString().split('T')[0];
          const dayMeetings = eventsByDay[key] || [];

          return (
            <div key={key} className="bg-gray-800/70 border border-gray-700 rounded-lg p-3 flex flex-col gap-2 min-h-[150px]">
              <div>
                <p className="text-sm font-semibold text-white">
                  {day.toLocaleDateString('de-DE', { weekday: 'short' })}
                </p>
                <p className="text-xs text-gray-400">{day.toLocaleDateString('de-DE')}</p>
              </div>
              <div className="space-y-2 flex-1">
                {dayMeetings.length === 0 ? (
                  <p className="text-xs text-gray-500">Keine Termine</p>
                ) : (
                  dayMeetings.map((meeting) => {
                    const applicantName = meeting.applicant?.name || meeting.applicant?.email || 'Unbekannt';
                    const jobTitle = meeting.job?.title || 'Job unbekannt';
                    const schedule = meeting.schedule;

                    const timeLabel = schedule?.start
                      ? `${schedule.start.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}${schedule.end ? ` - ${schedule.end.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}` : ''}`
                      : 'Zeit offen';

                    return (
                      <div key={meeting.id} className="bg-gray-900/70 border border-gray-700 rounded p-2">
                        <p className="text-xs font-medium text-white truncate">{applicantName}</p>
                        <p className="text-[11px] text-gray-400 truncate">{jobTitle}</p>
                        <p className="text-[11px] text-gray-300 mt-1">
                          {timeLabel}
                          {schedule?.tentative ? ' · Vorschlag' : ''}
                        </p>
                        <span className={`${getMeetingStatusColor(meeting.status)} text-white text-[10px] px-2 py-0.5 rounded inline-block mt-2`}>
                          {getMeetingStatusText(meeting.status)}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Meeting Card Component
const MeetingCard = ({ meeting }) => {
  return (
    <div className="bg-gray-700 rounded-lg p-4">
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-white font-medium">
              {meeting.applicant?.email || 'Unbekannt'}
            </span>
            <span className={`${getMeetingStatusColor(meeting.status)} text-white text-xs px-2 py-1 rounded`}>
              {getMeetingStatusText(meeting.status)}
            </span>
          </div>

          {meeting.finalStartsAt ? (
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
          ) : (
            <div className="text-sm text-gray-400">
              {meeting.timeSlots?.length || 0} Terminvorschläge
            </div>
          )}
          
          {meeting.rescheduleReason && (
            <div className="text-sm text-yellow-400 mt-2">
              Grund: {meeting.rescheduleReason}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Job Modal Component
const JobModal = ({ job, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    title: job?.title || '',
    description: job?.description || '',
    open: job?.open ?? true,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg max-w-md w-full p-6">
        <h3 className="text-xl font-semibold text-white mb-4">
          {job ? 'Job bearbeiten' : 'Neuer Job'}
        </h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="form-label">Titel *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="form-input"
              required
            />
          </div>

          <div>
            <label className="form-label">Beschreibung</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="form-input"
              rows={4}
            />
          </div>

          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.open}
                onChange={(e) => setFormData({ ...formData, open: e.target.checked })}
                className="mr-2"
              />
              <span className="text-gray-300">Job ist offen für Bewerbungen</span>
            </label>
          </div>

          <div className="flex gap-3">
            <button type="submit" className="flex-1 btn-primary">
              {job ? 'Aktualisieren' : 'Erstellen'}
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

// Enhanced Meeting Modal Component
const MeetingModal = ({ onClose, onSave }) => {
  const [formData, setFormData] = useState({
    applicantEmail: '',
    timeSlots: [
      { startsAt: '', endsAt: '' }
    ],
    mode: 'online',
    location: '',
  });

  const addTimeSlot = () => {
    setFormData({
      ...formData,
      timeSlots: [...formData.timeSlots, { startsAt: '', endsAt: '' }]
    });
  };

  const removeTimeSlot = (index) => {
    setFormData({
      ...formData,
      timeSlots: formData.timeSlots.filter((_, i) => i !== index)
    });
  };

  const updateTimeSlot = (index, field, value) => {
    const newSlots = [...formData.timeSlots];
    newSlots[index][field] = value;
    setFormData({ ...formData, timeSlots: newSlots });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.applicantEmail) {
      toast.error('Bewerber E-Mail ist erforderlich');
      return;
    }
    if (formData.timeSlots.some(slot => !slot.startsAt || !slot.endsAt)) {
      toast.error('Alle Zeitslots müssen ausgefüllt werden');
      return;
    }
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-semibold text-white mb-4">Meeting-Termine vorschlagen</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="form-label">Bewerber E-Mail *</label>
            <input
              type="email"
              value={formData.applicantEmail}
              onChange={(e) => setFormData({ ...formData, applicantEmail: e.target.value })}
              className="form-input"
              required
            />
            <p className="text-sm text-gray-400 mt-1">
              Bewerber muss sich im Status "In Prüfung" befinden
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="form-label mb-0">Terminvorschläge *</label>
              <button
                type="button"
                onClick={addTimeSlot}
                className="text-blue-400 hover:text-blue-300 text-sm"
              >
                + Zeitslot hinzufügen
              </button>
            </div>
            
            {formData.timeSlots.map((slot, index) => (
              <div key={index} className="bg-gray-700 rounded p-3 mb-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-300">Zeitslot {index + 1}</span>
                  {formData.timeSlots.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeTimeSlot(index)}
                      className="text-red-400 hover:text-red-300 text-sm"
                    >
                      Entfernen
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Start</label>
                    <input
                      type="datetime-local"
                      value={slot.startsAt}
                      onChange={(e) => updateTimeSlot(index, 'startsAt', e.target.value)}
                      className="form-input text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Ende</label>
                    <input
                      type="datetime-local"
                      value={slot.endsAt}
                      onChange={(e) => updateTimeSlot(index, 'endsAt', e.target.value)}
                      className="form-input text-sm"
                      required
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div>
            <label className="form-label">Modus</label>
            <select
              value={formData.mode}
              onChange={(e) => setFormData({ ...formData, mode: e.target.value })}
              className="form-input"
            >
              <option value="online">Online</option>
              <option value="onsite">Vor Ort</option>
              <option value="phone">Telefon</option>
            </select>
          </div>

          <div>
            <label className="form-label">Ort/Link</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="form-input"
              placeholder="z.B. Zoom-Link oder Adresse"
            />
          </div>

          <div className="flex gap-3">
            <button type="submit" className="flex-1 btn-primary">
              Termine vorschlagen
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

export default HRPage;
