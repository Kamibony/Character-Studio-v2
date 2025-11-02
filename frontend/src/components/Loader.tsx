
import React from 'react';

interface LoaderProps {
  fullScreen?: boolean;
  message?: string;
}

const Loader: React.FC<LoaderProps> = ({ fullScreen = false, message = 'Loading...' }) => {
  const loaderContent = (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
      <p className="text-lg text-gray-300">{message}</p>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-gray-900 bg-opacity-80 flex items-center justify-center z-50">
        {loaderContent}
      </div>
    );
  }

  return <div className="py-8 flex justify-center">{loaderContent}</div>;
};

export default Loader;
