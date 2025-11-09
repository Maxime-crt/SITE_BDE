import { useState, useEffect, useRef } from 'react';
import { Check, X, Loader } from 'lucide-react';

interface AddressSuggestion {
  label: string;
  city: string;
  postcode: string;
  latitude?: number;
  longitude?: number;
}

interface AddressInputProps {
  value: string;
  onChange: (address: string, coordinates?: { lat: number; lng: number; city: string; postcode: string }) => void;
  label?: string;
  required?: boolean;
  error?: string;
  placeholder?: string;
  initiallyValidated?: boolean;
}

export default function AddressInput({
  value,
  onChange,
  label = 'Adresse',
  required = false,
  error,
  placeholder = 'Ex: 3 Rue de la Digue Verte, 59000 Lille',
  initiallyValidated = false
}: AddressInputProps) {
  const [addressValid, setAddressValid] = useState<boolean | null>(initiallyValidated ? true : null);
  const [addressValidating, setAddressValidating] = useState(false);
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [addressTimer, setAddressTimer] = useState<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Gérer le clic en dehors des suggestions
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Valider l'adresse via l'API gouvernementale
  const validateAddress = async (address: string) => {
    if (!address || address.length < 5) {
      setAddressValid(null);
      return;
    }

    setAddressValidating(true);

    try {
      const response = await fetch(
        `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(address)}&limit=5`
      );
      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const suggestions = data.features.map((feature: any) => {
          const [longitude, latitude] = feature.geometry.coordinates;
          return {
            label: feature.properties.label,
            city: feature.properties.city || '',
            postcode: feature.properties.postcode || '',
            latitude,
            longitude
          };
        });
        setAddressSuggestions(suggestions);
        setAddressValid(true);
        setShowSuggestions(true);
      } else {
        setAddressSuggestions([]);
        setAddressValid(false);
      }
    } catch (error) {
      console.error('Erreur validation adresse:', error);
      setAddressValid(null);
    } finally {
      setAddressValidating(false);
    }
  };

  // Gérer le changement de valeur
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    onChange(newValue); // Notifier le parent
    setAddressValid(null);
    setShowSuggestions(false);

    if (addressTimer) {
      clearTimeout(addressTimer);
    }

    const timer = setTimeout(() => {
      validateAddress(newValue);
    }, 500);

    setAddressTimer(timer);
  };

  // Sélectionner une suggestion
  const handleAddressSelect = (suggestion: AddressSuggestion) => {
    onChange(suggestion.label, {
      lat: suggestion.latitude!,
      lng: suggestion.longitude!,
      city: suggestion.city,
      postcode: suggestion.postcode
    });
    setAddressValid(true);
    setShowSuggestions(false);
    setAddressSuggestions([]);
  };

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {label}
        {required && <span className="text-red-500 dark:text-red-400 ml-1">*</span>}
      </label>

      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          className={`w-full px-4 py-3 rounded-lg border bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 ${
            error
              ? 'border-red-300 dark:border-red-700 focus:ring-red-500'
              : addressValid === true
              ? 'border-green-300 dark:border-green-700 focus:ring-green-500'
              : addressValid === false
              ? 'border-red-300 dark:border-red-700 focus:ring-red-500'
              : 'border-gray-300 dark:border-gray-600 focus:ring-blue-500 dark:focus:ring-blue-400'
          } focus:ring-2 focus:border-transparent transition pr-12`}
          required={required}
        />

        {/* Indicateur de validation */}
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          {addressValidating && (
            <Loader className="w-5 h-5 text-gray-400 animate-spin" />
          )}
          {!addressValidating && addressValid === true && (
            <Check className="w-5 h-5 text-green-500" />
          )}
          {!addressValidating && addressValid === false && (
            <X className="w-5 h-5 text-red-500" />
          )}
        </div>
      </div>

      {/* Suggestions */}
      {showSuggestions && addressSuggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-10 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto"
        >
          {addressSuggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleAddressSelect(suggestion)}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0 transition"
            >
              <div className="font-medium text-gray-900 dark:text-white">{suggestion.label}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {suggestion.city} {suggestion.postcode}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Message d'aide */}
      {addressValid === false && (
        <p className="mt-1 text-sm text-red-500 dark:text-red-400">
          Aucune adresse trouvée. Veuillez vérifier votre saisie.
        </p>
      )}

      {error && (
        <p className="mt-1 text-sm text-red-500 dark:text-red-400">{error}</p>
      )}

      {addressValid === true && !showSuggestions && (
        <p className="mt-1 text-sm text-green-600 dark:text-green-400">
          Adresse validée ✓
        </p>
      )}
    </div>
  );
}
