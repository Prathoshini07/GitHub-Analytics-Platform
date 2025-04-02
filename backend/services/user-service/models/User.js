const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        githubId: { type: String, required: true, unique: true },
        username: { type: String, required: true, unique: true }, 
        name: { type: String, required: true }, 
        email: { type: String, required: false},
        avatarUrl: { type: String, required: true }, 
        bio: { type: String }, 
        createdAt: { type: Date, default: Date.now },
    },
    { timestamps: true, collection: "users" } 
);

const User = mongoose.model("User", userSchema);
module.exports = User;