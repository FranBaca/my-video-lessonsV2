import { useState, useRef, useEffect } from 'react';

/**
 * Reusable SearchBar component with search icon and clear functionality
 * 
 * Features:
 * - Search icon on the left
 * - Clear button (X) on the right when there's text
 * - Consistent styling with the rest of the app
 * - Accessibility support with ARIA labels
 * - Focus management
 */
interface SearchBarProps {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  className?: string;
}

export default function SearchBar({ 
  placeholder, 
  value, 
  onChange, 
  onClear,
  className = ""
}: SearchBarProps) {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClear = () => {
    onChange('');
    onClear?.();
    inputRef.current?.focus();
  };

  return (
    <div className={`relative ${className}`}>
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <svg 
          className="h-5 w-5 text-gray-400" 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={2} 
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" 
          />
        </svg>
      </div>
      
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-sm"
        placeholder={placeholder}
        aria-label={placeholder}
      />
      
      {value && (
        <div className="absolute inset-y-0 right-0 flex items-center">
          <button
            type="button"
            onClick={handleClear}
            className="h-full px-3 text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600"
            aria-label="Limpiar búsqueda"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}
