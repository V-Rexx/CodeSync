const express = require('express');
const router = express.Router();

const {
    createRoom,
    getRooms,
    getRoom,
    deleteRoom
} = require('../controllers/room.controller');

const protect = require('../middleware/auth.middleware');

router.use(protect);

router.post('/', createRoom);
router.get('/', getRooms);
router.get('/:id', getRoom);
router.delete('/:id', deleteRoom);

module.exports = router;