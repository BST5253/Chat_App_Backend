const { Router } = require("express");
const { verifyJWT } = require("../middlewares/verifyJWT");
const {
    newGroupChat,
    getMyGroups,
    addMembers,
    removeMembers,
    leaveGroup,
    sendAttachments,
    getChatDetails,
    renameChat,
    deleteChat,
    getMessages
} = require("../controllers/chatControllers");
const {
    newGroupChatValidator,
    addMembersValidator,
    removeMembersValidator,
    sendAttachmentsValidator,
    renameChatValidator
} = require("../utils/validators");
const { getMyChats } = require("../controllers/chatControllers");
const { attachmentsUpload } = require("../middlewares/multer");
const router = Router();

router.use(verifyJWT)
    .post("/new-group-chat", newGroupChatValidator, newGroupChat)
    .get("/my-chats", getMyChats)
    .get("/my-group-chats", getMyGroups)
    .put("/add-member", addMembersValidator, addMembers)
    .put("/remove-member", removeMembersValidator, removeMembers)
    .delete("/leave/:id", leaveGroup)
    .post("/message", attachmentsUpload, sendAttachmentsValidator, sendAttachments)
    .get("/message/:id", getMessages)
    .route("/:id").get(getChatDetails).put(renameChatValidator, renameChat).delete(deleteChat);



module.exports = router;