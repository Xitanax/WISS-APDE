import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import toast from 'react-hot-toast'; // <- DIESER IMPORT FEHLTE
import JobCard from '../components/jobs/JobCard';
import ApplyModal from '../components/jobs/ApplyModal';
import LoginModal from '../components/auth/LoginModal';

const JobsPage = () => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState(null);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const response = await api.get('/public/jobs');
      setJobs(response.data);
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = (job) => {
    if (!user) {
      setSelectedJob(job);
      setShowLoginModal(true);
      return;
    }
    
    if (user.role !== 'applicant') {
      toast.error('Nur Bewerber können sich bewerben');
      return;
    }
    
    setSelectedJob(job);
    setShowApplyModal(true);
  };

  const handleLoginSuccess = () => {
    setShowLoginModal(false);
    if (selectedJob) {
      setShowApplyModal(true);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Jobs werden geladen...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Offene Stellen</h1>
        <p className="text-gray-400">
          Finde deinen Platz in der süßesten Manufaktur der Welt.
        </p>
      </div>
      
      {jobs.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 text-lg">Aktuell sind keine Stellen ausgeschrieben.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {jobs.map((job) => (
            <JobCard 
              key={job.id} 
              job={job} 
              onApply={() => handleApply(job)}
              user={user}
            />
          ))}
        </div>
      )}

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => {
          setShowLoginModal(false);
          setSelectedJob(null);
        }}
        onSuccess={handleLoginSuccess}
      />

      {showApplyModal && selectedJob && (
        <ApplyModal
          job={selectedJob}
          onClose={() => {
            setShowApplyModal(false);
            setSelectedJob(null);
          }}
          onSuccess={() => {
            setShowApplyModal(false);
            setSelectedJob(null);
          }}
        />
      )}
    </div>
  );
};

export default JobsPage;
