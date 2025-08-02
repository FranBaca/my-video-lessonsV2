'use client';

import { useState, useRef } from 'react';
import { Subject, Video } from '../types/firebase';
import { auth } from '../lib/firebase';
import { useMuxUpload } from '../hooks/useMuxUpload';

import { UploadErrorHandler } from '../lib/upload-error-handler';
import { showNotification } from '../lib/notifications';

interface VideoMetadata {
  name: string;
  description: string;
  subjectId: string;
  tags: string[];
}

interface VideoUploadProps {
  professorId: string;
  subjects: Subject[];
  onUploadSuccess: (video: Video) => void;
  onUploadError: (error: string) => void;
  onCancel: () => void;
}

export default function VideoUpload({ 
  professorId, 
  subjects, 
  onUploadSuccess, 
  onUploadError, 
  onCancel 
}: VideoUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [videoMetadata, setVideoMetadata] = useState<VideoMetadata>({
    name: '',
    description: '',
    subjectId: '',
    tags: []
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadProgress, isUploading, uploadToMux, resetProgress } = useMuxUpload();

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('video/')) {
        setSelectedFile(file);
        // Auto-completar nombre del video
        if (!videoMetadata.name) {
          setVideoMetadata(prev => ({
            ...prev,
            name: file.name.replace(/\.[^/.]+$/, "") // Remover extensión
          }));
        }
      } else {
        onUploadError('Solo se permiten archivos de video');
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type.startsWith('video/')) {
        setSelectedFile(file);
        // Auto-completar nombre del video
        if (!videoMetadata.name) {
          setVideoMetadata(prev => ({
            ...prev,
            name: file.name.replace(/\.[^/.]+$/, "") // Remover extensión
          }));
        }
      } else {
        onUploadError('Solo se permiten archivos de video');
      }
    }
  };

  // Función para obtener token real del profesor autenticado
  const getAuthToken = async (): Promise<string> => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        throw new Error('No hay usuario autenticado');
      }

      // Obtener el token ID de Firebase
      const token = await currentUser.getIdToken();
      return token;
    } catch (error) {
      throw new Error('Error de autenticación. Por favor, inicia sesión nuevamente.');
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile || !videoMetadata.subjectId || !videoMetadata.name.trim()) {
      onUploadError('Por favor completa todos los campos requeridos');
      return;
    }

    try {
      
      // Validación de tamaño de archivo
      const fileSizeMB = selectedFile.size / (1024 * 1024);
      const maxSizeMB = 2048; // 2GB máximo
      
      if (fileSizeMB > maxSizeMB) {
        onUploadError(`El archivo es demasiado grande (${fileSizeMB.toFixed(2)}MB). El tamaño máximo permitido es ${maxSizeMB}MB.`);
        return;
      }

      // Obtener token de autenticación
      const authToken = await getAuthToken();

      // Preparar metadata para el upload
      const metadata = {
        name: videoMetadata.name.trim(),
        description: videoMetadata.description.trim(),
        subjectId: videoMetadata.subjectId,
        tags: videoMetadata.tags,
        fileSize: selectedFile.size,
        mimeType: selectedFile.type,
      };

      // Usar el hook para subir a Mux
      const result = await uploadToMux(selectedFile, metadata, authToken);
      
      // Verificar si el resultado es válido
      if (!result || !result.id) {
        throw new Error('Error: No se recibió un resultado válido del upload');
      }
      
      // Convertir el resultado al formato esperado por el callback
      const video: Video = {
        id: result.id,
        name: result.name,
        description: result.description,
        subjectId: result.subjectId,
        professorId: professorId,
        muxPlaybackId: result.playbackId || '',
        muxAssetId: result.assetId || '',
        tags: result.tags,
        isActive: result.status === 'ready', // Solo activo si está listo
        order: 0,
        createdAt: result.createdAt,
        fileSize: selectedFile.size,
        mimeType: selectedFile.type,
        status: result.status || 'processing',
        uploadConfirmed: true,
      };
      
      // Notificar al usuario sobre el estado del video
      if (result.status === 'processing') {
        // Mostrar mensaje al usuario sobre el procesamiento
        onUploadSuccess({
          ...video,
          status: 'processing',
          isActive: false, // Temporalmente inactivo hasta que esté listo
        });
        
        // Mostrar mensaje informativo al usuario
        showNotification.success('✅ Clase subida exitosamente!\n\nLa clase se está procesando. Esto puede tomar varios minutos para archivos grandes.');
      } else {
        // El video está listo
        onUploadSuccess({
          ...video,
          status: 'ready',
          isActive: true,
        });
        
        // Mostrar mensaje de éxito
        showNotification.success('✅ Clase procesada y lista para reproducir!');
      }
      
    } catch (error) {
      // Usar el manejador de errores mejorado
      const errorMessage = UploadErrorHandler.handleError(error);
      const suggestions = UploadErrorHandler.getSuggestions(error);
      
      // Mostrar error con sugerencias
      const fullErrorMessage = `${errorMessage}\n\nSugerencias:\n${suggestions.join('\n')}`;
      onUploadError(fullErrorMessage);
    } finally {
      resetProgress();
    }
  };

  const getPhaseIcon = () => {
    switch (uploadProgress.phase) {
      case 'preparing':
        return (
          <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'uploading':
        return (
          <svg className="w-6 h-6 text-blue-500 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        );
      case 'processing':
        return (
          <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getPhaseColor = () => {
    switch (uploadProgress.phase) {
      case 'preparing':
        return 'bg-blue-500';
      case 'uploading':
        return 'bg-blue-500';
      case 'processing':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-6 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-medium text-gray-900">Subir Clase</h3>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleUpload} className="space-y-6">
          {/* Drag & Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive 
                ? 'border-blue-400 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            {selectedFile ? (
              <div className="space-y-2">
                <svg className="mx-auto h-12 w-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-gray-600">{selectedFile.name}</p>
                <p className="text-xs text-gray-500">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                  className="text-sm text-red-600 hover:text-red-800"
                >
                  Cambiar archivo
                </button>
              </div>
            ) : (
              <div>
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="mt-2 text-sm text-gray-600">
                  Arrastra tu clase aquí o haz clic para seleccionar
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                >
                  Seleccionar archivo
                </button>
              </div>
            )}
          </div>

          {/* Metadata Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Nombre de la clase *
              </label>
                             <input
                 type="text"
                 value={videoMetadata.name}
                 onChange={(e) => setVideoMetadata(prev => ({...prev, name: e.target.value}))}
                 className="w-full border rounded-md p-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                 placeholder="Ej: Introducción a la Anatomía"
                 required
               />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Materia *
              </label>
                             <select
                 value={videoMetadata.subjectId}
                 onChange={(e) => setVideoMetadata(prev => ({...prev, subjectId: e.target.value}))}
                 className="w-full border rounded-md p-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                 required
               >
                <option value="">Selecciona una materia</option>
                {subjects.map(subject => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
              {subjects.length === 0 && (
                <p className="text-sm text-gray-500 mt-1">
                  Primero debes crear una materia
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Descripción
              </label>
                             <textarea
                 value={videoMetadata.description}
                 onChange={(e) => setVideoMetadata(prev => ({...prev, description: e.target.value}))}
                 className="w-full border rounded-md p-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                 rows={3}
                 placeholder="Describe el contenido de la clase..."
               />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Tags (separados por comas)
              </label>
                             <input
                 type="text"
                 value={videoMetadata.tags.join(', ')}
                 onChange={(e) => {
                   const tags = e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag);
                   setVideoMetadata(prev => ({...prev, tags}));
                 }}
                 className="w-full border rounded-md p-2 mt-1 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder-gray-500"
                 placeholder="anatomía, huesos, cráneo"
               />
            </div>
          </div>

          {/* Progress Bar */}
          {isUploading && (
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                {getPhaseIcon()}
                <div className="flex-1">
                  <div className="flex justify-between text-sm text-gray-600">
                    <span>{uploadProgress.message}</span>
                    <span>{uploadProgress.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${getPhaseColor()}`}
                      style={{ width: `${uploadProgress.progress}%` }}
                    />
                  </div>
                </div>
              </div>
              
              {/* Phase indicator */}
              <div className="flex justify-center space-x-4 text-xs text-gray-500">
                <div className={`flex items-center space-x-1 ${uploadProgress.phase === 'preparing' ? 'text-blue-600 font-medium' : ''}`}>
                  <div className={`w-2 h-2 rounded-full ${uploadProgress.phase === 'preparing' ? 'bg-blue-600' : 'bg-gray-300'}`} />
                  <span>Preparando</span>
                </div>
                <div className={`flex items-center space-x-1 ${uploadProgress.phase === 'uploading' ? 'text-blue-600 font-medium' : ''}`}>
                  <div className={`w-2 h-2 rounded-full ${uploadProgress.phase === 'uploading' ? 'bg-blue-600' : 'bg-gray-300'}`} />
                  <span>Subiendo</span>
                </div>
                <div className={`flex items-center space-x-1 ${uploadProgress.phase === 'processing' ? 'text-green-600 font-medium' : ''}`}>
                  <div className={`w-2 h-2 rounded-full ${uploadProgress.phase === 'processing' ? 'bg-green-600' : 'bg-gray-300'}`} />
                  <span>Procesando</span>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4">
            <button
              type="button"
              onClick={onCancel}
              disabled={isUploading}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isUploading || !selectedFile || !videoMetadata.name.trim() || !videoMetadata.subjectId}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors"
            >
              {isUploading ? 'Subiendo...' : 'Subir Clase'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 