const Room = require('../models/Room');

const createRoom = async (req, res) => {
    try {
        const {name} = req.body;
        if(!name) return res.status(400).json({message: 'Name is required'});

        const room = await Room.create({name, owner: req.user.id});
        res.status(201).json(room);

    } catch (error) {
        res.status(500).json({message: error.message});
    }
};


const getRooms = async (req, res) => {
    try {
        const rooms = await Room.find({owner: req.user.id}).sort({updatedAt: -1});
        res.json(rooms)
    } catch (error) {
        res.status(500).json({message: error.message});
    }
};

const getRoom = async(req, res) => {
    try {
        const room = await Room.findById(req.params.id).populate('owner', 'username');
        if(!room) return res.status(404).json({message: 'Room not found'});
        res.json(room);

    } catch (error) {
        res.status(500).json({message: error.message})
    }
}

const deleteRoom = async (req, res) => {
    try {
        const room = await Room.findById(req.params.id);
        if(!room) return res.status(404).json({message: 'Room not found'});

        if(room.owner.toString() !== req.user.id.toString()){
            return res.status(403).json({message: 'Not authorized'});
        }

        await room.deleteOne();
        res.json({message: 'Room deleted'});

    } catch (error) {
        res.status(500).json({message: error.message});
    }
}

module.exports = {createRoom, getRooms, getRoom, deleteRoom};