import React, { useState } from 'react';

const DeployForm = ({ onDeploy }) => {
  const [formData, setFormData] = useState({
    name: '',
    file: null
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [deploymentInfo, setDeploymentInfo] = useState(null);

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
    setDeploymentInfo(null);

    if (!formData.name || !formData.file) {
      setError('Please provide both name and project file.');
      return;
    }

    setLoading(true);

    try {
      const result = await onDeploy(formData);
      setSuccess(`Application deployed successfully!`);
      setDeploymentInfo(result);
      setFormData({ name: '', file: null });
      e.target.reset();
    } catch (error) {
      setError(error.response?.data?.error || 'Deployment failed');
    }

    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Deploy Full-Stack Application</h2>

      {/* Supported Project Types */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-5">
        <h3 className="font-semibold text-blue-900 mb-3 flex items-center">
          <span className="text-2xl mr-2">🚀</span>
          Supported Project Types
        </h3>

        <div className="grid md:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="font-medium text-blue-800 mb-2">✅ Full-Stack Projects:</p>
            <ul className="text-blue-700 space-y-1 ml-4">
              <li>• MERN Stack (MongoDB, Express, React, Node)</li>
              <li>• Django + React/Vue</li>
              <li>• Flask + React/Vue</li>
              <li>• Node.js + Any Frontend Framework</li>
              <li>• Monorepo structures</li>
            </ul>
          </div>
          <div>
            <p className="font-medium text-blue-800 mb-2">✅ Backend-Only:</p>
            <ul className="text-blue-700 space-y-1 ml-4">
              <li>• Node.js / Express APIs</li>
              <li>• Django REST APIs</li>
              <li>• Flask APIs</li>
              <li>• Single .js files</li>
            </ul>
          </div>
        </div>

        {/* STRICT RULES */}
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-5 mt-5">
          <h3 className="font-semibold text-yellow-900 mb-3 flex items-center">
            <span className="text-2xl mr-2">⚠️</span>
            STRICT RULES (Read Before Uploading)
          </h3>

          <ul className="text-yellow-800 text-sm space-y-2 ml-2">

            <li>
              <strong>1️⃣ ZIP must NOT contain nested root folders.</strong><br />
              <span className="font-mono">
                ✔ project.zip → client/, server/ <br />
                ❌ project.zip → project/client/
              </span>
            </li>

            <li>
              <strong>2️⃣ Allowed frontend folder names only:</strong><br />
              <span className="font-mono">client, frontend, web, ui, app</span>
            </li>

            <li>
              <strong>3️⃣ Allowed backend folder names only:</strong><br />
              <span className="font-mono">server, backend, api</span>
            </li>

            <li>
              <strong>4️⃣ Frontend folder MUST contain:</strong>
              <pre className="bg-white p-2 rounded text-xs font-mono border">
package.json
src/
public/
              </pre>
            </li>

            <li>
              <strong>5️⃣ Backend MUST contain one of:</strong>
              <pre className="bg-white p-2 rounded text-xs font-mono border">
server.js
app.js
index.js
manage.py
app.py
              </pre>
              Python apps also require <span className="font-mono">requirements.txt</span>.
            </li>

            <li>
              <strong>6️⃣ Backend MUST listen on port 5000.</strong>
              <pre className="bg-white p-2 rounded text-xs font-mono border">
app.listen(5000, "0.0.0.0")
              </pre>
            </li>

            <li>
              <strong>7️⃣ Only ONE frontend and ONE backend folder allowed.</strong><br />
              No duplicates like <span className="font-mono">client2/</span> or <span className="font-mono">server-old/</span>.
            </li>

            <li>
              <strong>8️⃣ No deeply nested structures allowed:</strong><br />
              <span className="font-mono">
                ❌ src/client/ <br />
                ❌ app/server/core <br />
                ✔ client/ and server/ must be top-level
              </span>
            </li>

            <li>
              <strong>9️⃣ Root package.json allowed only in monorepo mode:</strong>
              <pre className="bg-white p-2 rounded text-xs font-mono border">
src/
public/
package.json
              </pre>
            </li>

            <li>
              <strong>🔟 Unsupported frameworks (will fail):</strong><br />
              <span className="font-mono text-red-600">
Next.js, Nuxt.js, Angular Universal, Astro, Remix, SvelteKit, Electron
              </span>
            </li>
          </ul>
        </div>

        {/* Example Structure Section */}
        <div className="mt-4 pt-4 border-t border-blue-200">
          <p className="font-medium text-blue-800 mb-2">📁 Common Project Structures:</p>
          <div className="grid md:grid-cols-3 gap-3 text-xs text-blue-700 font-mono bg-white rounded p-3">
            <div>
              <p className="font-bold mb-1">Separate Dirs:</p>
              <p>📦 project/</p>
              <p className="ml-2">├─ client/</p>
              <p className="ml-2">└─ server/</p>
            </div>
            <div>
              <p className="font-bold mb-1">Alternative:</p>
              <p>📦 project/</p>
              <p className="ml-2">├─ frontend/</p>
              <p className="ml-2">└─ backend/</p>
            </div>
            <div>
              <p className="font-bold mb-1">Monorepo:</p>
              <p>📦 project/</p>
              <p className="ml-2">├─ src/</p>
              <p className="ml-2">├─ public/</p>
              <p className="ml-2">└─ package.json</p>
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          ❌ {error}
        </div>
      )}

      {/* Success Message */}
      {success && deploymentInfo && (
        <div className="bg-green-50 border-2 border-green-300 rounded-lg p-5 space-y-3">
          <div className="flex items-start">
            <span className="text-3xl mr-3">✅</span>
            <div className="flex-1">
              <p className="font-semibold text-green-800 text-lg mb-2">{success}</p>
              <div className="bg-white rounded-md p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Access URL:</span>
                  <a
                    href={deploymentInfo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-600 hover:text-indigo-800 font-semibold hover:underline"
                  >
                    {deploymentInfo.url} →
                  </a>
                </div>

                {deploymentInfo.projectType && (
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">Project Type:</span>
                    <span className="text-gray-900 font-mono bg-gray-100 px-2 py-1 rounded">
                      {deploymentInfo.projectType}
                    </span>
                  </div>
                )}

                {deploymentInfo.stack && (
                  <div className="flex justify-between">
                    <span className="font-medium text-gray-700">Stack:</span>
                    <span className="text-gray-900">
                      {deploymentInfo.stack.server && `Backend: ${deploymentInfo.stack.server}`}
                      {deploymentInfo.stack.client && ` | Frontend: ${deploymentInfo.stack.client}`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Application Name
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="my-fullstack-app"
            required
            className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Project (.js or .zip)
          </label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-indigo-400">
            <input
              type="file"
              accept=".js,.zip"
              onChange={handleFileChange}
              required
              className="w-full"
            />
            <p className="text-sm text-gray-500 mt-2">
              Upload a single .js file or a .zip containing your full project
            </p>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white py-4 px-6 rounded-lg hover:opacity-90 shadow-lg disabled:opacity-60"
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" strokeWidth="4" fill="none"/>
                <path className="opacity-75" d="M4 12a8 8 0 018-8V0"/>
              </svg>
              Deploying Your Application...
            </span>
          ) : (
            '🚀 Deploy Application'
          )}
        </button>
      </form>

      {/* Examples */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold text-gray-800 mb-2">Sample MERN Structure:</h3>
          <pre className="bg-gray-800 text-gray-200 p-3 rounded-md overflow-x-auto text-xs font-mono">
{`📦 mern-app.zip
├─ client/
│  ├─ package.json
│  ├─ src/
│  └─ public/
└─ server/
   ├─ package.json
   ├─ server.js
   └─ models/`}
          </pre>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold text-gray-800 mb-2">Sample Express API:</h3>
          <pre className="bg-gray-800 text-gray-200 p-3 rounded-md overflow-x-auto text-xs font-mono">
{`const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.json({
    message: 'API Running!',
    timestamp: new Date(),
  });
});

app.listen(5000, "0.0.0.0");`}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default DeployForm;
