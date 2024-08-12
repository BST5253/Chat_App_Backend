const { NEW_REQUEST, REFETCH_CHATS } = require("../constants/events");
const Chat = require("../models/Chat");
const User = require("../models/User");
const Request = require("../models/Request");
const { emitEvent } = require("../utils/features");
const { getOtherMember } = require("../utils/helpers");

const getMyProfile = async (req, res) => {
    const user = await User.findById(req.user);

    return res.status(200).json({
        success: true,
        user
    });
};
const searchUser = async (req, res) => {
    const { name = "" } = req.query;

    // Finding All my chats
    const myChats = await Chat.find({ groupChat: false, members: req.user });

    //  extracting All Users from my chats means friends or people I have chatted with
    const allUsersFromMyChats = myChats.flatMap((chat) => chat.members);

    // Finding all users except me and my friends
    const allUsersExceptMeAndFriends = await User.find({
        _id: { $nin: [...allUsersFromMyChats, req.user] },
        name: { $regex: name, $options: "i", },
    });


    // Modifying the response
    const users = allUsersExceptMeAndFriends.map(({ _id, name, avatar }) => ({
        _id,
        name,
        avatar: avatar.url,
    }));

    return res.status(200).json({
        success: true,
        users,
    });
};

const sendFriendRequest = async (req, res) => {
    try {
        const { userId } = req.body;
        const request = await Request.findOne({
            $or: [
                { sender: req.user, receiver: userId },
                { sender: userId, receiver: req.user }
            ]
        });

        if (request) {
            return res.status(400).json({
                success: false,
                message: "Request already sent"
            });
        }

        await Request.create({
            sender: req.user,
            receiver: userId
        });

        emitEvent(req, NEW_REQUEST, [userId]);

        return res.status(200).json({
            success: true,
            message: "Friend Request Sent"
        });


    } catch (e) {
        return res.status(500).json({
            success: false,
            message: e.message
        });
    }
};

const acceptFriendRequest = async (req, res) => {
    try {
        const { requestId, accept } = req.body;
        const request = await Request.findById(requestId)
            .populate("sender", "name")
            .populate("receiver", "name");

        if (!request) {
            return res.status(404).json({
                success: false,
                message: "Request not found"
            });
        }
        if (request.receiver._id.toString() !== req.user.toString()) {
            return res.status(403).json({
                success: false,
                message: "You are not authorized to accept this request"
            });
        }

        if (!accept) {
            await request.deleteOne();
            return res.status(200).json({
                success: true,
                message: "Friend Request Rejected"
            });
        }

        const members = [request.sender._id, request.receiver._id];

        await Promise.all([
            Chat.create({
                members,
                name: `${request.sender.name}-${request.receiver.name}`
            }),
            request.deleteOne()
        ]);

        emitEvent(req, REFETCH_CHATS, members);

        return res.status(200).json({
            success: true,
            message: "Friend Request Accepted",
            senderId: request.sender._id,
        });

    } catch (e) {
        return res.status(400).json({
            success: false,
            message: e.message
        });
    }
};

const getMyNotifications = async (req, res) => {
    try {
        const requests = await Request.find({ receiver: req.user })
            .populate("sender", "name avatar");

        const allRequest = requests.map(({ _id, sender }) => ({
            _id,
            sender: {
                _id: sender._id,
                name: sender.name,
                avatar: sender.avatar.url
            }
        }));

        return res.status(200).json({
            success: true,
            requests: allRequest
        });

    } catch (e) {
        return res.status(500).json({
            success: false,
            message: e.message
        });
    }
};

const getMyFriends = async (req, res) => {
    try {
        const chatId = req.query.chatId;
        const chats = await Chat.find({
            members: req.user,
            groupChat: false
        }).populate("members", "name avatar");

        const friends = chats.map(({ members }) => {
            const otherUser = getOtherMember(members, req.user);
            return {
                _id: otherUser._id,
                name: otherUser.name,
                avatar: otherUser.avatar.url
            };
        });

        if (chatId) {
            const chat = await Chat.findById(chatId);
            const availableFriends = friends.filter(
                (friend) => !chat.members.includes(friend._id)
            );
            return res.status(200).json({
                success: true,
                friends: availableFriends
            });
        } else {
            return res.status(200).json({
                success: true,
                friends
            });
        }

    } catch (e) {
        return res.status(500).json({
            success: false,
            message: e.message
        });
    }
};

module.exports = {
    getMyProfile,
    searchUser,
    sendFriendRequest,
    acceptFriendRequest,
    getMyNotifications,
    getMyFriends
};