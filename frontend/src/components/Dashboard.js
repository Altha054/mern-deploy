import React, { useState, useEffect } from 'react';
import ContainerList from './ContainerList';
import DeployForm from './DeployForm';
import api from '../utils/api';

const Dashboard = () => {
  const [containers, setContainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('containers');

  useEffect(() => {
    fetchContainers();
  }, []);

  const fetchContainers = async () => {
    try {
      const response = await api.get('/containers');
      setContainers(response.data);
    } catch (error) {
      console.error('Error fetching containers:', error);
    }
    setLoading(false);
  };

  const handleDeploy = async (deployData) => {
    const formData = new FormData();
    formData.append('name', deployData.name);
    formData.append('code', deployData.file);

    try {
      const response = await api.post('/containers/deploy', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      // Refresh containers list
      fetchContainers();
      
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  const handleStop = async (containerId) => {
    try {
      await api.delete(`/containers/${containerId}`);
      fetchContainers();
    } catch (error) {
      console.error('Error stopping container:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="text-lg text-gray-600">Loading containers...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-xl overflow-hidden">
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6">
        <h1 className="text-3xl font-bold mb-4">Container Dashboard</h1>
        <div className="flex space-x-4">
          <button 
            className={`px-4 py-2 rounded-md border border-white border-opacity-30 transition-colors ${
              activeTab === 'containers' 
                ? 'bg-white bg-opacity-30' 
                : 'bg-white bg-opacity-20 hover:bg-opacity-30'
            }`}
            onClick={() => setActiveTab('containers')}
          >
            My Containers ({containers.length})
          </button>
          <button 
            className={`px-4 py-2 rounded-md border border-white border-opacity-30 transition-colors ${
              activeTab === 'deploy' 
                ? 'bg-white bg-opacity-30' 
                : 'bg-white bg-opacity-20 hover:bg-opacity-30'
            }`}
            onClick={() => setActiveTab('deploy')}
          >
            Deploy New App
          </button>
        </div>
      </div>

      <div className="p-6">
        {activeTab === 'containers' ? (
          <ContainerList containers={containers} onStop={handleStop} />
        ) : (
          <DeployForm onDeploy={handleDeploy} />
        )}
      </div>
    </div>
  );
};

export default Dashboard;