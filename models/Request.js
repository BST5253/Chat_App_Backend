const { Schema, Types, models, model } = require("mongoose");

const RequestSchema = new Schema({

    status: {
        type: String,
        required: true,
        default: "pending",
        enum: ["pending", "accepted", "rejected"]
    },
    sender: {
        type: Types.ObjectId,
        ref: "User",
        required: true
    },
    receiver: {
        type: Types.ObjectId,
        ref: "User",
        required: true
    }
}, {
    timestamps: true
});

module.exports = models.Request || model("Request", RequestSchema);