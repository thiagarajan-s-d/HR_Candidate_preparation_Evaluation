import React, { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Trash2, AlertCircle } from 'lucide-react';

interface VoiceInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const VoiceInput: React.FC<VoiceInputProps> = ({
  value,
  onChange,
  placeholder = "Type your answer here...",
  className = ""
}) => {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [error, setError] = useState<string>('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    // Check if speech recognition is supported
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setIsSupported(true);
      recognitionRef.current = new SpeechRecognition();
      
      const recognition = recognitionRef.current;
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setError(''); // Clear any previous errors
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        // Append the new transcript to existing value
        const newValue = value ? `${value} ${transcript}` : transcript;
        onChange(newValue);
        setError(''); // Clear any errors on successful recognition
      };

      recognition.onerror = (event) => {
        setIsListening(false);
        
        // Provide user-friendly error messages based on error type
        switch (event.error) {
          case 'aborted':
            // Don't show error for aborted - this is usually intentional
            break;
          case 'not-allowed':
            setError('Microphone access denied. Please allow microphone permissions and try again.');
            break;
          case 'no-speech':
            setError('No speech detected. Please try speaking again.');
            break;
          case 'audio-capture':
            setError('Microphone not found or not working. Please check your microphone.');
            break;
          case 'network':
            setError('Network error occurred. Please check your internet connection.');
            break;
          case 'service-not-allowed':
            setError('Speech recognition service not allowed. Please try again.');
            break;
          default:
            setError('Speech recognition failed. Please try again.');
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [value, onChange]);

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      try {
        setError(''); // Clear any previous errors
        recognitionRef.current.start();
      } catch (error) {
        setError('Failed to start voice recognition. Please try again.');
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  };

  const clearContent = () => {
    onChange('');
    setError(''); // Clear errors when clearing content
  };

  const handleMicClick = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const dismissError = () => {
    setError('');
  };

  return (
    <div className="relative">
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full h-32 px-4 py-3 pr-20 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none ${className}`}
        placeholder={placeholder}
      />
      
      {/* Voice and Clear Controls */}
      <div className="absolute right-2 top-2 flex flex-col space-y-2">
        {isSupported && (
          <button
            type="button"
            onClick={handleMicClick}
            disabled={!isSupported}
            className={`p-2 rounded-lg transition-all duration-200 ${
              isListening
                ? 'bg-red-100 text-red-600 hover:bg-red-200 animate-pulse'
                : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            title={isListening ? 'Stop recording' : 'Start voice input'}
          >
            {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </button>
        )}
        
        {value && (
          <button
            type="button"
            onClick={clearContent}
            className="p-2 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
            title="Clear content"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>
      
      {/* Error Message */}
      {error && (
        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-2">
          <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm text-red-800">{error}</p>
          </div>
          <button
            onClick={dismissError}
            className="text-red-600 hover:text-red-800 text-sm font-medium"
          >
            ×
          </button>
        </div>
      )}
      
      {/* Status Indicators */}
      <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center space-x-4">
          {isListening && (
            <div className="flex items-center space-x-2 text-red-600">
              <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse"></div>
              <span>Listening...</span>
            </div>
          )}
          
          {!isSupported && (
            <span className="text-amber-600">Voice input not supported in this browser</span>
          )}
        </div>
        
        <div className="text-gray-400">
          {value.length} characters
        </div>
      </div>
      
      {/* Instructions */}
      {isSupported && !error && (
        <div className="mt-2 text-xs text-gray-500 bg-gray-50 p-2 rounded">
          <p><strong>Voice Input:</strong> Click the microphone to start recording. Each recording will be added to your existing answer.</p>
          <p><strong>Tips:</strong> Speak clearly and pause between sentences. Use the clear button to start over.</p>
        </div>
      )}
    </div>
  );
};