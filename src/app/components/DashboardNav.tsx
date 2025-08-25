'use client';

interface DashboardNavProps {
  activeTab: string;
  onTabChange: (tab: 'overview' | 'subjects' | 'videos' | 'students') => void;
  counts: {
    subjects: number;
    videos: number;
    students: number;
  };
}

export default function DashboardNav({ activeTab, onTabChange, counts }: DashboardNavProps) {
  const navItems = [
    { id: 'overview', label: 'Resumen', count: null },
    { id: 'subjects', label: 'Materias', count: counts.subjects },
    { id: 'videos', label: 'Clases', count: counts.videos },
    { id: 'students', label: 'Estudiantes', count: counts.students },
  ] as const;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === item.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {item.label} {item.count !== null ? `(${item.count})` : ''}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}