import React, { useState } from 'react';

const DeployForm = ({ onDeploy }) => {
  const [formData, setFormData] = useState({
    name: '',
    file: null
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleFileChange = (e) => {
    setFormData({
      ...formData,
      file: e.target.files[0]
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.name || !formData.file) {
      setError('Please provide both name and code file');
      return;
    }

    setLoading(true);

    try {
      const result = await onDeploy(formData);
      setSuccess(`Application deployed successfully! Access it at: ${result.url}`);
      setFormData({ name: '', file: null });
      e.target.reset();
    } catch (error) {
      setError(error.response?.data?.error || 'Deployment failed');
    }

    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Deploy Node.js Application</h2>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-800 mb-2">Instructions:</h3>
        <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
          <li>Upload a single .js file or a .zip containing your Node.js app</li>
          <li>Your app should listen on port 3000</li>
          <li>If uploading a zip, include package.json for dependencies</li>
          <li>Container will auto-expire in 1 hour</li>
          <li>Memory limit: 128MB, CPU shares: 512</li>
        </ul>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Application Name
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="my-awesome-app"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Code File (.js or .zip)
          </label>
          <input
            type="file"
            accept=".js,.zip"
            onChange={handleFileChange}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-3 px-4 rounded-md hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-opacity disabled:opacity-60 disabled:cursor-not-allowed font-medium"
        >
          {loading ? 'Deploying...' : 'Deploy Application'}
        </button>
      </form>

      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="font-semibold text-gray-800 mb-2">Sample Node.js App:</h3>
        <pre className="bg-gray-800 text-gray-200 p-4 rounded-md overflow-x-auto text-sm leading-relaxed">
{`const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.json({ 
    message: 'Hello from Docker!',
    timestamp: new Date().toISOString()
  });
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});`}
        </pre>
      </div>
    </div>
  );
};

export default DeployForm;