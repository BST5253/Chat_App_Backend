const Chat = require("../models/Chat");
const User = require("../models/User");
const Message = require("../models/Message");
const { ALERT, REFETCH_CHATS, NEW_MESSAGE_ALERT, NEW_MESSAGE } = require("../constants/events");
const { emitEvent, deleteFilesFromCloudinary, uploadFilesToCloudinary } = require("../utils/features");
const { getOtherMember } = require("../utils/helpers");

const newGroupChat = async (req, res) => {
    const { name, members } = req.body;
    const allMembers = [...members, req.user];

    await Chat.create({
        name,
        groupChat: true,
        creator: req.user,
        members: allMembers
    });

    emitEvent(req, ALERT, allMembers, `Welcome to ${name} group`);
    emitEvent(req, REFETCH_CHATS, members);

    return res.status(201).json({ success: true, message: "Group chat created" });
};

const getMyChats = async (req, res) => {
    const chats = await Chat.find({ members: req.user }).populate("members", "name avatar");

    const transformedChats = chats.map(({ _id, name, members, groupChat }) => {
        const otherMember = getOtherMember(members, req.user);
        return {
            _id,
            groupChat,
            name: groupChat ? name : otherMember.name,
            avatar: groupChat ?
                members.slice(0, 3).map(({ avatar }) => avatar.url)
                : [otherMember.avatar.url],
            members: members.reduce((prev, curr) => {
                if (curr._id.toString() !== req.user.toString()) {
                    prev.push(curr._id);
                }
                return prev;
            }, []),
        };
    });
    return res
        .status(200)
        .json({
            success: true,
            chats: transformedChats
        });
};

const getMyGroups = async (req, res) => {
    const chats = await Chat.find({
        members: req.user,
        groupChat: true,
        creator: req.user
    }).populate("members", "name avatar");

    const groups = chats.map(({ _id, groupChat, name, members }) => ({
        _id,
        name,
        groupChat,
        avatar: members.slice(0, 3).map(({ avatar }) => avatar.url)
    }));

    return res.status(200).json({
        success: true,
        groups
    });
};

const addMembers = async (req, res) => {
    const { chatId, members } = req.body;
    const chat = await Chat.findById(chatId);

    if (!chat) {
        return res.status(404).json({ success: false, message: "Chat not found" });
    }

    if (!members || members.length === 0) {
        return res.status(400).json({ success: false, message: "Please provide members to add" });
    }

    if (!chat.groupChat) {
        return res.status(400).json({ success: false, message: "This is not a group chat" });
    }

    if (chat.creator.toString() !== req.user.toString()) {
        return res.status(403).json({ success: false, message: "You are not allowed to add members" });
    }

    const allNewMembersPromise = members.map((i) => User.findById(i, "name"));

    const allNewMembers = await Promise.all(allNewMembersPromise);

    const uniqueMembers = allNewMembers
        .filter((i) => !chat.members.includes(i._id.toString()))
        .map((i) => i._id);

    chat.members.push(...uniqueMembers);

    if (chat.members.length > 100) {
        return res.status(400).json({ success: false, message: "Group members limit reached" });
    }

    await chat.save();

    const allUsersName = allNewMembers.map(({ name }) => name).join(", ");

    emitEvent(req, ALERT, chat.members, {
        message: `${allUsersName} has been added in the group`,
        chatId
    });
    emitEvent(req, REFETCH_CHATS, chat.members);

    return res.status(200).json({
        success: true,
        message: "Members added successfully"
    });
};

