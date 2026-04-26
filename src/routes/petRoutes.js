const express = require('express');
const router = express.Router();
const petController = require('../controllers/petController');

router.post('/create', petController.createPetPost);
router.get('/', petController.getAllPets);

module.exports = router;