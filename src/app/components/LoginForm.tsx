"use client";

import { useState } from "react";
import { Student } from "@/app/types";
import toast, { Toaster } from "react-hot-toast";
import { v4 as uuidv4 } from "uuid";

interface LoginFormProps {
  onLoginSuccess: (student: Student) => void;
}

export default function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const [code, setCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Verificar si ya hay un código almacenado en localStorage
      const storedDeviceId = localStorage.getItem("device_id");
      const storedCode = localStorage.getItem("student_code");
      const storedCodeDevice = localStorage.getItem(`student_${code}`);

      // Si el código ya está en uso en otro dispositivo (verificación local)
      if (
        storedCodeDevice &&
        storedCodeDevice !== storedDeviceId &&
        storedDeviceId
      ) {
        toast.error("Este código ya ha sido utilizado en otro dispositivo");
        setIsLoading(false);
        return;
      }

      // Generar un nuevo deviceId si no existe
      const deviceId = storedDeviceId || uuidv4();

      // Guardar el deviceId en localStorage
      if (!storedDeviceId) {
        localStorage.setItem("device_id", deviceId);
      }

      const response = await fetch("/api/auth/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Device-Id": deviceId,
        },
        body: JSON.stringify({
          code,
          deviceId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Guardar información en localStorage como respaldo
        localStorage.setItem("device_id", data.student.deviceId);
        localStorage.setItem("student_code", code);
        localStorage.setItem(`student_${code}`, data.student.deviceId);

        if (data.student.subjects) {
          localStorage.setItem(
            "allowed_subjects",
            JSON.stringify(data.student.subjects)
          );
        }

        onLoginSuccess(data.student);
      } else {
        toast.error(data.message || "Error al validar el código");
      }
    } catch (error) {
      console.error("Login error:", error);
      toast.error("Error al conectar con el servidor");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 p-6 sm:p-10 bg-white rounded-xl shadow-lg">
        <div>
          <h2 className="mt-6 text-center text-2xl sm:text-3xl font-extrabold text-gray-900">
            Acceso a Clases en Video
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Ingresa tu código único de estudiante
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="code" className="sr-only">
                Código de estudiante
              </label>
              <input
                id="code"
                name="code"
                type="text"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Código de estudiante"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300"
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Verificando...
                </span>
              ) : (
                "Acceder"
              )}
            </button>
          </div>
        </form>
      </div>
      <Toaster position="top-center" />
    </div>
  );
}
