import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import ApplyModal from '../components/jobs/ApplyModal';
import LoginModal from '../components/auth/LoginModal';
import formatRichText from '../utils/richText';

const JobDetailsPage = () => {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadJob = async () => {
      setLoading(true);
      try {
        const response = await api.get(`/public/jobs/${jobId}`);
        if (isMounted) {
          setJob(response.data);
        }
      } catch (error) {
        if (error.response?.status === 404) {
          toast.error('Job nicht gefunden');
          navigate('/jobs');
        } else if (error.response?.status === 400) {
          toast.error('Ungültige Job-ID');
          navigate('/jobs');
        } else {
          console.error('Error fetching job details:', error);
          toast.error('Jobdetails konnten nicht geladen werden');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadJob();

    return () => {
      isMounted = false;
    };
  }, [jobId, navigate]);

  const handleApplyClick = () => {
    if (!job) return;

    if (!job.open) {
      toast.error('Bewerbungen für diese Stelle sind geschlossen');
      return;
    }

    if (!user) {
      setShowLoginModal(true);
      return;
    }

    if (user.role !== 'applicant') {
      toast.error('Nur Bewerber können sich bewerben');
      return;
    }

    setShowApplyModal(true);
  };

  const handleLoginSuccess = () => {
    setShowLoginModal(false);
    setShowApplyModal(true);
  };

  const formattedDescription = useMemo(() => formatRichText(job?.description || ''), [job?.description]);
  const applyButtonLabel = useMemo(() => {
    if (!job?.open) {
      return 'Bewerbungen geschlossen';
    }
    return user ? 'Jetzt bewerben' : 'Zum Bewerben einloggen';
  }, [job?.open, user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Jobdetails werden geladen...</p>
        </div>
      </div>
    );
  }

  if (!job) {
    return null;
  }

  return (
    <div className="px-4 py-6">
      <div className="mb-6">
        <button
          onClick={() => navigate('/jobs')}
          className="flex items-center gap-2 text-gray-300 hover:text-white"
        >
          <ArrowLeft size={18} />
          Zurück zu den Jobs
        </button>
      </div>

      <div className="card max-w-4xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">{job.title}</h1>
            <p className="text-gray-300">
              {job.shortDescription || 'Keine Kurzbeschreibung verfügbar.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2 py-1 rounded ${job.open ? 'bg-green-600' : 'bg-red-600'} text-white`}>
              {job.open ? 'Offen' : 'Geschlossen'}
            </span>
            {job.linkedinPostId && (
              <span className="text-xs px-2 py-1 rounded bg-blue-500 text-white">LinkedIn</span>
            )}
          </div>
        </div>

        {job.createdAt && (
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
            <Calendar size={16} />
            <span>Vor {formatDistanceToNow(new Date(job.createdAt), { locale: de })}</span>
          </div>
        )}

        {formattedDescription ? (
          <div className="rich-text-content mb-6" dangerouslySetInnerHTML={{ __html: formattedDescription }} />
        ) : (
          <p className="text-gray-400 mb-6">
            Für diese Stelle liegt noch keine ausführliche Beschreibung vor.
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={handleApplyClick}
            className="flex-1 btn-primary"
            disabled={!job.open}
          >
            {applyButtonLabel}
          </button>
        </div>
      </div>

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={handleLoginSuccess}
      />

      {showApplyModal && (
        <ApplyModal
          job={job}
          onClose={() => setShowApplyModal(false)}
          onSuccess={() => setShowApplyModal(false)}
        />
      )}
    </div>
  );
};

export default JobDetailsPage;
