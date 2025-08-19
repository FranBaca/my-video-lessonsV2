'use client';

import { useState } from 'react';
import { useSession } from '../providers/SessionProvider';
import { validateEmail, validatePassword, getFirebaseErrorMessage } from '../lib/auth-utils-client';

interface ProfessorLoginProps {
  onSwitchToStudent: () => void;
}

export default function ProfessorLogin({ onSwitchToStudent }: ProfessorLoginProps) {
  const { loginProfessor } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [touched, setTouched] = useState({ email: false, password: false });

  const handleInputChange = (field: 'email' | 'password', value: string) => {
    if (field === 'email') {
      setEmail(value);
    } else {
      setPassword(value);
    }
    
    // Clear error when user starts typing
    if (error) {
      setError('');
    }
  };

  const handleBlur = (field: 'email' | 'password') => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validate inputs using utility functions
      const emailValidation = validateEmail(email);
      const passwordValidation = validatePassword(password);

      if (!emailValidation.isValid) {
        throw new Error(emailValidation.message);
      }

      if (!passwordValidation.isValid) {
        throw new Error(passwordValidation.message);
      }

      await loginProfessor(email.trim(), password);
      // The SessionProvider will handle the state update automatically
    } catch (error: any) {
      // Enhanced error messages using utility function
      let errorMessage = error.message || 'Error al iniciar sesión';
      
      if (error.code) {
        errorMessage = getFirebaseErrorMessage(error.code, errorMessage);
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const emailValidation = validateEmail(email);
  const passwordValidation = validatePassword(password);
  const showEmailError = touched.email && !emailValidation.isValid;
  const showPasswordError = touched.password && !passwordValidation.isValid;
  const isFormValid = emailValidation.isValid && passwordValidation.isValid;

  return (
    <div className="w-full">
      <div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
          Acceso para Profesores
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600">
          Gestiona tus clases y estudiantes
        </p>
      </div>
      
      <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className={`appearance-none relative block w-full px-3 py-2 border rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors ${
                showEmailError 
                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                  : 'border-gray-300'
              }`}
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              onBlur={() => handleBlur('email')}
              disabled={loading}
            />
            {showEmailError && (
              <p className="mt-1 text-sm text-red-600">
                {emailValidation.message}
              </p>
            )}
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className={`appearance-none relative block w-full px-3 py-2 border rounded-md placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-colors ${
                showPasswordError 
                  ? 'border-red-300 focus:ring-red-500 focus:border-red-500' 
                  : 'border-gray-300'
              }`}
              placeholder="Tu contraseña"
              value={password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              onBlur={() => handleBlur('password')}
              disabled={loading}
            />
            {showPasswordError && (
              <p className="mt-1 text-sm text-red-600">
                {passwordValidation.message}
              </p>
            )}
          </div>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 border border-red-200 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        <div>
          <button
            type="submit"
            disabled={loading || !isFormValid}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Iniciando sesión...
              </div>
            ) : (
              'Iniciar Sesión'
            )}
          </button>
        </div>

        <div className="text-center">
          <button
            type="button"
            onClick={onSwitchToStudent}
            className="text-sm text-blue-600 hover:text-blue-500 transition-colors"
          >
            ¿Eres estudiante? Accede aquí
          </button>
        </div>
      </form>
    </div>
  );
} 