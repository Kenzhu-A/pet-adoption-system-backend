// [SAVED-PETS] saved pets routes
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/savedPetController');

router.post('/', ctrl.savePet);
router.get('/:userId', ctrl.getSavedPets);
router.delete('/:userId/:petId', ctrl.unsavePet);

module.exports = router;
