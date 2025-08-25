'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { FiPlus, FiUpload } from 'react-icons/fi';
import { Subject, Video } from '../types/firebase';
import SearchBar from './SearchBar';
import SubjectCard from './SubjectCard';
import { dashboardAnimations, listVariants } from '../../animations';

interface SubjectsTabProps {
  subjects: Subject[];
  videos: Video[];
  onDeleteSubject: (subjectId: string) => void;
  onShowCreateSubjectModal: () => void;
  onShowVideoUploadModal: () => void;
}

export default function SubjectsTab({ 
  subjects, 
  videos, 
  onDeleteSubject, 
  onShowCreateSubjectModal,
  onShowVideoUploadModal
}: SubjectsTabProps) {
  const [subjectSearchTerm, setSubjectSearchTerm] = useState('');

  const filteredSubjects = useMemo(() => {
    if (!subjectSearchTerm.trim()) {
      return subjects;
    }
    
    const searchTerm = subjectSearchTerm.toLowerCase().trim();
    return subjects.filter(subject => {
      return (
        subject.name.toLowerCase().includes(searchTerm) ||
        (subject.description && subject.description.toLowerCase().includes(searchTerm))
      );
    });
  }, [subjects, subjectSearchTerm]);

  return (
    <motion.div 
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-lg font-medium text-gray-900">Materias</h2>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="w-full sm:w-64">
            <SearchBar
              placeholder="Buscar materias..."
              value={subjectSearchTerm}
              onChange={setSubjectSearchTerm}
              onClear={() => setSubjectSearchTerm('')}
            />
          </div>
          <div className="flex space-x-2">
            <motion.button
              onClick={onShowVideoUploadModal}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2"
              variants={dashboardAnimations.buttons.primary}
              whileHover="whileHover"
              whileTap="whileTap"
            >
              <FiUpload className="w-4 h-4" />
              Subir Video
            </motion.button>
            <motion.button
              onClick={onShowCreateSubjectModal}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2"
              variants={dashboardAnimations.buttons.primary}
              whileHover="whileHover"
              whileTap="whileTap"
            >
              <FiPlus className="w-4 h-4" />
              Crear Materia
            </motion.button>
          </div>
        </div>
      </div>

      {filteredSubjects.length === 0 ? (
        <motion.div 
          className="text-center py-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {subjectSearchTerm.trim() ? 'No se encontraron materias' : 'No hay materias'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {subjectSearchTerm.trim() 
              ? 'Intenta con un término de búsqueda diferente.'
              : 'Comienza creando tu primera materia.'
            }
          </p>
          {!subjectSearchTerm.trim() && (
            <div className="mt-6">
              <motion.button
                onClick={onShowCreateSubjectModal}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium flex items-center gap-2"
                variants={dashboardAnimations.buttons.primary}
                whileHover="whileHover"
                whileTap="whileTap"
              >
                <FiPlus className="w-4 h-4" />
                Crear Primera Materia
              </motion.button>
            </div>
          )}
        </motion.div>
      ) : (
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={listVariants.subjects.grid}
          initial="initial"
          animate="animate"
        >
          {filteredSubjects.map((subject, index) => {
            const videoCount = videos.filter(v => v.subjectId === subject.id).length;
            return (
              <motion.div
                key={subject.id}
                variants={listVariants.subjects.card}
                custom={index}
              >
                <SubjectCard
                  subject={subject}
                  videoCount={videoCount}
                  onDelete={() => onDeleteSubject(subject.id!)}
                />
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </motion.div>
  );
}