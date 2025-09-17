const express = require('express');
const multer = require('multer');
const auth = require('../middleware/auth');
const containerService = require('../services/containerService');
const Container = require('../models/Container');

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

// Get user's containers
router.get('/', auth, async (req, res) => {
  try {
    const containers = await Container.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json(containers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Deploy application
router.post('/deploy', auth, upload.single('code'), async (req, res) => {
  try {
    const { name } = req.body;
    const file = req.file;

    if (!name || !file) {
      return res.status(400).json({ error: 'Name and code file are required' });
    }

    const result = await containerService.deployApplication({
      name,
      file,
      userId: req.user._id
    });

    res.json(result);
  } catch (error) {
    console.error('Deployment error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Stop container
router.delete('/:id', auth, async (req, res) => {
  try {
    const container = await Container.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!container) {
      return res.status(404).json({ error: 'Container not found' });
    }

    await containerService.stopContainer(container);
    res.json({ message: 'Container stopped successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
