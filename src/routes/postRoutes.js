const express = require('express');
const router = express.Router();
const multer = require('multer');
const postController = require('../controllers/postController');

const upload = multer({ storage: multer.memoryStorage() });

router.post('/create', postController.createGeneralPost);
router.get('/', postController.getGeneralPosts);
router.post('/image', upload.single('post_image'), postController.uploadPostImage);

// --- NEW ROUTES ---
router.post('/like', postController.updateLike);
router.get('/:postId/comments', postController.getComments);
router.post('/comments', postController.addComment);
router.delete('/:postId', postController.deleteGeneralPost);
router.put('/:postId', postController.updateGeneralPost);
module.exports = router;