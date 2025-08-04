'use client';

import { useState } from 'react';
import { Student, Subject } from '../types/firebase';

interface EditStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (studentId: string, subjectsToAdd: string[]) => Promise<void>;
  student: Student | null;
  subjects: Subject[];
  loading?: boolean;
}

export default function EditStudentModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  student, 
  subjects,
  loading = false 
}: EditStudentModalProps) {
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);

  // Reset selected subjects when modal opens
  const handleOpen = () => {
    setSelectedSubjects([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!student || selectedSubjects.length === 0) return;

    try {
      await onSubmit(student.id!, selectedSubjects);
      setSelectedSubjects([]);
      onClose();
    } catch (error) {
      // Error handling is done in the parent component
      console.error('Error updating student:', error);
    }
  };

  const handleToggleSubjectSelection = (subjectId: string) => {
    setSelectedSubjects(prev => 
      prev.includes(subjectId) 
        ? prev.filter(id => id !== subjectId)
        : [...prev, subjectId]
    );
  };

  // Get available subjects (not already assigned to student)
  const availableSubjects = subjects.filter(subject => 
    !student?.allowedSubjects?.includes(subject.id!)
  );

  if (!isOpen || !student) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-900">
              Editar Estudiante
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Student Info */}
          <div className="mb-4 p-3 bg-gray-50 rounded-md">
            <div className="text-sm text-gray-600">Estudiante</div>
            <div className="font-medium text-gray-900">{student.name}</div>
            <div className="text-sm text-gray-500">Código: {student.code}</div>
            {student.email && (
              <div className="text-sm text-gray-500">Email: {student.email}</div>
            )}
          </div>

          {/* Current Subjects */}
          {student.allowedSubjects && student.allowedSubjects.length > 0 && (
            <div className="mb-4">
              <div className="text-sm font-medium text-gray-700 mb-2">
                Materias actuales:
              </div>
              <div className="flex flex-wrap gap-1">
                {student.allowedSubjects.map((subjectId) => {
                  const subject = subjects.find(s => s.id === subjectId);
                  return (
                    <span
                      key={subjectId}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      {subject?.name || subjectId}
                    </span>
                  );
                })}
              </div>
            </div>
          )}

          {/* Available Subjects */}
          {availableSubjects.length > 0 ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Agregar materias:
                </label>
                <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-md p-2">
                  {availableSubjects.map((subject) => (
                    <label key={subject.id} className="flex items-center space-x-2 py-1">
                      <input
                        type="checkbox"
                        checked={selectedSubjects.includes(subject.id!)}
                        onChange={() => handleToggleSubjectSelection(subject.id!)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{subject.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || selectedSubjects.length === 0}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md"
                >
                  {loading ? 'Actualizando...' : 'Actualizar Estudiante'}
                </button>
              </div>
            </form>
          ) : (
            <div className="text-center py-4">
              <div className="text-sm text-gray-500 mb-3">
                El estudiante ya tiene acceso a todas las materias disponibles.
              </div>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md"
              >
                Cerrar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 