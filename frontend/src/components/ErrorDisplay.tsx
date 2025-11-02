
import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface ErrorDisplayProps {
  message: string;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ message }) => {
  return (
    <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-md relative flex items-center" role="alert">
      <AlertTriangle className="w-5 h-5 mr-3 text-red-400" />
      <div>
        <strong className="font-bold">Error: </strong>
        <span className="block sm:inline">{message}</span>
      </div>
    </div>
  );
};

export default ErrorDisplay;
