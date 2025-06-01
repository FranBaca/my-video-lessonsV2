"use client";

import { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";

interface LoginFormProps {
  onSuccess: (studentName: string, subjects: string[]) => void;
}

export default function LoginForm({ onSuccess }: LoginFormProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Validar formato del código
  const validateCode = (code: string) => {
    // El código debe tener al menos 3 caracteres y solo letras, números y guiones
    const codeRegex = /^[A-Z0-9-]{3,}$/;
    return codeRegex.test(code);
  };

  // Verificar sesión al montar el componente
  useEffect(() => {
    const checkSession = async () => {
      const deviceId = localStorage.getItem("deviceId");
      const storedCode = localStorage.getItem("studentCode");

      if (deviceId && storedCode) {
        try {
          setLoading(true);
          // Verificar con el servidor con timeout
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos timeout

          const response = await fetch("/api/auth/verify", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ code: storedCode, deviceId }),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          const data = await response.json();

          if (response.ok) {
            onSuccess(data.student.name, data.student.subjects);
          } else {
            setError(data.message || "Error al verificar la sesión");
          }
        } catch (error: any) {
          console.error("Error al verificar sesión:", error);
          if (error.name === "AbortError") {
            setError(
              "La verificación está tomando demasiado tiempo. Por favor, intenta nuevamente."
            );
          } else {
            setError(
              "Error al verificar la sesión. Por favor, intenta nuevamente."
            );
          }
          // No borramos el localStorage en caso de error de conexión
        } finally {
          setLoading(false);
        }
      }
    };

    checkSession();
  }, [onSuccess]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Validar formato del código
      if (!validateCode(code)) {
        throw new Error(
          "El código debe contener solo letras, números y guiones, y tener al menos 3 caracteres."
        );
      }

      // Verificar si ya existe un dispositivo registrado
      const deviceId = localStorage.getItem("deviceId");
      const storedCode = localStorage.getItem("studentCode");

      // Si ya existe un dispositivo registrado, verificar que coincida
      if (deviceId && storedCode) {
        if (storedCode !== code) {
          throw new Error(
            "Este dispositivo ya está registrado con otro código de estudiante. Por favor, utiliza el código correcto o contacta al administrador si necesitas cambiar de dispositivo."
          );
        }
      }

      // Generar nuevo deviceId si no existe
      const newDeviceId = deviceId || uuidv4();

      // Enviar código y deviceId al servidor con timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 segundos timeout

      const response = await fetch("/api/auth/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code, deviceId: newDeviceId }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        // Solo borramos si el servidor nos dice que el código no es válido
        if (response.status === 403) {
          localStorage.removeItem("deviceId");
          localStorage.removeItem("studentCode");
          localStorage.removeItem("lastLogin");
        }
        throw new Error(data.message || "Error al verificar el código");
      }

      // Si todo está bien, guardar en localStorage
      localStorage.setItem("deviceId", newDeviceId);
      localStorage.setItem("studentCode", code);
      localStorage.setItem("lastLogin", new Date().toISOString());

      // Llamar al callback de éxito
      onSuccess(data.student.name, data.student.subjects);
    } catch (error: any) {
      if (error.name === "AbortError") {
        setError(
          "La verificación está tomando demasiado tiempo. Por favor, intenta nuevamente."
        );
      } else {
        setError(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex text-black items-center justify-center bg-gray-100 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6 bg-white p-6 sm:p-8 rounded-xl shadow-lg">
        <div>
          <h2 className="text-center text-2xl sm:text-3xl font-bold text-gray-800">
            Acceso a Video Lecciones
          </h2>
          <p className="mt-3 text-center text-base text-gray-700">
            Ingresa tu código de acceso para ver las clases
          </p>
        </div>
        <form className="mt-6 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="code"
              className="block text-base font-medium text-gray-800"
            >
              Código de acceso
            </label>
            <div className="mt-2">
              <input
                id="code"
                name="code"
                type="text"
                required
                className="appearance-none block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base"
                placeholder="Ingresa tu código de acceso"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                disabled={loading}
                autoComplete="off"
                autoFocus
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-red-500"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-base text-red-800 font-medium">{error}</p>
                </div>
              </div>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-base font-medium text-white transition-colors duration-200 ${
                loading
                  ? "bg-gray-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              }`}
            >
              {loading ? (
                <>
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
                  <span className="text-base">Verificando...</span>
                </>
              ) : (
                <span className="text-base">Ingresar</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
