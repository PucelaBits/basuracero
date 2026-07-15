const express = require('express');
const { getPublicSettings } = require('../admin/settings');

const router = express.Router();

router.get('/', async (_req, res, next) => {
  try {
    res.setHeader('Cache-Control', 'no-store');
    res.json(await getPublicSettings());
  } catch (error) {
    next(error);
  }
});

module.exports = router;
