const express = require('express');
const { getPublicSettings } = require('../admin/settings');

const router = express.Router();

router.get('/', async (_req, res, next) => {
  try {
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      ...(await getPublicSettings()),
      CARTO_API_KEY: String(process.env.CARTO_API_KEY || process.env.VITE_CARTO_API_KEY || '').trim()
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
