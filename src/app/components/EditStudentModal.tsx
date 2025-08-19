'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Student, Subject } from '../types/firebase';
import { editStudentModal } from '../../animations';

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

  return (
    <AnimatePresence>
      {isOpen && student && (
        <motion.div 
          className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
          variants={editStudentModal.backdrop}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          <motion.div 
            className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white"
            variants={editStudentModal.content}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Editar Estudiante
                </h3>
                <motion.button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </motion.button>
              </div>

              {/* Student Info */}
              <motion.div 
                className="mb-4 p-3 bg-gray-50 rounded-md"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <div className="text-sm text-gray-600">Estudiante</div>
                <div className="font-medium text-gray-900">{student.name}</div>
                <div className="text-sm text-gray-500">Código: {student.code}</div>
                {student.email && (
                  <div className="text-sm text-gray-500">Email: {student.email}</div>
                )}
              </motion.div>

              {/* Current Subjects */}
              {student.allowedSubjects && student.allowedSubjects.length > 0 && (
                <motion.div 
                  className="mb-4"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                >
                  <div className="text-sm font-medium text-gray-700 mb-2">
                    Materias actuales:
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {student.allowedSubjects.map((subjectId) => {
                      const subject = subjects.find(s => s.id === subjectId);
                      return (
                        <motion.span
                          key={subjectId}
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.2 }}
                        >
                          {subject ? subject.name : 'Materia desconocida'}
                        </motion.span>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* Available Subjects */}
              {availableSubjects.length > 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: 0.3 }}
                >
                  <div className="text-sm font-medium text-gray-700 mb-2">
                    Agregar materias:
                  </div>
                  <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-md p-2">
                    {availableSubjects.map((subject) => (
                      <motion.label 
                        key={subject.id} 
                        className="flex items-center space-x-2 py-1"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedSubjects.includes(subject.id!)}
                          onChange={() => handleToggleSubjectSelection(subject.id!)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{subject.name}</span>
                      </motion.label>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <motion.div 
                  className="text-center py-4 text-gray-500"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.3 }}
                >
                  El estudiante ya tiene acceso a todas las materias disponibles.
                </motion.div>
              )}

              {/* Buttons */}
              <motion.div 
                className="flex justify-end space-x-3 pt-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.4 }}
              >
                <motion.button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  Cancelar
                </motion.button>
                <motion.button
                  type="submit"
                  disabled={loading || selectedSubjects.length === 0}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  {loading ? 'Actualizando...' : 'Actualizar'}
                </motion.button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 