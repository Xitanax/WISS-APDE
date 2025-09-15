import React, { useState, useEffect } from 'react';
import { X, Upload } from 'lucide-react';
import api from '../../services/api';
import toast from 'react-hot-toast';

const ApplyModal = ({ job, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [cvs, setCvs] = useState([]);
  const [formData, setFormData] = useState({
    note: '',
    selectedCvId: '',
    newCvFile: null,
  });

  useEffect(() => {
    fetchCvs();
  }, []);

  const fetchCvs = async () => {
    try {
      const response = await api.get('/v2/cv/me');
      setCvs(response.data);
    } catch (error) {
      console.error('Error fetching CVs:', error);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setFormData({ ...formData, newCvFile: file, selectedCvId: '' });
    } else {
      toast.error('Bitte wählen Sie eine PDF-Datei');
      e.target.value = '';
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.selectedCvId && !formData.newCvFile) {
      toast.error('Bitte wählen Sie ein CV aus oder laden Sie eines hoch');
      return;
    }

    setLoading(true);

    try {
      // Upload new CV if provided
      if (formData.newCvFile) {
        const cvFormData = new FormData();
        cvFormData.append('file', formData.newCvFile);
        await api.post('/v2/cv', cvFormData);
      }

      // Submit application
      await api.post('/v2/applications', {
        jobId: job.id,
        note: formData.note,
      });

      toast.success('Bewerbung erfolgreich eingereicht!');
      onSuccess();
    } catch (error) {
      console.error('Error submitting application:', error);
      if (error.response?.status === 409) {
        toast.error('Sie haben sich bereits für diese Stelle beworben');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white">Bewerbung für {job.title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="form-label">Anschreiben / Notiz</label>
            <textarea
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              className="form-input"
              rows={4}
              placeholder="Warum sind Sie der richtige Kandidat für diese Position?"
            />
          </div>

          <div>
            <label className="form-label">Lebenslauf</label>

            {cvs.length > 0 && (
              <div className="mb-4">
                <p className="text-sm text-gray-400 mb-2">Vorhandene Lebensläufe:</p>
                <div className="space-y-2">
                  {cvs.map((cv) => (
                    <label key={cv.id} className="flex items-center">
                      <input
                        type="radio"
                        name="cv"
                        value={cv.id}
                        checked={formData.selectedCvId === cv.id}
                        onChange={(e) => setFormData({ 
                          ...formData, 
                          selectedCvId: e.target.value, 
                          newCvFile: null 
                        })}
                        className="mr-2"
                      />
                      <span className="text-gray-300">{cv.originalName}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="border-2 border-dashed border-gray-600 rounded-lg p-4 text-center">
              <Upload className="mx-auto text-gray-400 mb-2" size={32} />
              <p className="text-sm text-gray-400 mb-2">
                {cvs.length > 0 ? 'Oder neuen Lebenslauf hochladen' : 'Lebenslauf hochladen'}
              </p>
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="hidden"
                id="cv-upload"
              />
              <label
                htmlFor="cv-upload"
                className="cursor-pointer bg-gray-700 hover:bg-gray-600 text-white text-sm py-2 px-4 rounded transition-colors"
              >
                PDF auswählen
              </label>
              {formData.newCvFile && (
                <p className="text-sm text-green-400 mt-2">{formData.newCvFile.name}</p>
              )}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 btn-primary"
            >
              {loading ? 'Wird gesendet...' : 'Bewerbung absenden'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 btn-secondary"
            >
              Abbrechen
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ApplyModal;
