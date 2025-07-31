import React from 'react';

interface VideoStatusBadgeProps {
  status?: 'ready' | 'processing' | 'errored';
  errorMessage?: string;
}

export default function VideoStatusBadge({ status, errorMessage }: VideoStatusBadgeProps) {
  if (!status) return null;

  const getStatusConfig = () => {
    switch (status) {
      case 'ready':
        return {
          text: 'Listo',
          className: 'bg-green-100 text-green-800 border-green-200',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )
        };
      case 'processing':
        return {
          text: 'Procesando',
          className: 'bg-blue-100 text-blue-800 border-blue-200',
          icon: (
            <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          )
        };
      case 'errored':
        return {
          text: 'Error',
          className: 'bg-red-100 text-red-800 border-red-200',
          icon: (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          )
        };
      default:
        return {
          text: 'Desconocido',
          className: 'bg-gray-100 text-gray-800 border-gray-200',
          icon: null
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className="flex items-center space-x-1">
      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${config.className}`}>
        {config.icon && <span className="mr-1">{config.icon}</span>}
        {config.text}
      </span>
      {status === 'errored' && errorMessage && (
        <span className="text-xs text-red-600 ml-2" title={errorMessage}>
          ⚠️
        </span>
      )}
    </div>
  );
} 