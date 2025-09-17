// services/containerService.js - IMPROVED VERSION

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
  docker = new Docker({ host: '127.0.0.1', port: 2375 });
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

// 🚀 SMART ENTRY POINT DETECTION
async function detectEntryPoint(buildContextDir) {
  const packageJsonPath = path.join(buildContextDir, 'package.json');
  
  try {
    // First, check if package.json exists and has a "main" field
    const packageJson = JSON.parse(await fsp.readFile(packageJsonPath, 'utf8'));
    if (packageJson.main) {
      const mainFile = packageJson.main;
      const mainFilePath = path.join(buildContextDir, mainFile);
      
      if (await fsp.access(mainFilePath).then(() => true).catch(() => false)) {
        console.log(`Found main entry point from package.json: ${mainFile}`);
        return mainFile;
      }
    }
  } catch (error) {
    console.log('No package.json or invalid JSON, trying common entry points...');
  }
  
  // Fallback: Look for common Node.js entry point files in order of preference
  const commonEntryPoints = [
    'index.js',
    'server.js', 
    'app.js',
    'main.js',
    'src/index.js',
    'src/server.js',
    'src/app.js'
  ];
  
  for (const entryPoint of commonEntryPoints) {
    const entryPointPath = path.join(buildContextDir, entryPoint);
    try {
      await fsp.access(entryPointPath);
      console.log(`Found entry point: ${entryPoint}`);
      return entryPoint;
    } catch (error) {
      // File doesn't exist, continue to next
    }
  }
  
  // Last resort: Look for any .js file in root directory
  try {
    const files = await fsp.readdir(buildContextDir);
    const jsFiles = files.filter(file => 
      file.endsWith('.js') && 
      !file.startsWith('.') && 
      file !== 'webpack.config.js' && 
      file !== 'jest.config.js'
    );
    
    if (jsFiles.length > 0) {
      console.log(`Using first .js file found: ${jsFiles[0]}`);
      return jsFiles[0];
    }
  } catch (error) {
    console.error('Error reading directory:', error);
  }
  
  // If all else fails, default to index.js (will be created if needed)
  console.log('No entry point found, defaulting to index.js');
  return 'index.js';
}

// 🎯 SMART DOCKERFILE GENERATION
function createSmartDockerfile(entryPoint, hasPackageJson) {
  return `
FROM node:16-alpine
WORKDIR /app

# Copy package files first for better caching
${hasPackageJson ? 'COPY package*.json ./' : ''}
${hasPackageJson ? 'RUN npm install --only=production' : ''}

# Copy application code
COPY . .

# Expose port
EXPOSE 3000

# Start the application
CMD ["node", "${entryPoint}"]
  `.trim();
}

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
    let uploadedFileName = null;

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
      if(files.length==0){
        throw new Error("Uploaded zip is empty.Please upload a valid application");
      }

      if (files.length === 1 && (await fsp.lstat(path.join(tempDir, files[0]))).isDirectory()) {
        buildContextDir = path.join(tempDir, files[0]);
        console.log(`Found nested directory. Setting build context to: ${buildContextDir}`);
      }
      
    } else if (fileExtension === '.js') {
      console.log('Processing single JS file...');
      uploadedFileName = path.basename(file.originalname);
      
      // Copy with original filename instead of hardcoding index.js
      const targetPath = path.join(tempDir, uploadedFileName);
      await fs.createReadStream(file.path)
        .pipe(fs.createWriteStream(targetPath));
      
      console.log(`Single file saved as: ${uploadedFileName}`);
      buildContextDir = tempDir;
      
    } else {
      throw new Error("Unsupported file type. Please upload a .js or .zip file.");
    }
    
    // 🧠 SMART ENTRY POINT DETECTION
    let entryPoint;
    if (uploadedFileName) {
      // For single file uploads, use the uploaded filename
      entryPoint = uploadedFileName;
    } else {
      // For ZIP files, detect the best entry point
      entryPoint = await detectEntryPoint(buildContextDir);
      
      // If no suitable entry point found and it's supposed to be index.js, create a basic one
      if (entryPoint === 'index.js') {
        const indexPath = path.join(buildContextDir, 'index.js');
        const indexExists = await fsp.access(indexPath).then(() => true).catch(() => false);
        
        if (!indexExists) {
          // Create a basic index.js that might work
          const basicServer = `
const express = require('express');
const app = express();

app.get('/', (req, res) => {
  res.json({ 
    message: 'Hello from your deployed app!',
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(\`Server running on port \${PORT}\`);
});
          `.trim();
          
          await fsp.writeFile(indexPath, basicServer);
          console.log('Created basic index.js file');
        }
      }
    }
    
    // Check for package.json
    const packageJsonExists = await fsp.access(path.join(buildContextDir, 'package.json'))
      .then(() => true)
      .catch(() => false);
    
    // Create smart Dockerfile
    const dockerfile = createSmartDockerfile(entryPoint, packageJsonExists);
    await fsp.writeFile(path.join(buildContextDir, 'Dockerfile'), dockerfile);
    console.log(`Smart Dockerfile created with entry point: ${entryPoint}`);
    
    const buildDirContents = await fsp.readdir(buildContextDir);
    console.log(`Build context contents:`, buildDirContents);

    // Build Docker image
    const buildContextTar = tar.pack(buildContextDir);
    const imageName = `app-${name.toLowerCase()}-${Date.now()}`;
    console.log(`Building Docker image: ${imageName}`);

    const buildStream = await docker.image.build(buildContextTar, { t: imageName });

    await new Promise((resolve, reject) => {
      docker.modem.followProgress(buildStream, (err, res) => {
        if (err) {
          console.error('Docker build error:', err);
          return reject(err);
        }
        // Only log final result, not every progress step
        if (res && res.length > 0) {
          const lastStep = res[res.length - 1];
          if (lastStep.stream) {
            console.log('Build step:', lastStep.stream.trim());
          }
        }
        resolve(res);
      });
    });
    console.log('Docker image build successful.');

    // Create and start container
    const container = await docker.container.create({
      Image: imageName,
      ExposedPorts: { '3000/tcp': {} },
      HostConfig: {
        PortBindings: { '3000/tcp': [{ HostPort: containerPort.toString() }] },
        Memory: 128 * 1024 * 1024,
        CpuShares: 512
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
      entryPoint // Include this in response for debugging
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
    await dockerContainer.kill();
    await dockerContainer.remove();
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