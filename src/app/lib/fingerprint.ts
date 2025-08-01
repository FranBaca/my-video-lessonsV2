/**
 * Biblioteca para generar y gestionar huellas digitales de navegador (fingerprints)
 * para identificar de manera más segura los dispositivos de los usuarios.
 */

import { v4 as uuidv4 } from "uuid";

/**
 * Genera una huella digital basada en características del navegador y el dispositivo
 * @returns Promise<string> - La huella digital generada
 */
export async function generateFingerprint(): Promise<string> {
  // Solo ejecutar en el cliente
  if (typeof window === "undefined") {
    return uuidv4(); // Fallback para ejecución en servidor
  }

  try {
    // Recopilar información del navegador
    const userAgent = navigator.userAgent;
    const language = navigator.language;
    const colorDepth = window.screen.colorDepth;
    const pixelRatio = window.devicePixelRatio || 1;
    const screenWidth = window.screen.width;
    const screenHeight = window.screen.height;
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const touchSupport = "ontouchstart" in window ? "yes" : "no";
    const cpuCores = navigator.hardwareConcurrency || 0;

    // Información sobre plugins (limitada por seguridad en navegadores modernos)
    const plugins = Array.from(navigator.plugins || [])
      .map((plugin) => plugin.name)
      .join(",");

    // Obtener información de WebGL
    let webglInfo = "no-webgl";
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (gl && gl instanceof WebGLRenderingContext) {
      const renderer = gl.getParameter(gl.RENDERER);
      const vendor = gl.getParameter(gl.VENDOR);
      webglInfo = `${vendor}-${renderer}`;
    }

    // Comprobar soporte de características específicas
    const hasLocalStorage = !!window.localStorage;
    const hasSessionStorage = !!window.sessionStorage;
    const hasCookies = navigator.cookieEnabled;

    // Combinar toda la información en una cadena
    const components = [
      userAgent,
      language,
      colorDepth,
      pixelRatio,
      screenWidth,
      screenHeight,
      timeZone,
      touchSupport,
      cpuCores,
      plugins,
      webglInfo,
      hasLocalStorage,
      hasSessionStorage,
      hasCookies,
    ].join("###");

    // Generar un hash simple de la cadena
    // En producción, se podría usar una función hash más robusta
    let hash = 0;
    for (let i = 0; i < components.length; i++) {
      const char = components.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convertir a entero de 32 bits
    }

    // Combinar con un UUID para mayor unicidad
    const uniqueId = `${hash.toString(16)}-${uuidv4()}`;

    return uniqueId;
  } catch (error) {
    // Fallback a UUID si algo falla
    return uuidv4();
  }
}

/**
 * Obtiene o genera un fingerprint y lo almacena
 * @returns Promise<string> - El fingerprint obtenido o generado
 */
export async function getOrCreateFingerprint(): Promise<string> {
  // Solo ejecutar en el cliente
  if (typeof window === "undefined") {
    return uuidv4(); // Fallback para ejecución en servidor
  }

  try {
    // Intentar obtener el fingerprint existente
    let fingerprint = localStorage.getItem("browser_fingerprint");

    // Si no existe, generar uno nuevo
    if (!fingerprint) {
      fingerprint = await generateFingerprint();
      localStorage.setItem("browser_fingerprint", fingerprint);
    }

    return fingerprint;
  } catch (error) {
    return uuidv4();
  }
}

/**
 * Verifica si el fingerprint actual coincide con el almacenado
 * @returns Promise<boolean> - true si coincide, false si no
 */
export async function verifyFingerprint(): Promise<boolean> {
  // Solo ejecutar en el cliente
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const storedFingerprint = localStorage.getItem("browser_fingerprint");
    if (!storedFingerprint) return false;

    // Extraer la parte del hash (antes del guión)
    const storedHash = storedFingerprint.split("-")[0];

    // Generar un nuevo fingerprint y comparar solo la parte del hash
    const currentFingerprint = await generateFingerprint();
    const currentHash = currentFingerprint.split("-")[0];

    // Comparar los hashes
    return storedHash === currentHash;
  } catch (error) {
    return false;
  }
}
