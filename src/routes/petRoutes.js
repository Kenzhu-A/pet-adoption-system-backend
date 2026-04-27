const express = require('express');
const router = express.Router();
const multer = require('multer');
const petController = require('../controllers/petController');

const upload = multer({ storage: multer.memoryStorage() });

router.post('/create', petController.createPetPost);
router.get('/', petController.getAllPets);

// --- NEW ROUTES ---
router.get('/my-pets/:userId', petController.getMyPets);
router.put('/status', petController.updatePetStatus);
router.post('/image', upload.single('pet_image'), petController.uploadPetImage);

module.exports = router;