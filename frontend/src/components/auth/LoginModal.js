import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import toast from 'react-hot-toast';

const loginSchema = yup.object({
  email: yup.string().email('Ungültige E-Mail').required('E-Mail ist erforderlich'),
  password: yup.string().min(6, 'Mindestens 6 Zeichen').required('Passwort ist erforderlich'),
});

const registerSchema = yup.object({
  email: yup.string().email('Ungültige E-Mail').required('E-Mail ist erforderlich'),
  password: yup.string().min(6, 'Mindestens 6 Zeichen').required('Passwort ist erforderlich'),
  name: yup.string(),
  birthdate: yup.date(),
  address: yup.string(),
});

const LoginModal = ({ isOpen, onClose, onSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const { login, register, checkAuth } = useAuth();

  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: yupResolver(isLogin ? loginSchema : registerSchema),
  });

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      if (isLogin) {
        await login(data.email, data.password);
        toast.success('Erfolgreich angemeldet!');
        onSuccess();
        onClose();
      } else {
        await register(data);
        toast.success('Erfolgreich registriert! Sie können sich jetzt anmelden.');
        setIsLogin(true);
        reset();
        return;
      }
    } catch (error) {
      console.error('Auth error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    reset();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-lg max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-white">
            {isLogin ? 'Anmelden' : 'Registrieren'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="form-label">E-Mail</label>
            <input
              {...registerField('email')}
              type="email"
              className="form-input"
              placeholder="ihre@email.de"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="form-label">Passwort</label>
            <input
              {...registerField('password')}
              type="password"
              className="form-input"
              placeholder="••••••••"
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-500">{errors.password.message}</p>
            )}
          </div>

          {!isLogin && (
            <>
              <div>
                <label className="form-label">Name (optional)</label>
                <input
                  {...registerField('name')}
                  type="text"
                  className="form-input"
                  placeholder="Ihr Name"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="form-label">Geburtsdatum (optional)</label>
                <input
                  {...registerField('birthdate')}
                  type="date"
                  className="form-input"
                />
                {errors.birthdate && (
                  <p className="mt-1 text-sm text-red-500">{errors.birthdate.message}</p>
                )}
              </div>

              <div>
                <label className="form-label">Adresse (optional)</label>
                <textarea
                  {...registerField('address')}
                  className="form-input"
                  rows={2}
                  placeholder="Ihre Adresse"
                />
                {errors.address && (
                  <p className="mt-1 text-sm text-red-500">{errors.address.message}</p>
                )}
              </div>
            </>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 btn-primary"
            >
              {isLoading ? 'Lädt...' : (isLogin ? 'Anmelden' : 'Registrieren')}
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

        {/* WICHTIG: Dieser Toggle-Button muss sichtbar sein */}
        <div className="mt-4 text-center border-t border-gray-700 pt-4">
          <button
            onClick={toggleMode}
            className="text-blue-400 hover:text-blue-300 font-medium"
          >
            {isLogin 
              ? '🆕 Noch kein Konto? Hier registrieren' 
              : '🔐 Bereits registriert? Hier anmelden'
            }
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
