const User = require("../models/User");
const jwt = require("jsonwebtoken");
const { uploadFilesToCloudinary } = require("../utils/features");

const cookieOptions = {
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: "none",
    httpOnly: true,
    secure: true
};

const newUser = async (req, res) => {
    try {
        const file = req.file;
        if (!file) {
            return res.status(400).json({ "message": "Please upload avatar" });
        }
        const results = await uploadFilesToCloudinary([file]);
        const { name, bio, username, password } = req.body;
        const avatar = {
            public_id: results[0].public_id,
            url: results[0].url
        };
        const duplicate = await User.findOne({ username }).exec();
        if (duplicate) {
            return res.status(409).json({ success: false, "message": `User with username ${username} already exists` });
        }
        const user = await User.create({ name, bio, username, password, avatar });
        const jwtToken = jwt.sign({ _id: user._id }, process.env.JWT_TOKEN_SECRET);

        return res.status(201)
            .cookie("jwt-token", jwtToken, cookieOptions)
            .json({ success: true, user, message: `Welcome, ${user.name}` });

    } catch (err) {
        return res.json(err.message);
    }
};

module.exports = { newUser };