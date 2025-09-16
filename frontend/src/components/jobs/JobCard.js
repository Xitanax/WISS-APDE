import React from 'react';
import { Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';

const JobCard = ({ job, onViewDetails }) => {
  const isNew = () => {
    if (!job.createdAt) return false;
    const jobDate = new Date(job.createdAt);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return jobDate > weekAgo;
  };

  return (
    <div className="card hover:border-gray-600 transition-colors">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-semibold text-white">{job.title}</h3>
        <div className="flex gap-2">
          {isNew() && (
            <span className="bg-blue-600 text-white text-xs px-2 py-1 rounded">NEU</span>
          )}
          {job.linkedinPostId && (
            <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded">LinkedIn</span>
          )}
        </div>
      </div>

      <p className="text-gray-400 mb-4 line-clamp-3">
        {job.shortDescription || job.description}
      </p>

      {job.createdAt && (
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
          <Calendar size={16} />
          <span>
            Vor {formatDistanceToNow(new Date(job.createdAt), { locale: de })}
          </span>
        </div>
      )}

      <button
        onClick={onViewDetails}
        className="w-full py-2 px-4 rounded transition-colors bg-blue-600 hover:bg-blue-700 text-white"
      >
        Details ansehen
      </button>
    </div>
  );
};

export default JobCard;
