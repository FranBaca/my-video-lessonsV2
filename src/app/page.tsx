import dynamic from 'next/dynamic';

// Dynamically import the client component with SSR disabled
const ClientHomePage = dynamic(() => import('./components/ClientHomePage'), {
  ssr: false, // This prevents server-side rendering
  loading: () => (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-6 text-lg text-gray-700 font-medium">Cargando aplicación...</p>
        <p className="mt-2 text-sm text-gray-500">Preparando tu experiencia</p>
      </div>
    </div>
  )
});

export default function Home() {
  return <ClientHomePage />;
}
