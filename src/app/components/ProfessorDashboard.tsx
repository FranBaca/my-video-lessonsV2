'use client';

import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { authService } from '../lib/auth-service';
import { professorServiceClient, videoServiceClient, studentServiceClient, subjectServiceClient } from '../lib/firebase-client';
import { Professor, Video, Student, Subject } from '../types/firebase';
import { showNotification, showConfirmation } from '../lib/notifications';

// Import the new smaller components
import DashboardHeader from './DashboardHeader';
import DashboardNav from './DashboardNav';
import OverviewTab from './OverviewTab';
import SubjectsTab from './SubjectsTab';
import VideosTab from './VideosTab';
import StudentsTab from './StudentsTab';
import CreateSubjectModal from './CreateSubjectModal';
import VideoUpload from './VideoUpload';
import EditStudentModal from './EditStudentModal';
import CreateStudentModal from './CreateStudentModal';

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
  
  // Modal states
  const [showCreateSubjectModal, setShowCreateSubjectModal] = useState(false);
  const [showVideoUploadModal, setShowVideoUploadModal] = useState(false);
  const [showCreateStudentModal, setShowCreateStudentModal] = useState(false);
  const [showEditStudentModal, setShowEditStudentModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

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
      showNotification.error('Error al cargar los datos del dashboard');
    } finally {
      setLoading(false);
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
      onLogout();
    }
  };

  // Subject handlers
  const handleCreateSubject = async (subjectData: Omit<Subject, 'id'>) => {
    try {
      const subjectId = await subjectServiceClient.create(professorId, subjectData);
      setShowCreateSubjectModal(false);
      const newSubject: Subject = { id: subjectId, ...subjectData, createdAt: new Date() };
      setSubjects(prev => [...prev, newSubject]);
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

  // Video handlers
  const handleVideoUploadSuccess = async (video: Video) => {
    await loadDashboardData();
    setShowVideoUploadModal(false);
    showNotification.success('Clase subida exitosamente');
  };

  const handleDeleteVideo = async (videoId: string) => {
    const confirmed = await showConfirmation('¿Estás seguro de que quieres eliminar este video? Esta acción no se puede deshacer.');
    if (!confirmed) return;
    try {
      const token = await authService.getCurrentUser()?.getIdToken();
      if (!token) throw new Error('No autenticado');
      const response = await fetch(`/api/admin/videos/${videoId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
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

  // Student handlers
  const handleCreateStudent = async (name: string, email: string, allowedSubjects: string[]) => {
    try {
      const studentData: any = { name, authorized: true, allowedVideos: [], allowedSubjects, enrolledAt: new Date() };
      if (email) studentData.email = email;
      const result = await studentServiceClient.createWithGeneratedCode(professorId, studentData);
      await loadDashboardData();
      showNotification.success(`Estudiante creado exitosamente! Código: ${result.code}`);
    } catch (error) {
      showNotification.error(`Error al crear el estudiante: ${error instanceof Error ? error.message : 'Error desconocido'}`);
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
      const token = await authService.getCurrentUser()?.getIdToken();
      if (!token) throw new Error('No autenticado');
      const response = await fetch(`/api/admin/students/${studentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
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
      throw error;
    }
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
      <DashboardHeader professor={professor} onLogout={handleLogout} />
      <DashboardNav 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        counts={{ subjects: subjects.length, videos: videos.length, students: students.length }}
      />

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && <OverviewTab stats={{ videos: videos.length, students: students.length, subjects: subjects.length }} />}
          {activeTab === 'subjects' && (
            <SubjectsTab 
              subjects={subjects} 
              videos={videos} 
              onDeleteSubject={handleDeleteSubject} 
              onShowCreateSubjectModal={() => setShowCreateSubjectModal(true)}
              onShowVideoUploadModal={() => setShowVideoUploadModal(true)}
            />
          )}
          {activeTab === 'videos' && (
            <VideosTab 
              videos={videos} 
              subjects={subjects} 
              onDeleteVideo={handleDeleteVideo} 
              onShowVideoUploadModal={() => setShowVideoUploadModal(true)}
            />
          )}
          {activeTab === 'students' && (
            <StudentsTab 
              students={students} 
              onDeleteStudent={handleDeleteStudent} 
              onEditStudent={handleEditStudent} 
              onShowCreateStudentModal={() => setShowCreateStudentModal(true)}
            />
          )}
        </AnimatePresence>
      </main>

      {showCreateSubjectModal && (
        <CreateSubjectModal
          isOpen={showCreateSubjectModal}
          onClose={() => setShowCreateSubjectModal(false)}
          onSubmit={handleCreateSubject}
          professorId={professorId}
          existingSubjects={subjects}
        />
      )}

      {showVideoUploadModal && (
        <VideoUpload
          professorId={professorId}
          subjects={subjects}
          onUploadSuccess={handleVideoUploadSuccess}
          onUploadError={(err) => showNotification.error(`Error al subir: ${err}`)}
          onCancel={() => setShowVideoUploadModal(false)}
        />
      )}

      {showCreateStudentModal && (
        <CreateStudentModal 
          isOpen={showCreateStudentModal}
          onClose={() => setShowCreateStudentModal(false)}
          onSubmit={handleCreateStudent}
          subjects={subjects}
        />
      )}

      {showEditStudentModal && editingStudent && (
        <EditStudentModal
          isOpen={showEditStudentModal}
          onClose={() => setShowEditStudentModal(false)}
          onSubmit={handleUpdateStudent}
          student={editingStudent}
          subjects={subjects}
        />
      )}
    </div>
  );
}