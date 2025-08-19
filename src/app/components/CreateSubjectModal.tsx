'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Subject } from '../types/firebase';
import { SUBJECT_COLORS } from '../data/subjects';
import { createSubjectModal } from '../../animations';

interface CreateSubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (subject: Omit<Subject, 'id'>) => void;
  professorId: string;
  existingSubjects: Subject[];
}

export default function CreateSubjectModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  professorId, 
  existingSubjects 
}: CreateSubjectModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: SUBJECT_COLORS[0]
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validaciones
      if (!formData.name.trim()) {
        throw new Error('El nombre de la materia es requerido');
      }

      // Verificar si ya existe una materia con ese nombre
      const nameExists = existingSubjects.some(subject => 
        subject.name.toLowerCase() === formData.name.trim().toLowerCase()
      );
      
      if (nameExists) {
        throw new Error('Ya existe una materia con ese nombre');
      }

      // Crear materia
      const subjectData: Omit<Subject, 'id'> = {
        name: formData.name.trim(),
        description: formData.description.trim(),
        color: formData.color.id, // Guardar solo el ID del color
        order: existingSubjects.length + 1,
        isActive: true,
        createdAt: new Date()
      };

      // Llamar callback con la materia creada
      await onSubmit(subjectData);

      // Limpiar formulario
      setFormData({
        name: '',
        description: '',
        color: SUBJECT_COLORS[0]
      });

      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Error al crear la materia');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
          variants={createSubjectModal.backdrop}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          <motion.div 
            className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white"
            variants={createSubjectModal.content}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Crear Nueva Materia</h3>
              
              {error && (
                <motion.div 
                  className="bg-red-50 border-l-4 border-red-500 p-4 mb-4"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <p className="text-red-800">{error}</p>
                </motion.div>
              )}
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: 0.05 }}
                >
                  <label className="block text-sm font-medium text-gray-700">
                    Nombre de la materia *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({...prev, name: e.target.value}))}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                    placeholder="Nombre de la materia"
                    required
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: 0.1 }}
                >
                  <label className="block text-sm font-medium text-gray-700">
                    Descripción (opcional)
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({...prev, description: e.target.value}))}
                    rows={3}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                    placeholder="Descripción de la materia"
                  />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: 0.15 }}
                >
                  <label className="block text-sm font-medium text-gray-700">
                    Color de la materia
                  </label>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {SUBJECT_COLORS.map((color) => (
                      <motion.button
                        key={color.id}
                        type="button"
                        onClick={() => setFormData(prev => ({...prev, color}))}
                        className={`w-8 h-8 rounded-full border-2 ${
                          formData.color.id === color.id 
                            ? 'border-gray-800 scale-110' 
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                        style={{ backgroundColor: color.hex }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                      />
                    ))}
                  </div>
                </motion.div>

                <motion.div 
                  className="flex justify-end space-x-3 pt-4"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: 0.2 }}
                >
                  <motion.button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                  >
                    Cancelar
                  </motion.button>
                  <motion.button
                    type="submit"
                    disabled={loading || !formData.name.trim()}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md"
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ duration: 0.15 }}
                  >
                    {loading ? 'Creando...' : 'Crear Materia'}
                  </motion.button>
                </motion.div>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 