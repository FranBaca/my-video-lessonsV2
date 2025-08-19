// Tipo para los colores de las materias
export interface SubjectColor {
  id: string;
  name: string;
  value: string;
  bgClass: string;
  textClass: string;
}

// Colores para las materias
export const SUBJECT_COLORS: SubjectColor[] = [
  { id: 'blue', name: 'Azul', value: '#3B82F6', bgClass: 'bg-blue-500', textClass: 'text-blue-500' },
  { id: 'green', name: 'Verde', value: '#10B981', bgClass: 'bg-green-500', textClass: 'text-green-500' },
  { id: 'purple', name: 'Púrpura', value: '#8B5CF6', bgClass: 'bg-purple-500', textClass: 'text-purple-500' },
  { id: 'red', name: 'Rojo', value: '#EF4444', bgClass: 'bg-red-500', textClass: 'text-red-500' },
  { id: 'yellow', name: 'Amarillo', value: '#F59E0B', bgClass: 'bg-yellow-500', textClass: 'text-yellow-500' },
  { id: 'pink', name: 'Rosa', value: '#EC4899', bgClass: 'bg-pink-500', textClass: 'text-pink-500' },
  { id: 'indigo', name: 'Índigo', value: '#6366F1', bgClass: 'bg-indigo-500', textClass: 'text-indigo-500' },
  { id: 'teal', name: 'Verde azulado', value: '#14B8A6', bgClass: 'bg-teal-500', textClass: 'text-teal-500' },
  { id: 'orange', name: 'Naranja', value: '#F97316', bgClass: 'bg-orange-500', textClass: 'text-orange-500' },
  { id: 'cyan', name: 'Cian', value: '#06B6D4', bgClass: 'bg-cyan-500', textClass: 'text-cyan-500' },
  { id: 'lime', name: 'Lima', value: '#84CC16', bgClass: 'bg-lime-500', textClass: 'text-lime-500' },
  { id: 'emerald', name: 'Esmeralda', value: '#10B981', bgClass: 'bg-emerald-500', textClass: 'text-emerald-500' },
];

// Materias predefinidas para facilitar la creación
export const PREDEFINED_SUBJECTS = [
  {
    name: 'Anatomía',
    description: 'Estudio de la estructura del cuerpo humano',
    color: 'red',
    tags: ['anatomía', 'cuerpo humano', 'estructura', 'médico']
  },
  {
    name: 'Fisiología',
    description: 'Estudio de las funciones del cuerpo humano',
    color: 'blue',
    tags: ['fisiología', 'funciones', 'cuerpo humano', 'médico']
  },
  {
    name: 'Bioquímica',
    description: 'Estudio de los procesos químicos en seres vivos',
    color: 'green',
    tags: ['bioquímica', 'química', 'molecular', 'médico']
  },
  {
    name: 'Farmacología',
    description: 'Estudio de los medicamentos y sus efectos',
    color: 'purple',
    tags: ['farmacología', 'medicamentos', 'drogas', 'médico']
  },
  {
    name: 'Patología',
    description: 'Estudio de las enfermedades',
    color: 'orange',
    tags: ['patología', 'enfermedades', 'diagnóstico', 'médico']
  },
  {
    name: 'Microbiología',
    description: 'Estudio de microorganismos',
    color: 'teal',
    tags: ['microbiología', 'bacterias', 'virus', 'médico']
  },
  {
    name: 'Inmunología',
    description: 'Estudio del sistema inmunológico',
    color: 'indigo',
    tags: ['inmunología', 'sistema inmune', 'defensas', 'médico']
  },
  {
    name: 'Genética',
    description: 'Estudio de la herencia y genes',
    color: 'pink',
    tags: ['genética', 'genes', 'herencia', 'ADN', 'médico']
  },
  {
    name: 'Neurología',
    description: 'Estudio del sistema nervioso',
    color: 'cyan',
    tags: ['neurología', 'cerebro', 'nervios', 'médico']
  },
  {
    name: 'Cardiología',
    description: 'Estudio del corazón y sistema cardiovascular',
    color: 'red',
    tags: ['cardiología', 'corazón', 'cardiovascular', 'médico']
  },
  {
    name: 'Dermatología',
    description: 'Estudio de la piel y sus enfermedades',
    color: 'yellow',
    tags: ['dermatología', 'piel', 'dermatitis', 'médico']
  },
  {
    name: 'Oftalmología',
    description: 'Estudio de los ojos y la visión',
    color: 'blue',
    tags: ['oftalmología', 'ojos', 'visión', 'médico']
  },
  {
    name: 'Ortopedia',
    description: 'Estudio del sistema musculoesquelético',
    color: 'emerald',
    tags: ['ortopedia', 'huesos', 'músculos', 'médico']
  },
  {
    name: 'Pediatría',
    description: 'Medicina para niños y adolescentes',
    color: 'lime',
    tags: ['pediatría', 'niños', 'adolescentes', 'médico']
  },
  {
    name: 'Ginecología',
    description: 'Salud reproductiva femenina',
    color: 'pink',
    tags: ['ginecología', 'mujeres', 'reproducción', 'médico']
  },
  {
    name: 'Urología',
    description: 'Estudio del sistema urinario',
    color: 'blue',
    tags: ['urología', 'urinario', 'riñones', 'médico']
  },
  {
    name: 'Psiquiatría',
    description: 'Estudio de la salud mental',
    color: 'purple',
    tags: ['psiquiatría', 'salud mental', 'psicología', 'médico']
  },
  {
    name: 'Radiología',
    description: 'Diagnóstico por imágenes médicas',
    color: 'gray',
    tags: ['radiología', 'imágenes', 'diagnóstico', 'médico']
  },
  {
    name: 'Cirugía General',
    description: 'Procedimientos quirúrgicos básicos',
    color: 'red',
    tags: ['cirugía', 'quirúrgico', 'operaciones', 'médico']
  },
  {
    name: 'Medicina de Emergencias',
    description: 'Atención médica urgente',
    color: 'orange',
    tags: ['emergencias', 'urgencias', 'trauma', 'médico']
  }
];

// Función para obtener un color aleatorio
export const getRandomColor = () => {
  const randomIndex = Math.floor(Math.random() * SUBJECT_COLORS.length);
  return SUBJECT_COLORS[randomIndex];
};

// Función para obtener un color por ID
export const getColorById = (colorId: string) => {
  return SUBJECT_COLORS.find(color => color.id === colorId) || SUBJECT_COLORS[0];
};

// Función para obtener una materia predefinida por nombre
export const getPredefinedSubject = (name: string) => {
  return PREDEFINED_SUBJECTS.find(subject => 
    subject.name.toLowerCase() === name.toLowerCase()
  );
}; 