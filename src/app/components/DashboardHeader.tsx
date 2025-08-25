'use client';

import { Professor } from '../types/firebase';

interface DashboardHeaderProps {
  professor: Professor;
  onLogout: () => void;
}

export default function DashboardHeader({ professor, onLogout }: DashboardHeaderProps) {
  return (
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
            onClick={onLogout}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Cerrar Sesión
          </button>
        </div>
      </div>
    </header>
  );
}