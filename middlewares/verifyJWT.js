const jwt = require("jsonwebtoken");
const User = require("../models/User");

const verifyJWT = (req, res, next) => {

    const token = req.cookies["jwt-token"];

    if (!token) {
        return res.status(403).json({ message: "Token is required" });
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_TOKEN_SECRET);
        req.user = decoded._id;
        // console.log(decoded._id);
        next();
    } catch (error) {
        return res.status(401).json({ message: "Invalid token" });
    }
};

const verifyAdmin = (req, res, next) => {

    const token = req.cookies["admin-token"];

    if (!token) {
        return res.status(403).json({ message: "Admin token is required" });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_TOKEN_SECRET);
        const match = process.env.ADMIN_SECRET_KEY === decoded;
        if (!match) {
            return res.status(401).json({ message: "Invalid Admin token" });
        }
        next();
    } catch (error) {
        return res.status(401).json({ message: "Invalid Admin token" });
    }
};

const socketAuthenticator = async (err, socket, next) => {
    try {

        if (err) {
            return next(err);
        }

        const authToken = socket.request.cookies["jwt-token"];

        if (!authToken) {
            return next(new Error("Token is required for Socket Authentication"));
        }

        const decodedData = jwt.verify(authToken, process.env.JWT_TOKEN_SECRET);

        const user = await User.findById(decodedData._id);

        if (!user) {
            return next(new Error("User not found for Socket Authentication"));
        }

        socket.user = user;

        return next();

    } catch (err) {
        console.log(err);
        return next(new Error("Invalid token for Socket Authentication"));
    }
};

module.exports = { verifyJWT, verifyAdmin, socketAuthenticator };