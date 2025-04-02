const mongoose = require("mongoose");

const pullRequestSchema = new mongoose.Schema(
  {
    prId: { type: String, required: true, unique: true },
    number: { type: Number, required: true }, 
    repository: { type: String, required: true }, 
    author: { type: String, required: true }, 
    title: { type: String, required: true },
    state: { type: String, required: true }, 
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date },
    closedAt: { type: Date },
  },
  { timestamps: true, collection: "pullRequests" }
);

const PullRequest = mongoose.model("PullRequest", pullRequestSchema);
module.exports = PullRequest;