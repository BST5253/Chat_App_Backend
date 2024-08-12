const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Chat = require("../models/Chat");
const Message = require("../models/Message");

const cookieOptions = {
    maxAge: 15 * 60 * 1000,
    sameSite: "none",
    httpOnly: true,
    secure: true
};

const adminLogin = async (req, res) => {
    try {
        const { secretKey } = req.body;
        const adminSecretKey = process.env.ADMIN_SECRET_KEY;
        const isMatch = secretKey === adminSecretKey;
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid Admin Secret Key"
            });
        }
        const token = jwt.sign(secretKey, process.env.JWT_TOKEN_SECRET);
        return res.status(200)
            .cookie("admin-token", token, cookieOptions)
            .json({
                success: true,
                message: "Admin Login Successful, Welcome BST!",
                token
            });

    } catch (e) {
        return res.status(500).json({
            success: false,
            message: e.message
        });
    }
};

const adminLogout = async (req, res) => {
    try {
        res.clearCookie("admin-token", { httpOnly: true, sameSite: "none", secure: true });
        return res.status(200).json({
            success: true,
            message: "Admin Logout Successful"
        });
    } catch (e) {
        return res.status(500).json({
            success: false,
            message: e.message
        });
    }
};

const getAdminData = async (req, res) => {
    return res.status(200).json({
        success: true,
        admin: true
    });
};

const allUsers = async (req, res) => {
    try {
        const users = await User.find();
        const transformedUsers = await Promise.all(
            users.map(async ({ name, username, avatar, _id }) => {
                const [groups, friends] = await Promise.all([
                    Chat.countDocuments({ groupChat: true, members: _id }),
                    Chat.countDocuments({ groupChat: false, members: _id })
                ]);
                return {
                    _id,
                    name,
                    username,
                    avatar,
                    groups,
                    friends
                };
            })
        );
        return res.status(200).json({
            success: true,
            users: transformedUsers
        });
    } catch (e) {
        res.status(500).json({
            message: e?.message
        });
    };
};

const allChats = async (req, res) => {
    try {
        const chats = await Chat.find({})
            .populate("members", "name avatar")
            .populate("creator", "name avatar");

        const transformedChats = await Promise.all(
            chats.map(async ({ _id, name, creator, members, groupChat }) => {
                const totalMessages = await Message.countDocuments({ chat: _id });
                return {
                    _id,
                    groupChat,
                    name,
                    avatar: members.slice(0, 3).map(({ avatar }) => avatar.url),
                    members: members.map(({ _id, name, avatar }) => ({
                        _id,
                        name,
                        avatar: avatar.url
                    })),
                    creator: {
                        name: creator?.name || "None",
                        avatar: creator?.avatar?.url || ""
                    },
                    totalMembers: members.length,
                    totalMessages
                };
            }));

        return res.status(200).json({
            success: true,
            chats: transformedChats
        });
    } catch (e) {
        return res.status(500).json({
            success: false,
            message: e?.message
        });
    }
};

const allMessages = async (req, res) => {
    try {
        const messages = await Message.find({})
            .populate("sender", "name avatar")
            .populate("chat", "groupChat");

        const transformedMessages = messages.map(
            ({ _id, attachments, chat, sender, content, createdAt }) =>
            ({
                _id,
                attachments,
                content,
                createdAt,
                chat: chat._id,
                groupChat: chat.groupChat,
                sender: {
                    _id: sender._id,
                    name: sender.name,
                    avatar: sender.avatar.url
                }

            })
        );
        return res.status(200).json({
            success: true,
            messages: transformedMessages,

        });
    } catch (e) {
        return res.status(500).json({
            success: true,
            message: e.message
        });
    }
};

const getDashboardStats = async (req, res) => {
    try {
        const [groupsCount, usersCount, messagesCount, totalChatsCount] =
            await Promise.all([
                Chat.countDocuments({ groupChat: true }),
                User.countDocuments(),
                Message.countDocuments(),
                Chat.countDocuments(),
            ]);

        const today = new Date();

        const last7Days = new Date();
        last7Days.setDate(last7Days.getDate() - 7);

        const last7DaysMessages = await Message.find({
            createdAt: {
                $gte: last7Days,
                $lte: today,
            },
        }).select("createdAt");

        const messages = new Array(7).fill(0);
        const dayInMilliseconds = 1000 * 60 * 60 * 24;

        last7DaysMessages.forEach((message) => {
            const indexApprox =
                (today.getTime() - message.createdAt.getTime()) / dayInMilliseconds;
            const index = Math.floor(indexApprox);

            messages[6 - index]++;
        });

        const stats = {
            groupsCount,
            usersCount,
            messagesCount,
            totalChatsCount,
            messagesChart: messages,
        };

        return res.status(200).json({
            success: true,
            stats,
        });

    } catch (e) {
        return res.status(500).json({
            success: false,
            message: e.message
        });
    }
};

module.exports = {
    adminLogin,
    adminLogout,
    getAdminData,
    allUsers,
    allChats,
    allMessages,
    getDashboardStats
};