const removeMembers = async (req, res) => {

    try {
        const { userId, chatId } = req.body;
        const [chat, userThatWillBeRemoved] = await Promise.all([
            Chat.findById(chatId),
            User.findById(userId, "name")
        ]);

        if (!chat) {
            return res.status(404).json({ success: false, message: "Chat not found" });
        }
        if (!chat.groupChat) {
            return res.status(400).json({ success: false, message: "This is not a group chat" });
        }
        if (chat.creator.toString() !== req.user.toString()) {
            return res.status(403).json({ success: false, message: "You are not allowed to remove members" });
        }
        if (chat.members.length <= 3) {
            return res.status(400).json({ success: false, message: "Group must have at least 3 members" });
        }

        const allChatMembers = chat.members.map((i) => i.toString());
        chat.members = chat.members.filter((i) => i.toString() !== userId.toString());
        await chat.save();
        emitEvent(req, ALERT, chat.members, {
            message: `${userThatWillBeRemoved.name} has been removed from the group`,
            chatId
        });

        emitEvent(req, REFETCH_CHATS, allChatMembers);

        return res
            .status(200)
            .json({
                success: true,
                message: "Member removed successfully"
            });

    } catch (e) {
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

const leaveGroup = async (req, res) => {
    try {
        const chatId = req.params.id;
        const chat = await Chat.findById(chatId);

        if (!chat) {
            return res.status(404).json({ success: false, message: "Chat not found" });
        }

        if (!chat.groupChat) {
            return res.status(400).json({ success: false, message: "This is not a group chat" });
        }

        const remainingMembers = chat.members.filter((member) => member.toString() !== req.user.toString());

        if (remainingMembers.length < 3) {
            return res.status(400).json({ success: false, message: "Group must have at least 3 members" });
        }

        if (chat.creator.toString() === req.user.toString()) {
            const randomElement = Math.floor(Math.random() * remainingMembers.length);
            const newCreator = remainingMembers[randomElement];
            chat.creator = newCreator;
        }

        chat.members = remainingMembers;

        const [user] = await Promise.all([
            User.findById(req.user, "name"),
            chat.save()
        ]);

        emitEvent(req, ALERT, chat.members, {
            chatId,
            message: `${user.name} has left the group`
        });

        return res
            .status(200)
            .json({
                success: true,
                message: "You have left the group"
            });

    } catch (e) {
        if (e.name === "CastError") {
            return res.status(500).json({ success: false, message: "Invalid chat id" });
        }
        return res.status(500).json({ success: false, message: "Internal server error" });
    }
};

const sendAttachments = async (req, res) => {

    try {
        const { chatId } = req.body;
        const files = req.files || [];

        if (files.length < 1) {
            return res
                .status(400)
                .json({
                    success: false,
                    message: "Please provide attachments"
                });
        }

        if (files.length > 5) {
            return res
                .status(400)
                .json({
                    success: false,
                    message: "Files can't be more than 5."
                });
        }

        const [chat, me] = await Promise.all([
            Chat.findById(chatId),
            User.findById(req.user, "name")
        ]);

        if (!chat) {
            return res.status(400).json({ success: false, message: "Chat not found." });
        }

        const attachments = await uploadFilesToCloudinary(files);

        const messageForDB = {
            content: "",
            attachments,
            sender: me._id,
            chat: chatId
        };
        const messageForRealTime = {
            ...messageForDB,
            sender: {
                _id: me._id,
                name: me.name
            }
        };

        const message = await Message.create(messageForDB);

        emitEvent(req, NEW_MESSAGE, chat.members, {
            message: messageForRealTime,
            chatId
        });

        emitEvent(req, NEW_MESSAGE_ALERT, chat.members, { chatId });

        return res
            .status(200)
            .json({
                success: true,
                message
            });

    } catch (e) {
        return res
            .status(500)
            .json({
                success: false,
                message: e.message
            });
    }
};

const getChatDetails = async (req, res) => {
    try {
        if (!req.params.id) {
            return res.status(400).json({ success: false, message: "Chat id is required" });
        }

        if (req.query.populate === "true") {
            const chatId = req.params.id;
            const chat = await Chat.findById(chatId)
                .populate("members", "name avatar")
                .select("-__v")
                .lean();

            if (!chat) {
                return res.status(404).json({ success: false, message: "Chat not found" });
            }


            chat.members = chat.members.map(({ _id, name, avatar }) => ({
                _id,
                name,
                avatar: avatar.url
            }));

            return res
                .status(200)
                .json({
                    success: true,
                    chat
                });

        } else {
            const chat = await Chat.findById(req.params.id).lean();

            if (!chat) {
                return res.status(404).json({ success: false, message: "Chat not found" });
            }


            return res
                .status(200)
                .json({
                    success: true,
                    chat
                });
        }
    } catch (e) {
        if (e.name === "CastError") {
            return res.status(500).json({ success: false, message: "Invalid chat id" });
        }
        return res.status(500).json({ success: false, message: e.message });
    }
};

const renameChat = async (req, res) => {
    const chatId = req.params.id;
    const { name } = req.body;

    const chat = await Chat.findById(chatId).populate("name");
    if (!chat) {
        return res.status(404).json({ success: false, message: "Chat not found" });
    }
    if (!chat.groupChat) {
        return res.status(400).json({ success: false, message: "This is not a group chat" });
    }
    if (chat.creator.toString() !== req.user.toString()) {
        return res.status(403).json({ success: false, message: "You are not allowed to rename the group" });
    }
    chat.name = name;
    await chat.save();
    emitEvent(req, ALERT, chat.members, { message: `Group chat renamed to ${name}`, chatId });
    return res.status(200).json({ success: true, message: "Group chat renamed" });

};

const deleteChat = async (req, res) => {
    try {
        const chatId = req.params.id;

        const chat = await Chat.findById(chatId);

        if (!chat) {
            return res.status(404).json({ success: false, message: "Chat not found" });
        }

        const members = chat.memebers;

        if (chat.groupChat && chat.creator.toString() !== req.user.toString()) {
            return res.status(403).json({ success: false, message: "You are not allowed to delete the group" });
        }

        if (!chat.groupChat && !chat.members.includes(req.user.toString())) {
            return res.status(403).json({ success: false, message: "You are not allowed to delete the chat" });
        }

        const messagesWithAttachments = await Message.find({
            chat: chatId,
            attachments: { $exists: true, $ne: [] }
        });

        const attachmentDetails = [];

        messagesWithAttachments.forEach(({ attachments }) => {
            attachments.forEach(({ public_id, resource_type }) => attachmentDetails.push({ public_id, resource_type }));
        });

        await Promise.all([
            deleteFilesFromCloudinary(attachmentDetails),
            chat.deleteOne(),
            Message.deleteMany({ chat: chatId })
        ]);

        emitEvent(req, REFETCH_CHATS, members);

        return res.status(200).json({
            success: true,
            message: "Chat deleted successfully"
        });

    } catch (e) {
        if (e.name === "CastError") {
            return res.status(500).json({ success: false, message: "Invalid chat id" });
        }
        return res.status(500).json({ success: false, message: e.message });
    }
};



const getMessages = async (req, res) => {
    try {
        const chatId = req.params.id;
        const { page = 1 } = req.query;
        const resultPerPage = 20;
        const skip = (page - 1) * resultPerPage;

        const chat = await Chat.findById(chatId);

        if (!chat) {
            return res.status(404).json({ success: false, message: "Chat not found" });
        }

        if (!chat.members.includes(req.user.toString())) {
            return res
                .status(403)
                .json({
                    success: false,
                    message: "You are not allowed to view the messages or may be you've been removed from the group"
                });
        }

        const [messages, totalMessageCount] = await Promise.all([
            Message.find({ chat: chatId })
                .sort({ createdAt: -1 })
                .populate("sender", "name")
                .select("-__v")
                .skip(skip)
                .limit(resultPerPage)
                .lean(),
            Message.countDocuments({ chat: chatId })
        ]);

        const totalPages = Math.ceil(totalMessageCount / resultPerPage) || 0;

        return res.status(200).json({
            success: true,
            messages: messages.reverse(),
            totalPages
        });
    } catch (e) {
        if (e.name === "CastError") {
            return res.status(500).json({ success: false, message: "Invalid chat id" });
        }
        return res.status(500).json({ success: false, message: e.message });
    }
};

module.exports = {
    newGroupChat,
    getMyChats,
    getMyGroups,
    addMembers,
    removeMembers,
    leaveGroup,
    sendAttachments,
    getChatDetails,
    renameChat,
    deleteChat,
    getMessages
};