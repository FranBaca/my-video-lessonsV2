'use client';

import { motion } from 'framer-motion';
import { FiVideo, FiUsers, FiBook } from 'react-icons/fi';
import { statsCardVariants } from '../../animations';

interface OverviewTabProps {
  stats: {
    videos: number;
    students: number;
    subjects: number;
  };
}

export default function OverviewTab({ stats }: OverviewTabProps) {
  const statItems = [
    { 
      label: 'Total Clases', 
      value: stats.videos, 
      icon: FiVideo, 
      color: 'bg-blue-500' 
    },
    { 
      label: 'Total Estudiantes', 
      value: stats.students, 
      icon: FiUsers, 
      color: 'bg-green-500' 
    },
    { 
      label: 'Materias', 
      value: stats.subjects, 
      icon: FiBook, 
      color: 'bg-purple-500' 
    },
  ];

  return (
    <motion.div 
      className="grid grid-cols-1 md:grid-cols-3 gap-6"
      variants={statsCardVariants.container}
      initial="initial"
      animate="animate"
    >
      {statItems.map((item, index) => (
        <motion.div 
          key={index}
          className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow duration-200"
          variants={statsCardVariants.card}
          whileHover="whileHover"
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className={`w-8 h-8 ${item.color} rounded-md flex items-center justify-center`}>
                  <item.icon className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">{item.label}</dt>
                  <dd className="text-lg font-medium text-gray-900">{item.value}</dd>
                </dl>
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}