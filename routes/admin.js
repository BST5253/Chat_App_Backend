const { Router } = require("express");
const {
    allUsers,
    allChats,
    allMessages,
    getDashboardStats,
    adminLogin,
    adminLogout,
    getAdminData
} = require("../controllers/AdminControllers");
const { adminLoginValidator } = require("../utils/validators");
const { verifyAdmin } = require("../middlewares/verifyJWT");
const router = Router();

router.post("/verify", adminLoginValidator, adminLogin)
    .get("/logout", adminLogout)
    .use(verifyAdmin)
    .get("/", getAdminData)
    .get("/users", allUsers)
    .get("/chats", allChats)
    .get("/messages", allMessages)
    .get("/stats", getDashboardStats);

module.exports = router;