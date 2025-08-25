'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { FiUpload, FiTrash2 } from 'react-icons/fi';
import { Video, Subject } from '../types/firebase';
import SearchBar from './SearchBar';
import { dashboardAnimations, listVariants } from '../../animations';

interface VideosTabProps {
  videos: Video[];
  subjects: Subject[];
  onDeleteVideo: (videoId: string) => void;
  onShowVideoUploadModal: () => void;
}

export default function VideosTab({ 
  videos, 
  subjects, 
  onDeleteVideo, 
  onShowVideoUploadModal 
}: VideosTabProps) {
  const [videoSearchTerm, setVideoSearchTerm] = useState('');

  const filteredVideos = useMemo(() => {
    if (!videoSearchTerm.trim()) {
      return videos;
    }
    
    const searchTerm = videoSearchTerm.toLowerCase().trim();
    return videos.filter(video => {
      const subject = subjects.find(s => s.id === video.subjectId);
      return (
        video.name.toLowerCase().includes(searchTerm) ||
        (video.description && video.description.toLowerCase().includes(searchTerm)) ||
        (subject && subject.name.toLowerCase().includes(searchTerm))
      );
    });
  }, [videos, videoSearchTerm, subjects]);

  return (
    <motion.div 
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-lg font-medium text-gray-900">Clases</h2>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="w-full sm:w-64">
            <SearchBar
              placeholder="Buscar clases..."
              value={videoSearchTerm}
              onChange={setVideoSearchTerm}
              onClear={() => setVideoSearchTerm('')}
            />
          </div>
          <motion.button
            onClick={onShowVideoUploadModal}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap flex items-center gap-2"
            variants={dashboardAnimations.buttons.primary}
            whileHover="whileHover"
            whileTap="whileTap"
          >
            <FiUpload className="w-4 h-4" />
            Subir Video
          </motion.button>
        </div>
      </div>

      <motion.div 
        className="bg-white shadow overflow-hidden sm:rounded-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        {videoSearchTerm.trim() && (
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
            <p className="text-sm text-gray-600">
              {filteredVideos.length === 0 
                ? `No se encontraron clases que coincidan con "${videoSearchTerm}"`
                : `Mostrando ${filteredVideos.length} de ${videos.length} clases`
              }
            </p>
          </div>
        )}
        
        {filteredVideos.length === 0 ? (
          <motion.div 
            className="text-center py-12"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {videoSearchTerm.trim() ? 'No se encontraron clases' : 'No hay clases'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {videoSearchTerm.trim() 
                ? 'Intenta con un término de búsqueda diferente.'
                : 'Comienza subiendo tu primera clase.'
              }
            </p>
          </motion.div>
        ) : (
          <motion.ul 
            className="divide-y divide-gray-200"
            variants={listVariants.videos.list}
            initial="initial"
            animate="animate"
          >
            {filteredVideos.map((video, index) => {
              const subject = subjects.find(s => s.id === video.subjectId);
              return (
                <motion.li 
                  key={video.id}
                  variants={listVariants.videos.item}
                  custom={index}
                >
                  <div className="px-4 py-4 flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-gray-300 rounded-md flex items-center justify-center">
                          <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{video.name}</div>
                        <div className="text-sm text-gray-500">
                          {subject ? subject.name : 'Sin materia'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <motion.span 
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          video.isActive 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}
                        variants={dashboardAnimations.badges}
                        whileHover="whileHover"
                      >
                        {video.isActive ? 'Activo' : 'Inactivo'}
                      </motion.span>
                      <motion.button
                        onClick={() => onDeleteVideo(video.id!)}
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
              );
            })}
          </motion.ul>
        )}
      </motion.div>
    </motion.div>
  );
}