const User = require("../models/User");
const jwt = require("jsonwebtoken");
const { compare } = require("bcrypt");


const cookieOptions = {
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: "none",
    httpOnly: true,
    secure: true
};

const handleLogin = async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username }).select("+password").exec();
        if (!user) {
            return res.status(404).json({ success: false, message: `User with username ${username} not found` });
        }
        const match = await compare(password, user.password);
        if (!match) {
            return res.status(401).json({ success: false, message: "Invalid password" });
        }
        const jwtToken = jwt.sign({ _id: user._id }, process.env.JWT_TOKEN_SECRET);

        return res.status(200)
            .cookie("jwt-token", jwtToken, cookieOptions)
            .json({
                success: true,
                user,
                message: `Welcome Back, ${user.name}`
            });

    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
const handleLogout = (req, res) => {
    try {
        res.clearCookie("jwt-token", { httpOnly: true, sameSite: "none", secure: true });
        return res.status(200).json({ success: true, message: "Logged out successfully" });
    } catch (e) {
        return res.status(500).json({ success: false, message: e.message });
    }
};
module.exports = { handleLogin, handleLogout };