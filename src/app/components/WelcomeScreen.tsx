"use client";

import { MATERIAS } from "@/app/lib/sheets";

interface WelcomeScreenProps {
  student: {
    name: string;
    code: string;
    subjects?: string[];
  };
  onContinue: () => void;
}

export default function WelcomeScreen({
  student,
  onContinue,
}: WelcomeScreenProps) {
  // Determinar el tipo de acceso usando las materias normalizadas
  const hasAnatomia = student.subjects?.includes(MATERIAS.ANATOMIA);
  const hasHistologia = student.subjects?.includes(MATERIAS.HISTOLOGIA);
  const hasFisiologia = student.subjects?.includes(MATERIAS.FISIOLOGIA);

  let accessType = "";
  if (hasAnatomia && hasHistologia && hasFisiologia) {
    accessType = "completo a Anatomía, Histología y Fisiología";
  } else if (hasAnatomia && hasHistologia) {
    accessType = "completo a Anatomía e Histología";
  } else if (hasAnatomia && hasFisiologia) {
    accessType = "completo a Anatomía y Fisiología";
  } else if (hasHistologia && hasFisiologia) {
    accessType = "completo a Histología y Fisiología";
  } else if (hasAnatomia) {
    accessType = "a Anatomía";
  } else if (hasHistologia) {
    accessType = "a Histología";
  } else if (hasFisiologia) {
    accessType = "a Fisiología";
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 p-6 sm:p-10 bg-white rounded-xl shadow-lg">
        <div className="text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900">
            ¡Bienvenido/a, {student.name}!
          </h2>

          <div className="mt-6 space-y-4">
            <p className="text-lg text-gray-700">
              Has iniciado sesión correctamente con el código{" "}
              <span className="font-semibold">{student.code}</span>.
            </p>

            <p className="text-lg text-gray-700">Tienes acceso {accessType}.</p>

            {student.subjects && student.subjects.length > 1 && (
              <p className="text-sm text-gray-500 mt-2">
                Podrás seleccionar entre las materias disponibles en el menú
                lateral.
              </p>
            )}

            <div className="mt-8">
              <button
                onClick={onContinue}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Continuar a las clases
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
