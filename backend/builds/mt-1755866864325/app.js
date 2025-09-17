const express = require('express');
const app = express();
const PORT = 3000;

// Middleware to parse JSON bodies
app.use(express.json());

// A simple GET endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    message: "Hello from a Dockerized Node.js app!",
    status: "running",
    timestamp: new Date().toISOString()
  });
});

// An endpoint that accepts a POST request
app.post('/data', (req, res) => {
  const { name } = req.body;
  res.status(200).json({
    message: `Received data for: ${name || 'N/A'}`,
    data: req.body
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});