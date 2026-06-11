const jwt = require('jsonwebtoken')
const User = require('../models/User')
const { generateAccessToken, generateRefreshToken } = require('../utils/tokens')

const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
};

const register = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const exists = await User.findOne({ $or: [{email}, {username}]});
        if(exists) return res.status(400).json({message: 'User already exists'});

        const user = await User.create({ username, email, password});

        const accessToken = generateAccessToken(user._id);
        const refreshToken = generateRefreshToken(user._id);

        res.cookie('refreshToken', refreshToken, cookieOptions);
        res.status(201).json({
            user: {id: user._id, username: user.username, email: user.email},
            accessToken,
        });

    } catch (error) {
        res.status(500).json({message: error.message});
    }
};

const login = async (req, res) => {
    try {
        const {email, password} = req.body;

        const user = await User.findOne({email}).select('+password');
        if(!user) return res.status(401).json({message: 'Invalid Credentials'});

        const isMatch = await user.matchPassword(password);
        if(!isMatch) return res.status(401).json({message: 'Invalid Credentials'});

        const accessToken = generateAccessToken(user._id);
        const refreshToken = generateRefreshToken(user._id);

        res.cookie('refreshToken', refreshToken, cookieOptions);
        res.json({
            user: {id: user._id, username: user.username, email: user.email},
            accessToken,
        });

    } catch (error) {
        res.status(500).json({message: error.message})
    }
};

const refresh = (req, res) => {
    try {
        const token = req.cookies.refreshToken;
        if(!token) return res.status(401).json({message: 'No refresh token'});

        const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
        const accessToken = generateAccessToken(decoded.id);

        res.json({accessToken});
    } catch (error) {
        res.status(401).json({message: 'Invalid refresh token'});
    }
}

const logout = (req, res) => {
    res.clearCookie('refreshToken');
    res.json({message: 'Logged Out'});
};

const getMe = (req, res) => {
    res.json({user: req.user});
}

module.exports = {register, login, refresh, logout, getMe};