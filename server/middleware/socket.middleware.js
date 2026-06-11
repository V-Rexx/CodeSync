const jwt = require('jsonwebtoken');

const socketAuth = (socket, next) => {
    try {
        const token = socket.handshake.auth.token;
        if(!token) return next(new Error('No token provided'));

        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
        socket.data.user = {id: decoded.id};
        next();

    } catch (error) {
        next(new Error('Invalid token'));
    }
}

module.exports = socketAuth;