require("dotenv").config();
const express = require("express");
const { createServer } = require("http");
const { mongoose } = require("mongoose");
const { Server } = require("socket.io");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const { v4: uuid } = require("uuid");
const { dbConn } = require("./configs/dbConn");
const { NEW_MESSAGE, NEW_MESSAGE_ALERT, START_TYPING, STOP_TYPING, CHAT_JOINED, ONLINE_USERS, CHAT_LEAVED } = require("./constants/events");
const { getSockets } = require("./utils/helpers");
const Message = require("./models/Message");
const { v2: cloudinary } = require("cloudinary");
const { corsOptions } = require("./constants/config");
const { socketAuthenticator } = require("./middlewares/verifyJWT");
const { userSocketIDs } = require("./utils/helpers");



const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 3000;

const io = new Server(server, {
    cors: corsOptions
});
const onlineUsers = new Set();


dbConn();


cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});


app.set("io", io);
app.use(cors(corsOptions));

app.use(express.urlencoded({ extended: false }));

app.use(express.json());
app.use(cookieParser());


app.get("/", (req, res) => {
    res.send("Hello World");
});

app.use("/user", require("./routes/user"));
app.use("/chat", require("./routes/chat"));
app.use("/admin", require("./routes/admin"));

io.use((socket, next) => {
    cookieParser()(
        socket.request,
        socket.request.res,
        async (err) => await socketAuthenticator(err, socket, next)
    );
});

io.on("connection", (socket) => {
    const user = socket.user;

    userSocketIDs.set(user._id.toString(), socket.id);

    socket.on(NEW_MESSAGE, async ({ chatId, members, message }) => {
        const messageForRealTime = {
            content: message,
            _id: uuid(),
            sender: {
                _id: user._id,
                name: user.name,
            },
            chat: chatId,
            createdAt: new Date().toISOString(),
        };

        const messageForDB = {
            content: message,
            sender: user._id,
            chat: chatId,
        };

        const membersSocket = getSockets(members);
        io.to(membersSocket).emit(NEW_MESSAGE, {
            chatId,
            message: messageForRealTime,
        });

        io.to(membersSocket).emit(NEW_MESSAGE_ALERT, { chatId });

        try {
            await Message.create(messageForDB);
        } catch (error) {
            throw new Error(error);
        }
    });

    socket.on(START_TYPING, ({ chatId, members }) => {
        const membersSocket = getSockets(members);
        socket.to(membersSocket).emit(START_TYPING, { chatId });
    });

    socket.on(STOP_TYPING, ({ chatId, members }) => {
        const membersSocket = getSockets(members);
        socket.to(membersSocket).emit(STOP_TYPING, { chatId });
    });

    socket.on(CHAT_JOINED, ({ userId, members }) => {
        onlineUsers.add(userId.toString());

        const membersSocket = getSockets(members);
        io.to(membersSocket).emit(ONLINE_USERS, Array.from(onlineUsers));
    });

    socket.on(CHAT_LEAVED, ({ userId, members }) => {
        onlineUsers.delete(userId.toString());

        const membersSocket = getSockets(members);
        io.to(membersSocket).emit(ONLINE_USERS, Array.from(onlineUsers));
    });

    socket.on("disconnect", () => {
        userSocketIDs.delete(user._id.toString());
        onlineUsers.delete(user._id.toString());
        socket.broadcast.emit(ONLINE_USERS, Array.from(onlineUsers));
    });
});

mongoose.connection.on("open", () => {
    console.log("Connected to MongoDB");
    server.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
});
