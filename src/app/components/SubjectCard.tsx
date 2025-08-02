'use client';

import { Subject } from '../types/firebase';

interface SubjectCardProps {
  subject: Subject;
  videoCount: number;
  onEdit?: () => void;
  onDelete?: () => void;
  onClick?: () => void;
}

export default function SubjectCard({ 
  subject, 
  videoCount, 
  onEdit, 
  onDelete, 
  onClick 
}: SubjectCardProps) {
  return (
    <div 
      className={`bg-white rounded-lg shadow p-4 border-l-4 hover:shadow-md transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:scale-105' : ''
      }`}
      style={{ borderLeftColor: subject.color }}
      onClick={onClick}
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: subject.color }}
            />
            <h3 className="font-medium text-gray-900">{subject.name}</h3>
          </div>
          <p className="text-sm text-gray-600 mt-1">{subject.description}</p>
          <p className="text-xs text-gray-500 mt-2">
            {videoCount} video{videoCount !== 1 ? 's' : ''}
          </p>
        </div>
        
        {(onEdit || onDelete) && (
          <div className="flex space-x-1">
            {onEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="text-gray-400 hover:text-gray-600 p-1 transition-colors"
                title="Editar materia"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            )}
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete();
                }}
                className="text-red-400 hover:text-red-600 p-1 transition-colors"
                title="Eliminar materia"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
} 