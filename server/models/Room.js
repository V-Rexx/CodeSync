const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema(
    {
        name:{
            type: String,
            required: true,
            trim: true,
        },
        owner:{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        code:{
            type: String,
            default: 'javascript',
        },
        version:{
            type: Number,
            default: 0,
        },
    },
    {timestamps: true}
);

module.exports = mongoose.model('Room', roomSchema);