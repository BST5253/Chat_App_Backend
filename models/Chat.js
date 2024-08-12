const { Schema, Types, models, model } = require("mongoose");

const ChatSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    groupChat: {
        type: Boolean,
        default: false
    },
    creator: {
        type: Types.ObjectId,
        ref: "User",
    },
    members: [{
        type: Types.ObjectId,
        ref: "User"
    }],
},
    {
        timestamps: true
    });

module.exports = models.Chat || model("Chat", ChatSchema);