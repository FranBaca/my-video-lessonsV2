'use client';

import React from 'react';
import toast from 'react-hot-toast';

export const showNotification = {
  success: (message: string) => {
    toast.success(message, {
      duration: 5000,
    });
  },

  error: (message: string) => {
    toast.error(message, {
      duration: 6000,
    });
  },

  info: (message: string) => {
    toast(message, {
      duration: 4000,
      icon: 'ℹ️',
    });
  },

  warning: (message: string) => {
    toast(message, {
      duration: 5000,
      icon: '⚠️',
      style: {
        background: '#F59E0B',
        color: '#fff',
      },
    });
  },
};

export const showConfirmation = (message: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const handleConfirm = () => {
      toast.dismiss(toastId);
      resolve(true);
    };

    const handleCancel = () => {
      toast.dismiss(toastId);
      resolve(false);
    };

    const toastId = toast.custom(
      (t) => (
        <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-white shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}>
          <div className="flex-1 w-0 p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {message}
                </p>
              </div>
            </div>
            <div className="mt-4 flex space-x-2">
              <button
                onClick={handleConfirm}
                className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700 transition-colors"
              >
                Confirmar
              </button>
              <button
                onClick={handleCancel}
                className="bg-gray-300 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-400 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ),
      {
        duration: Infinity,
      }
    );
  });
}; 