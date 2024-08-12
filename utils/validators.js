const { check, validationResult, body, param } = require('express-validator');
const { ObjectId } = require('mongodb');

const validateUser = [
    body('name')
        .not()
        .isEmpty()
        .withMessage('Name is required'),
    body('bio')
        .not()
        .isEmpty()
        .withMessage('Bio is required'),
    body('username')
        .not()
        .isEmpty()
        .withMessage('Username is required')
        .isLength({ min: 5 })
        .withMessage('Username must be at least 5 characters long'),
    body('password')
        .not()
        .isEmpty()
        .withMessage('Password is required')
        // .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters long'),
    (req, res, next) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, message: errors.array().map((error) => error.msg).join(", ") });
        }
        next();
    },
];
const validateLogin = [
    check('username')
        .not()
        .isEmpty()
        .withMessage('Username is required'),
    check('password')
        .not()
        .isEmpty()
        .withMessage('Password is required'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, message: errors.array().map((error) => error.msg).join(", ") });
        }
        next();
    },
];

const newGroupChatValidator = [
    check('name')
        .not()
        .isEmpty()
        .withMessage('Group name is required'),
    check('members')
        .not()
        .isEmpty()
        .withMessage('Members are required')
        .isArray({ min: 2, max: 100 })
        .withMessage('Members must be 2-100'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, message: errors.array().map((error) => error.msg).join(", ") });
        }
        next();
    },
];
const addMembersValidator = [
    check('members')
        .not()
        .isEmpty()
        .isArray({ min: 1, max: 97 })
        .withMessage('Members are required and must be in between 1-100'),
    check("chatId")
        .not()
        .isEmpty()
        .withMessage("Chat ID is required")
        .custom((value) => ObjectId.isValid(value))
        .withMessage("Invalid Chat ID"),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, message: errors.array().map((error) => error.msg).join(", ") });
        }
        next();
    },
];


const removeMembersValidator = [
    check("userId")
        .not()
        .isEmpty()
        .withMessage("User ID is required"),
    check("chatId")
        .not()
        .isEmpty()
        .withMessage("Chat ID is required")
        .custom((value) => ObjectId.isValid(value))
        .withMessage("Invalid Chat ID"),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, message: errors.array().map((error) => error.msg).join(", ") });
        }
        next();
    },
];

const sendAttachmentsValidator = [
    check("chatId")
        .not()
        .isEmpty()
        .withMessage("Chat ID is required")
        .custom((value) => ObjectId.isValid(value))
        .withMessage("Invalid Chat ID"),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, message: errors.array().map((error) => error.msg).join(", ") });
        }
        next();
    },
];

const renameChatValidator = [
    check("name")
        .not()
        .isEmpty()
        .withMessage("Name is required"),
    param("id")
        .not()
        .isEmpty()
        .custom((value) => ObjectId.isValid(value))
        .withMessage("Invalid Chat ID"),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, message: errors.array().map((error) => error.msg).join(", ") });
        }
        next();
    },
];

const sendFriendRequestValidator = [
    check("userId")
        .not()
        .isEmpty()
        .withMessage("User ID is required"),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, message: errors.array().map((error) => error.msg).join(", ") });
        }
        next();
    },
];

const acceptFriendRequestValidator = [
    check("requestId")
        .not()
        .isEmpty()
        .withMessage("Request ID is required"),
    body("accept")
        .not()
        .isEmpty()
        .withMessage("Accept is required")
        .isBoolean()
        .withMessage("Accept must be a boolean"),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, message: errors.array().map((error) => error.msg).join(", ") });
        }
        next();
    }
];

const adminLoginValidator = [
    body("secretKey")
        .not()
        .isEmpty()
        .withMessage("SecretKey is required"),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, message: errors.array().map((error) => error.msg).join(", ") });
        }
        next();
    }
];

module.exports = {
    validateUser,
    validateLogin,
    newGroupChatValidator,
    addMembersValidator,
    removeMembersValidator,
    sendAttachmentsValidator,
    renameChatValidator,
    sendFriendRequestValidator,
    acceptFriendRequestValidator,
    adminLoginValidator
};