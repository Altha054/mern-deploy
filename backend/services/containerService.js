// services/containerService.js - FULL-STACK ENHANCED VERSION

const { Docker } = require('node-docker-api');
const fs = require('fs');
const fsp = require('fs').promises;
const path = require('path');
const unzipper = require('unzipper');
const tar = require('tar-fs');
const Container = require('../models/Container');

let docker;
if (process.platform === 'win32') {
  console.log('Detected Windows. Connecting to Docker via host.');
  docker = new Docker({ socketPath: '//./pipe/docker_engine' });
} else {
  console.log('Detected Linux/macOS. Connecting to Docker via socket.');
  docker = new Docker({ socketPath: '/var/run/docker.sock' });
}

let usedPorts = new Set();
const PORT_RANGE_START = 3001;
const PORT_RANGE_END = 4000;

function getAvailablePort() {
  for (let port = PORT_RANGE_START; port <= PORT_RANGE_END; port++) {
    if (!usedPorts.has(port)) {
      usedPorts.add(port);
      return port;
    }
  }
  throw new Error('No available ports');
}

function releasePort(port) {
  usedPorts.delete(port);
}

// 🔍 DETECT PROJECT STRUCTURE
async function detectProjectStructure(buildContextDir) {
  const structure = {
    type: 'unknown',
    hasClient: false,
    hasServer: false,
    clientDir: null,
    serverDir: null,
    clientType: null,
    serverType: null,
    clientPort: 3000,
    serverPort: 5000
  };

  const rootFiles = await fsp.readdir(buildContextDir);
  
  // Check for common full-stack patterns
  const commonClientDirs = ['client', 'frontend', 'web', 'ui', 'app'];
  const commonServerDirs = ['server', 'backend', 'api'];
  
  // Detect client directory
  for (const dir of commonClientDirs) {
    if (rootFiles.includes(dir)) {
      const dirPath = path.join(buildContextDir, dir);
      const stat = await fsp.lstat(dirPath);
      if (stat.isDirectory()) {
        structure.hasClient = true;
        structure.clientDir = dir;
        structure.clientType = await detectClientType(dirPath);
        break;
      }
    }
  }
  
  // Detect server directory
  for (const dir of commonServerDirs) {
    if (rootFiles.includes(dir)) {
      const dirPath = path.join(buildContextDir, dir);
      const stat = await fsp.lstat(dirPath);
      if (stat.isDirectory()) {
        structure.hasServer = true;
        structure.serverDir = dir;
        structure.serverType = await detectServerType(dirPath);
        break;
      }
    }
  }
  
  // If no separate dirs, check if root is a full-stack monorepo
  if (!structure.hasClient && !structure.hasServer) {
    const rootPackageJson = path.join(buildContextDir, 'package.json');
    const rootRequirementsTxt = path.join(buildContextDir, 'requirements.txt');
    const rootManagePy = path.join(buildContextDir, 'manage.py');
    
    // Check for MERN in root with public/src folders
    if (await fileExists(rootPackageJson)) {
      const hasPublic = rootFiles.includes('public');
      const hasSrc = rootFiles.includes('src');
      
      if (hasPublic && hasSrc) {
        // React/Vue/Angular in root
        structure.type = 'fullstack-monorepo';
        structure.hasClient = true;
        structure.hasServer = true;
        structure.clientDir = '.';
        structure.serverDir = '.';
        structure.clientType = 'react';
        structure.serverType = 'node';
      } else {
        // Pure Node.js backend
        structure.type = 'node-only';
        structure.hasServer = true;
        structure.serverDir = '.';
        structure.serverType = 'node';
      }
    } else if (await fileExists(rootRequirementsTxt) || await fileExists(rootManagePy)) {
      // Django/Flask
      structure.type = 'python-only';
      structure.hasServer = true;
      structure.serverDir = '.';
      structure.serverType = 'python';
    }
  } else if (structure.hasClient && structure.hasServer) {
    structure.type = 'fullstack-separate';
  } else if (structure.hasClient) {
    structure.type = 'client-only';
  } else if (structure.hasServer) {
    structure.type = 'server-only';
  }
  
  console.log('Detected project structure:', structure);
  return structure;
}

async function detectClientType(clientDir) {
  const packageJsonPath = path.join(clientDir, 'package.json');
  
  if (await fileExists(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(await fsp.readFile(packageJsonPath, 'utf8'));
      const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
      
      if (deps.react || deps['react-dom']) return 'react';
      if (deps.vue || deps['@vue/cli']) return 'vue';
      if (deps['@angular/core']) return 'angular';
      if (deps.svelte) return 'svelte';
      if (deps.next) return 'nextjs';
      
      return 'react'; // Default assumption
    } catch (err) {
      console.error('Error reading client package.json:', err);
    }
  }
  
  return 'static'; // HTML/CSS/JS
}

