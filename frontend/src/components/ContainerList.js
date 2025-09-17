import React from 'react';

const ContainerList = ({ containers, onStop }) => {
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const getTimeRemaining = (expiresAt) => {
    const now = new Date();
    const expiry = new Date(expiresAt);
    const diff = expiry - now;
    
    if (diff <= 0) return 'Expired';
    
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m remaining`;
    }
    return `${minutes}m remaining`;
  };

  if (containers.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">🐳</div>
        <h3 className="text-xl font-semibold text-gray-600 mb-2">
          No containers deployed
        </h3>
        <p className="text-gray-500">
          Deploy your first Node.js application to get started!
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      {containers.map((container) => (
        <div key={container._id} className="border border-gray-200 rounded-lg p-6 bg-gray-50 hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-xl font-semibold text-gray-800">
              {container.name}
            </h3>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              container.status === 'running' 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              {container.status}
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="font-medium text-gray-600">Port:</span>
                <span className="text-gray-800">{container.port}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-600">URL:</span>
                <a 
                  href={`http://localhost:${container.port}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:text-indigo-800 hover:underline"
                >
                  http://localhost:{container.port}
                </a>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="font-medium text-gray-600">Created:</span>
                <span className="text-gray-800 text-sm">
                  {formatDate(container.createdAt)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-600">Expires:</span>
                <span className="text-orange-600 font-medium text-sm">
                  {getTimeRemaining(container.expiresAt)}
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end">
            <button 
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              onClick={() => onStop(container._id)}
            >
              Stop Container
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ContainerList;