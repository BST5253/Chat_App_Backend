const { Router } = require("express");
const router = Router();
const { newUser } = require("../controllers/registerController");
const { handleLogin, handleLogout } = require("../controllers/loginController");
const { singleAvatar } = require("../middlewares/multer");
const {
    validateUser,
    validateLogin,
    sendFriendRequestValidator,
    acceptFriendRequestValidator
} = require("../utils/validators");
const { verifyJWT } = require("../middlewares/verifyJWT");
const {
    getMyProfile,
    searchUser,
    sendFriendRequest,
    acceptFriendRequest,
    getMyNotifications,
    getMyFriends
} = require("../controllers/UserControllers");

router.post("/new", singleAvatar, validateUser, newUser)
    .post("/login", validateLogin, handleLogin)
    .use(verifyJWT)
    .get("/me", getMyProfile)
    .get("/search", searchUser)
    .get("/logout", handleLogout)
    .put("/send-friend-request", sendFriendRequestValidator, sendFriendRequest)
    .put("/accept-friend-request", acceptFriendRequestValidator, acceptFriendRequest)
    .get("/notifications", getMyNotifications)
    .get("/my-friends", getMyFriends);

module.exports = router;