'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { authService } from '../lib/auth-service';
import { professorServiceClient, videoServiceClient, studentServiceClient, subjectServiceClient } from '../lib/firebase-client';
import { Professor, Video, Student, Subject } from '../types/firebase';
import CreateSubjectModal from './CreateSubjectModal';
import SubjectCard from './SubjectCard';
import VideoUpload from './VideoUpload';
import EditStudentModal from './EditStudentModal';
import SearchBar from './SearchBar';
import { showNotification, showConfirmation } from '../lib/notifications';

interface ProfessorDashboardProps {
  professorId: string;
  professor: Professor;
  onLogout: () => void;
}

export default function ProfessorDashboard({ professorId, professor, onLogout }: ProfessorDashboardProps) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'subjects' | 'videos' | 'students'>('overview');
  
  // Estados para modales
  const [showCreateSubjectModal, setShowCreateSubjectModal] = useState(false);
  const [showVideoUploadModal, setShowVideoUploadModal] = useState(false);
  const [showCreateStudentModal, setShowCreateStudentModal] = useState(false);
  const [showEditStudentModal, setShowEditStudentModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  
  // Estados para crear estudiante
  const [creatingStudent, setCreatingStudent] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentEmail, setNewStudentEmail] = useState('');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  
  // Estado para búsqueda de estudiantes
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  
  // Estado para búsqueda de videos
  const [videoSearchTerm, setVideoSearchTerm] = useState('');
  
  // Estado para búsqueda de materias
  const [subjectSearchTerm, setSubjectSearchTerm] = useState('');

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      
      const [videosData, subjectsData, studentsData] = await Promise.all([
        videoServiceClient.getByProfessor(professorId),
        subjectServiceClient.getByProfessor(professorId),
        studentServiceClient.getByProfessor(professorId)
      ]);
      
      setVideos(videosData);
      setSubjects(subjectsData);
      setStudents(studentsData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      // Show error notification in development
      if (process.env.NODE_ENV === 'development') {
        showNotification.error('Error al cargar los datos del dashboard');
      }
    } finally {
      setLoading(false);
    }
  }, [professorId]);

  const refreshSubjects = useCallback(async () => {
    try {
      const subjectsData = await subjectServiceClient.getByProfessor(professorId);
      setSubjects(subjectsData);
    } catch (error) {
      console.error('Error refreshing subjects:', error);
    }
  }, [professorId]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleLogout = async () => {
    try {
      await authService.logout();
      onLogout();
    } catch (error) {
      // Aún así, llamar a onLogout para limpiar el estado local
      onLogout();
    }
  };

  // Funciones para materias
  const handleCreateSubject = async (subjectData: Omit<Subject, 'id'>) => {
    try {
      const subjectId = await subjectServiceClient.create(professorId, subjectData);
      
      // Cerrar el modal antes de recargar datos
      setShowCreateSubjectModal(false);
      
      // Actualizar inmediatamente el estado local con la nueva materia
      const newSubject: Subject = {
        id: subjectId,
        ...subjectData,
        createdAt: new Date(),
        updatedAt: undefined
      };
      
      setSubjects(prev => [...prev, newSubject]);
      
      // Refrescar subjects específicamente después de un breve delay
      setTimeout(async () => {
        try {
          await refreshSubjects();
        } catch (error) {
          console.error('Error refreshing subjects:', error);
        }
      }, 1000);
      
      showNotification.success('Materia creada exitosamente');
    } catch (error) {
      showNotification.error(`Error al crear la materia: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  };

  const handleDeleteSubject = async (subjectId: string) => {
    const confirmed = await showConfirmation('¿Estás seguro de que quieres eliminar esta materia? Esta acción no se puede deshacer.');
    if (!confirmed) return;

    try {
      await subjectServiceClient.delete(professorId, subjectId);
      await loadDashboardData();
      showNotification.success('Materia eliminada exitosamente');
    } catch (error) {
      showNotification.error(`Error al eliminar la materia: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  };

  // Funciones para videos
  const handleVideoUploadSuccess = async (video: Video) => {
    await loadDashboardData();
    setShowVideoUploadModal(false);
          showNotification.success('Clase subida exitosamente');
  };

  const handleVideoUploadError = (error: string) => {
    showNotification.error(`Error al subir el video: ${error}`);
  };

  const handleDeleteVideo = async (videoId: string) => {
    const confirmed = await showConfirmation('¿Estás seguro de que quieres eliminar este video? Esta acción no se puede deshacer.');
    if (!confirmed) return;

    try {
      // Get the current user's ID token for authentication
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        throw new Error('No hay usuario autenticado');
      }

      const token = await currentUser.getIdToken();
      
      const response = await fetch(`/api/admin/videos/${videoId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al eliminar el video');
      }

      await loadDashboardData();
      showNotification.success('Video eliminado exitosamente');
    } catch (error) {
      showNotification.error(`Error al eliminar el video: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  };

  // Funciones para crear estudiantes
  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim()) return;

    try {
      setCreatingStudent(true);
      
      const studentData: any = {
        name: newStudentName.trim(),
        authorized: true,
        allowedVideos: [], // Por ahora vacío, se puede implementar después
        allowedSubjects: selectedSubjects,
        enrolledAt: new Date()
      };

      // Solo incluir email si no está vacío
      if (newStudentEmail.trim()) {
        studentData.email = newStudentEmail.trim();
      }

      const result = await studentServiceClient.createWithGeneratedCode(professorId, studentData);

      // Limpiar formulario
      setNewStudentName('');
      setNewStudentEmail('');
      setSelectedSubjects([]);
      setShowCreateStudentModal(false);

      // Recargar datos
      await loadDashboardData();

      // Mostrar mensaje de éxito
      showNotification.success(`Estudiante creado exitosamente!\nCódigo: ${result.code}`);
    } catch (error) {
      showNotification.error(`Error al crear el estudiante: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    } finally {
      setCreatingStudent(false);
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    const confirmed = await showConfirmation('¿Estás seguro de que quieres eliminar este estudiante?');
    if (!confirmed) return;

    try {
      await studentServiceClient.delete(professorId, studentId);
      await loadDashboardData();
      showNotification.success('Estudiante eliminado exitosamente');
    } catch (error) {
      showNotification.error('Error al eliminar el estudiante');
    }
  };

  const handleEditStudent = (student: Student) => {
    setEditingStudent(student);
    setShowEditStudentModal(true);
  };

  const handleUpdateStudent = async (studentId: string, subjectsToAdd: string[]) => {
    try {
      // Get the current user's ID token for authentication
      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        throw new Error('No hay usuario autenticado');
      }

      const token = await currentUser.getIdToken();
      
      const response = await fetch(`/api/admin/students/${studentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ subjectsToAdd }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al actualizar el estudiante');
      }

      await loadDashboardData();
      showNotification.success('Estudiante actualizado exitosamente');
    } catch (error) {
      showNotification.error(`Error al actualizar el estudiante: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      throw error; // Re-throw to let the modal handle it
    }
  };

  const handleToggleSubjectSelection = (subjectId: string) => {
    setSelectedSubjects(prev => 
      prev.includes(subjectId) 
        ? prev.filter(id => id !== subjectId)
        : [...prev, subjectId]
    );
  };

  /**
   * Filtrado de estudiantes basado en el término de búsqueda
   * 
   * Busca en:
   * - Nombre del estudiante
   * - Código del estudiante  
   * - Email del estudiante (si existe)
   * 
   * La búsqueda es case-insensitive y se actualiza en tiempo real
   */
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

  /**
   * Filtrado de videos basado en el término de búsqueda
   * 
   * Busca en:
   * - Nombre del video
   * - Descripción del video (si existe)
   * - Nombre de la materia asociada
   * 
   * La búsqueda es case-insensitive y se actualiza en tiempo real
   */
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

  /**
   * Filtrado de materias basado en el término de búsqueda
   * 
   * Busca en:
   * - Nombre de la materia
   * - Descripción de la materia
   * 
   * La búsqueda es case-insensitive y se actualiza en tiempo real
   */
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

  // Limpiar búsqueda cuando se cambia de tab
  const handleTabChange = (tab: 'overview' | 'subjects' | 'videos' | 'students') => {
    if (tab !== 'students') {
      setStudentSearchTerm('');
    }
    if (tab !== 'videos') {
      setVideoSearchTerm('');
    }
    if (tab !== 'subjects') {
      setSubjectSearchTerm('');
    }
    setActiveTab(tab);
  };



  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Dashboard de Profesor
              </h1>
              <p className="text-gray-600">Bienvenido, {professor.name}</p>
            </div>
            <button
              onClick={handleLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => handleTabChange('overview')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Resumen
            </button>
            <button
              onClick={() => handleTabChange('subjects')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'subjects'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Materias ({subjects.length})
            </button>
            <button
              onClick={() => handleTabChange('videos')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'videos'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Clases ({videos.length})
            </button>
            <button
              onClick={() => handleTabChange('students')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'students'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Estudiantes ({students.length})
            </button>
          </nav>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">

                 {activeTab === 'overview' && (
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Clases</dt>
                      <dd className="text-lg font-medium text-gray-900">{videos.length}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Estudiantes</dt>
                      <dd className="text-lg font-medium text-gray-900">{students.length}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Materias</dt>
                      <dd className="text-lg font-medium text-gray-900">{subjects.length}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            
          </div>
        )}

        {activeTab === 'subjects' && (
          <div className="space-y-6">
            {/* Header con búsqueda y botones */}
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
                  <button
                    onClick={() => setShowVideoUploadModal(true)}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                  >
                    <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    Subir Video
                  </button>
                  <button
                    onClick={() => setShowCreateSubjectModal(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                  >
                    <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Crear Materia
                  </button>
                </div>
              </div>
            </div>

            {/* Grid de materias */}
            {filteredSubjects.length === 0 ? (
              <div className="text-center py-12">
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
                    <button
                      onClick={() => setShowCreateSubjectModal(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                    >
                      Crear Primera Materia
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSubjects.map((subject) => {
                  const videoCount = videos.filter(v => v.subjectId === subject.id).length;
                  return (
                    <SubjectCard
                      key={subject.id}
                      subject={subject}
                      videoCount={videoCount}
                      onDelete={() => handleDeleteSubject(subject.id!)}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'videos' && (
          <div className="space-y-6">
            {/* Header con búsqueda y botón de subir */}
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
                <button
                  onClick={() => setShowVideoUploadModal(true)}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap"
                >
                  <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Subir Video
                </button>
              </div>
            </div>

            {/* Lista de videos */}
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              {/* Indicador de resultados de búsqueda */}
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
                <div className="text-center py-12">
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
                </div>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {filteredVideos.map((video) => {
                    const subject = subjects.find(s => s.id === video.subjectId);
                    return (
                      <li key={video.id}>
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
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              video.isActive 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {video.isActive ? 'Activo' : 'Inactivo'}
                            </span>
                            <button
                              onClick={() => handleDeleteVideo(video.id!)}
                              className="text-red-600 hover:text-red-900 text-sm font-medium"
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        )}

        {activeTab === 'students' && (
          <div className="space-y-6">
            {/* Header con búsqueda y botón de crear */}
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
                <button
                  onClick={() => setShowCreateStudentModal(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap"
                >
                  <svg className="w-4 h-4 mr-2 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Agregar Estudiante
                </button>
              </div>
            </div>

            {/* Lista de estudiantes */}
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              {/* Indicador de resultados de búsqueda */}
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
                <div className="text-center py-12">
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
                </div>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {filteredStudents.map((student) => (
                    <li key={student.id}>
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
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            student.authorized 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {student.authorized ? 'Autorizado' : 'No autorizado'}
                          </span>
                          <button
                            onClick={() => handleEditStudent(student)}
                            className="text-blue-600 hover:text-blue-900 text-sm font-medium mr-2"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDeleteStudent(student.id!)}
                            className="text-red-600 hover:text-red-900 text-sm font-medium"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Modal para crear materia */}
      {showCreateSubjectModal && (
        <CreateSubjectModal
          isOpen={showCreateSubjectModal}
          onClose={() => setShowCreateSubjectModal(false)}
          onSubmit={handleCreateSubject}
          professorId={professorId}
          existingSubjects={subjects}
        />
      )}

      {/* Modal para subir video */}
      {showVideoUploadModal && (
        <VideoUpload
          professorId={professorId}
          subjects={subjects}
          onUploadSuccess={handleVideoUploadSuccess}
          onUploadError={handleVideoUploadError}
          onCancel={() => setShowVideoUploadModal(false)}
        />
      )}

      {/* Modal para crear estudiante */}
      {showCreateStudentModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Crear Nuevo Estudiante</h3>
              
              <form onSubmit={handleCreateStudent} className="space-y-4">
                <div>
                  <label htmlFor="studentName" className="block text-sm font-medium text-gray-700">
                    Nombre *
                  </label>
                                     <input
                     type="text"
                     id="studentName"
                     value={newStudentName}
                     onChange={(e) => setNewStudentName(e.target.value)}
                     className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                     placeholder="Nombre del estudiante"
                     required
                   />
                </div>

                <div>
                  <label htmlFor="studentEmail" className="block text-sm font-medium text-gray-700">
                    Email (opcional)
                  </label>
                                     <input
                     type="email"
                     id="studentEmail"
                     value={newStudentEmail}
                     onChange={(e) => setNewStudentEmail(e.target.value)}
                     className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                     placeholder="email@ejemplo.com"
                   />
                </div>

                {subjects.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Materias permitidas (opcional)
                    </label>
                    <div className="max-h-40 overflow-y-auto border border-gray-300 rounded-md p-2">
                      {subjects.map((subject) => (
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
                )}

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowCreateStudentModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={creatingStudent || !newStudentName.trim()}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md"
                  >
                    {creatingStudent ? 'Creando...' : 'Crear Estudiante'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Modal para editar estudiante */}
      {showEditStudentModal && editingStudent && (
        <EditStudentModal
          isOpen={showEditStudentModal}
          onClose={() => {
            setShowEditStudentModal(false);
            setEditingStudent(null);
          }}
          onSubmit={handleUpdateStudent}
          student={editingStudent}
          subjects={subjects}
        />
      )}
    </div>
  );
} 