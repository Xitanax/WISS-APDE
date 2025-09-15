import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import toast from 'react-hot-toast';

const loginSchema = yup.object({
  email: yup.string().email('Ungültige E-Mail').required('E-Mail ist erforderlich'),
  password: yup.string().min(6, 'Mindestens 6 Zeichen').required('Passwort ist erforderlich'),
});

const LoginPage = () => {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLoading, setIsLoading] = useState(false);

  const from = location.state?.from?.pathname || '/jobs';

  useEffect(() => {
    if (user) {
      navigate(from, { replace: true });
    }
  }, [user, navigate, from]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(loginSchema),
  });

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      await login(data.email, data.password);
      toast.success('Erfolgreich angemeldet!');
      navigate(from, { replace: true });
    } catch (error) {
      // Error is handled by API interceptor
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-white mb-2">🍫 Chocadies</h1>
          <h2 className="text-2xl font-bold text-white">Anmelden</h2>
          <p className="mt-2 text-gray-400">
            Willkommen bei der süßesten Manufaktur der Welt
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="form-label">
                E-Mail
              </label>
              <input
                {...register('email')}
                type="email"
                className="form-input"
                placeholder="ihre@email.de"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>
            <div>
              <label htmlFor="password" className="form-label">
                Passwort
              </label>
              <input
                {...register('password')}
                type="password"
                className="form-input"
                placeholder="••••••••"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-500">{errors.password.message}</p>
              )}
            </div>
          </div>
          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full btn-primary"
            >
              {isLoading ? 'Anmelden...' : 'Anmelden'}
            </button>
          </div>
          <div className="text-center space-y-2">
            <p className="text-gray-400">
              Demo-Zugänge für die Bewertung:
            </p>
            <div className="text-sm space-y-1">
              <p className="text-gray-300">
                <strong>Admin:</strong> admin@chocadies.ch / secret123
              </p>
              <p className="text-gray-300">
                <strong>HR:</strong> hr@chocadies.ch / secret123
              </p>
              <p className="text-gray-300">
                <strong>Bewerber:</strong> bewerber@chocadies.ch / secret123
              </p>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
