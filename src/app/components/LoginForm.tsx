"use client";

import { useState } from "react";
import { Student } from "@/app/types";
import toast, { Toaster } from "react-hot-toast";

interface LoginFormProps {
  onLoginSuccess: (student: Student) => void;
}

export default function LoginForm({ onLoginSuccess }: LoginFormProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/validate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.message || "Error al validar el código");

        // Mostrar toast si el código ya ha sido utilizado en otro dispositivo
        if (data.isDeviceUsed) {
          toast.error(
            "Este código ya ha sido utilizado en otro dispositivo. Por razones de seguridad, cada código solo puede ser utilizado en un dispositivo.",
            {
              duration: 6000,
              style: {
                borderRadius: "10px",
                background: "#333",
                color: "#fff",
              },
            }
          );
        }

        return;
      }

      onLoginSuccess(data.student);
    } catch (err) {
      setError("Error al conectar con el servidor");
      console.error(err);
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

          {error && (
            <div className="text-red-500 text-sm text-center">{error}</div>
          )}

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300"
            >
              {isLoading ? "Validando..." : "Acceder"}
            </button>
          </div>
        </form>
      </div>
      <Toaster position="top-center" />
    </div>
  );
}