async function detectServerType(serverDir) {
  const hasPackageJson = await fileExists(path.join(serverDir, 'package.json'));
  const hasRequirements = await fileExists(path.join(serverDir, 'requirements.txt'));
  const hasManagePy = await fileExists(path.join(serverDir, 'manage.py'));
  const hasAppPy = await fileExists(path.join(serverDir, 'app.py'));
  
  if (hasManagePy) return 'django';
  if (hasAppPy && hasRequirements) return 'flask';
  if (hasPackageJson) return 'node';
  
  return 'node'; // Default
}

async function fileExists(filePath) {
  try {
    await fsp.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// 🐳 CREATE SMART DOCKERFILE FOR FULL-STACK
function createFullStackDockerfile(structure) {
  const { type, clientDir, serverDir, clientType, serverType } = structure;
  
  // MERN/MEAN/MEVN Stack (separate client/server directories)
  if (type === 'fullstack-separate') {
    if (serverType === 'node' && clientType === 'react') {
      return `
FROM node:16 AS client-build
WORKDIR /app/client
COPY ${clientDir}/package*.json ./
RUN npm install
COPY ${clientDir} ./
RUN npm run build

FROM node:16 
WORKDIR /app
COPY ${serverDir}/package*.json ./
RUN npm install --only=production
COPY ${serverDir} ./

# Copy client build to server's public directory
COPY --from=client-build /app/client/build ./public

EXPOSE 5000
CMD ["node", "server.js"]
      `.trim();
    }
    
    // Django + React
    if (serverType === 'django' && clientType === 'react') {
      return `
FROM node:16 AS client-build
WORKDIR /app/client
COPY ${clientDir}/package*.json ./
RUN npm install
COPY ${clientDir} ./
RUN npm run build

FROM python:3.9-slim
WORKDIR /app
COPY ${serverDir}/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY ${serverDir} ./

# Copy client build to Django static files
COPY --from=client-build /app/client/build ./static

EXPOSE 8000
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
      `.trim();
    }
    
    // Flask + Vue/React
    if (serverType === 'flask') {
      return `
FROM node:16 AS client-build
WORKDIR /app/client
COPY ${clientDir}/package*.json ./
RUN npm install
COPY ${clientDir} ./
RUN npm run build

FROM python:3.9-slim
WORKDIR /app
COPY ${serverDir}/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY ${serverDir} ./

COPY --from=client-build /app/client/build ./static

EXPOSE 5000
CMD ["python", "app.py"]
      `.trim();
    }
  }
  
  // Monorepo with both in root
  if (type === 'fullstack-monorepo') {
    return `
FROM node:16
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .

# Build frontend if build script exists
RUN npm run build || echo "No build script found"

EXPOSE 3000
CMD ["npm", "start"]
    `.trim();
  }
  
  // Node-only backend
  if (type === 'node-only' || (type === 'server-only' && serverType === 'node')) {
    const dir = serverDir === '.' ? '' : `${serverDir}/`;
    return `
FROM node:16
WORKDIR /app
COPY ${dir}package*.json ./
RUN npm install --only=production
COPY ${dir}. ./
EXPOSE 5000
CMD ["node", "server.js"]
    `.trim();
  }
  
  // Python-only backend
  if (type === 'python-only' || (type === 'server-only' && serverType === 'python')) {
    const dir = serverDir === '.' ? '' : `${serverDir}/`;
    return `
FROM python:3.9-slim
WORKDIR /app
COPY ${dir}requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY ${dir}. ./
EXPOSE 8000
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
    `.trim();
  }
  
  // Default fallback
  return `
FROM node:16
WORKDIR /app
COPY . .
RUN npm install --only=production || echo "No package.json found"
EXPOSE 3000
CMD ["node", "index.js"]
  `.trim();
}

// 🚀 MAIN DEPLOY FUNCTION
async function deployApplication({ name, file, userId }) {
  let containerPort = null;
  let createdContainer = null;
  const tempDir = path.join(__dirname, '..', 'builds', `${name}-${Date.now()}`);

  try {
    containerPort = getAvailablePort();
    console.log(`Assigned port: ${containerPort}`);

    await fsp.mkdir(tempDir, { recursive: true });
    console.log(`Created temporary directory: ${tempDir}`);

    let buildContextDir = tempDir;

    // Handle file upload
    const fileExtension = path.extname(file.originalname).toLowerCase();
    
    if (fileExtension === '.zip') {
      console.log('Processing uploaded ZIP file...');
      await fs.createReadStream(file.path)
        .pipe(unzipper.Extract({ path: tempDir }))
        .promise();
      console.log('ZIP file unzipped successfully.');

      // Check for nested directories
      const files = await fsp.readdir(tempDir);
      if (files.length === 0) {
        throw new Error("Uploaded zip is empty. Please upload a valid application");
      }

      if (files.length === 1 && (await fsp.lstat(path.join(tempDir, files[0]))).isDirectory()) {
        buildContextDir = path.join(tempDir, files[0]);
        console.log(`Found nested directory. Setting build context to: ${buildContextDir}`);
      }
      
    } else if (fileExtension === '.js') {
      console.log('Processing single JS file...');
      const uploadedFileName = path.basename(file.originalname);
      const targetPath = path.join(tempDir, uploadedFileName);
      await fs.createReadStream(file.path)
        .pipe(fs.createWriteStream(targetPath));
      
      console.log(`Single file saved as: ${uploadedFileName}`);
      buildContextDir = tempDir;
      
    } else {
      throw new Error("Unsupported file type. Please upload a .js or .zip file.");
    }
    
    // 🧠 DETECT PROJECT STRUCTURE
    const structure = await detectProjectStructure(buildContextDir);
    
    // Create smart Dockerfile based on structure
    const dockerfile = createFullStackDockerfile(structure);
    await fsp.writeFile(path.join(buildContextDir, 'Dockerfile'), dockerfile);
    console.log(`Smart Dockerfile created for ${structure.type} project`);
    
    // Determine exposed port based on project type
        const exposedPort =
      structure.serverType === 'django' ? 8000 :
      structure.serverType === 'flask' ? 5000 :
      structure.serverType === 'node' ? 5000 :
      3000;


    // Build Docker image
    const buildContextTar = tar.pack(buildContextDir);
    const imageName = `app-${name.toLowerCase()}-${Date.now()}`;
    console.log(`Building Docker image: ${imageName}`);

    const buildStream = await docker.image.build(buildContextTar, { t: imageName });

    await new Promise((resolve, reject) => {
  docker.modem.followProgress(
    buildStream,
    (err, res) => {
      if (err) return reject(err);
      resolve(res);
    },
    (event) => {
      if (event.stream) process.stdout.write(event.stream);
      if (event.error) process.stderr.write(event.error);
    }
  );
});


    // Create and start container
    const container = await docker.container.create({
      Image: imageName,
      ExposedPorts: { [`${exposedPort}/tcp`]: {} },
      HostConfig: {
        PortBindings: { [`${exposedPort}/tcp`]: [{ HostPort: containerPort.toString() }] },
        Memory: 512 * 1024 * 1024, // Increased to 512MB for full-stack
        CpuShares: 1024
      }
    });
    
    await container.start();
    createdContainer = container;
    console.log(`Container started with ID: ${container.id}`);

    // Save to database
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    const dbContainer = new Container({
      name,
      containerId: container.id,
      port: containerPort,
      userId,
      expiresAt
    });
    await dbContainer.save();
    console.log('Container details saved to database.');

    return {
      message: 'Application deployed successfully',
      container: dbContainer,
      url: `http://localhost:${containerPort}`,
      projectType: structure.type,
      stack: {
        client: structure.clientType,
        server: structure.serverType
      }
    };

  } catch (error) {
    console.error('Deployment failed. Performing cleanup...');
    if (containerPort) {
      releasePort(containerPort);
      console.log(`Released port ${containerPort}`);
    }
    if (createdContainer) {
      try {
        await createdContainer.kill({ force: true });
        await createdContainer.remove({ force: true });
        console.log(`Forcibly removed container ${createdContainer.id}`);
      } catch (cleanupError) {
        console.error('Failed to clean up Docker container:', cleanupError);
      }
    }
    throw error;
  } finally {
    // Cleanup
    if (file && file.path) {
      await fsp.unlink(file.path).catch(err => console.error("Failed to delete temp uploaded file:", err));
    }
    if (tempDir) {
      await fsp.rm(tempDir, { recursive: true, force: true }).catch(err => console.error("Failed to delete temp build directory:", err));
    }
    console.log('File system cleanup complete.');
  }
}

async function stopContainer(container) {
  try {
    const dockerContainer = docker.container.get(container.containerId);

    await dockerContainer.kill({ force: true });
    await dockerContainer.remove({ force: true });

    console.log(`Docker container ${container.containerId} stopped and removed.`);
  } catch (dockerError) {
    console.error('Docker cleanup error:', dockerError);
  }

  releasePort(container.port);
  await Container.findByIdAndDelete(container._id);
  console.log(`Container record ${container._id} removed from database.`);
}


function cleanupExpiredContainers() {
  setInterval(async () => {
    try {
      console.log('Running expired container cleanup job...');
      const expiredContainers = await Container.find({
        expiresAt: { $lt: new Date() }
      });

      for (const container of expiredContainers) {
        try {
          await stopContainer(container);
          console.log(`Cleaned up expired container: ${container.name}`);
        } catch (error) {
          console.error(`Error cleaning up container ${container.name}:`, error);
        }
      }
    } catch (error) {
      console.error('Cleanup job error:', error);
    }
  }, 10 * 60 * 1000);
}

module.exports = {
  deployApplication,
  stopContainer,
  cleanupExpiredContainers
};
