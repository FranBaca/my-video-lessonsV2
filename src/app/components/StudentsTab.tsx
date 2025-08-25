'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { FiPlus, FiEdit, FiTrash2 } from 'react-icons/fi';
import { Student } from '../types/firebase';
import SearchBar from './SearchBar';
import { dashboardAnimations, listVariants } from '../../animations';

interface StudentsTabProps {
  students: Student[];
  onDeleteStudent: (studentId: string) => void;
  onEditStudent: (student: Student) => void;
  onShowCreateStudentModal: () => void;
}

export default function StudentsTab({ 
  students, 
  onDeleteStudent, 
  onEditStudent, 
  onShowCreateStudentModal 
}: StudentsTabProps) {
  const [studentSearchTerm, setStudentSearchTerm] = useState('');

  const filteredStudents = useMemo(() => {
    if (!studentSearchTerm.trim()) {
      return students;
    }
    
    const searchTerm = studentSearchTerm.toLowerCase().trim();
    return students.filter(student => {
      return (
        student.name.toLowerCase().includes(searchTerm) ||
        student.code.toLowerCase().includes(searchTerm) ||
        (student.email && student.email.toLowerCase().includes(searchTerm))
      );
    });
  }, [students, studentSearchTerm]);

  return (
    <motion.div 
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-lg font-medium text-gray-900">Estudiantes</h2>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="w-full sm:w-64">
            <SearchBar
              placeholder="Buscar estudiantes..."
              value={studentSearchTerm}
              onChange={setStudentSearchTerm}
              onClear={() => setStudentSearchTerm('')}
            />
          </div>
          <motion.button
            onClick={onShowCreateStudentModal}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap flex items-center gap-2"
            variants={dashboardAnimations.buttons.primary}
            whileHover="whileHover"
            whileTap="whileTap"
          >
            <FiPlus className="w-4 h-4" />
            Agregar Estudiante
          </motion.button>
        </div>
      </div>

      <motion.div 
        className="bg-white shadow overflow-hidden sm:rounded-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {studentSearchTerm.trim() && (
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <p className="text-sm text-gray-600">
              {filteredStudents.length === 0 
                ? `No se encontraron estudiantes que coincidan con "${studentSearchTerm}"`
                : `Mostrando ${filteredStudents.length} de ${students.length} estudiantes`
              }
            </p>
          </div>
        )}
        
        {filteredStudents.length === 0 ? (
          <motion.div 
            className="text-center py-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {studentSearchTerm.trim() ? 'No se encontraron estudiantes' : 'No hay estudiantes'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {studentSearchTerm.trim() 
                ? 'Intenta con un término de búsqueda diferente.'
                : 'Comienza agregando tu primer estudiante.'
              }
            </p>
          </motion.div>
        ) : (
          <motion.ul 
            className="divide-y divide-gray-200"
            variants={listVariants.students.list}
            initial="initial"
            animate="animate"
          >
            {filteredStudents.map((student, index) => (
              <motion.li 
                key={student.id}
                variants={listVariants.students.item}
                custom={index}
              >
                <div className="px-4 py-4 flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{student.name}</div>
                      <div className="text-sm text-gray-500">Código: {student.code}</div>
                      {student.email && (
                        <div className="text-sm text-gray-500">{student.email}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <motion.span 
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        student.authorized 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}
                      variants={dashboardAnimations.badges}
                      whileHover="whileHover"
                    >
                      {student.authorized ? 'Autorizado' : 'No autorizado'}
                    </motion.span>
                    <motion.button
                      onClick={() => onEditStudent(student)}
                      className="text-blue-600 hover:text-blue-900 text-sm font-medium mr-2 flex items-center gap-1"
                      variants={dashboardAnimations.actionButtons.edit}
                      whileHover="whileHover"
                      whileTap="whileTap"
                    >
                      <FiEdit className="w-4 h-4" />
                      Editar
                    </motion.button>
                    <motion.button
                      onClick={() => onDeleteStudent(student.id!)}
                      className="text-red-600 hover:text-red-900 text-sm font-medium flex items-center gap-1"
                      variants={dashboardAnimations.actionButtons.delete}
                      whileHover="whileHover"
                      whileTap="whileTap"
                    >
                      <FiTrash2 className="w-4 h-4" />
                      Eliminar
                    </motion.button>
                  </div>
                </div>
              </motion.li>
            ))}
          </motion.ul>
        )}
      </motion.div>
    </motion.div>
  );
}