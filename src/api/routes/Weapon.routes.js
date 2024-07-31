const express = require('express')
const router = express.Router()
const authMiddleware = require('../../middlewares/auth');
const { getInventory, editPrice, getItem } = require('../controllers/Weapon.controller');

router.get('/all', getInventory);
router.get('/:assetId', getItem);
router.post('/edit', [authMiddleware], editPrice);

module.exports = router;
