"use client";

import { Student } from "@/app/types";

interface WelcomeScreenProps {
  student: Student;
  onContinue: () => void;
}

export default function WelcomeScreen({
  student,
  onContinue,
}: WelcomeScreenProps) {
  // Determinar el tipo de acceso
  const hasAnatomia = student.subjects?.includes("anatomia");
  const hasHistologia = student.subjects?.includes("histologia");

  let accessType = "";
  if (hasAnatomia && hasHistologia) {
    accessType = "completo a Anatomía e Histología";
  } else if (hasAnatomia) {
    accessType = "a Anatomía";
  } else if (hasHistologia) {
    accessType = "a Histología";
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

            {hasAnatomia && hasHistologia && (
              <p className="text-sm text-gray-500 mt-2">
                Podrás seleccionar entre ambas materias en el menú lateral.
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
