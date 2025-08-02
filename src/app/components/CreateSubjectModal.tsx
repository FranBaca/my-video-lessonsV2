'use client';

import { useState } from 'react';
import { Subject } from '../types/firebase';
import { SUBJECT_COLORS } from '../data/subjects';

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Crear Nueva Materia</h3>
          
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Nombre de la materia *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({...prev, name: e.target.value}))}
                placeholder="Ej: Anatomía"
                className="w-full border rounded-md p-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Descripción
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({...prev, description: e.target.value}))}
                placeholder="Ej: Anatomía Humana"
                className="w-full border rounded-md p-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                rows={3}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Color
              </label>
              <div className="flex flex-wrap gap-2 mt-2">
                {SUBJECT_COLORS.map(color => (
                  <button
                    key={color.id}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      formData.color.id === color.id 
                        ? 'border-gray-800 scale-110' 
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    style={{ backgroundColor: color.value }}
                    onClick={() => setFormData(prev => ({...prev, color}))}
                    title={color.name}
                  />
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Color seleccionado: {formData.color.name}
              </p>
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <button 
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md transition-colors"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                disabled={loading || !formData.name.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
              >
                {loading ? 'Creando...' : 'Crear Materia'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
} 