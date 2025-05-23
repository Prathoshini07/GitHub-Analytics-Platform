const express = require("express");
const axios = require("axios");
const User = require("../models/User");

require("dotenv").config();

const router = express.Router();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || "YOUR_GITHUB_TOKEN_HERE";
const githubApi = axios.create({
  baseURL: "https://api.github.com",
  headers: {
    Authorization: `Bearer ${GITHUB_TOKEN}`,
    Accept: "application/vnd.github.v3+json",
  },
});

router.get("/", async (req, res) => {
  try {
    const users = await User.find();
    console.log("Fetched Users:", users);
    res.json(users);
  } catch (err) {
    console.error("Error fetching users:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get("/:username", async (req, res) => {
  try {
    const { username } = req.params;
    console.log(`Incoming Request: GET /users/${username}`);

    let user = await User.findOne({ username });
    if (user) {
      console.log("Found User in DB:", user);
      res.json(user);
    } else {
      console.log(`User ${username} not found in DB, fetching from GitHub`);
      
      const githubResponse = await githubApi.get(`/users/${username}`);
      const githubUser = githubResponse.data;

      console.log("GitHub User Data:", githubUser);

      const userData = {
        username: githubUser.login,
        githubId: githubUser.id.toString(),
        name: githubUser.name || githubUser.login, 
        email: githubUser.email || null, 
        bio: githubUser.bio || "No bio available",
        avatarUrl: githubUser.avatar_url, 
      };

      console.log("Mapped User Data:", userData);

      user = new User(userData);
      await user.save();
      console.log("Saved User to DB:", user);

      res.json(user);
    }
  } catch (err) {
    console.error("Error fetching user:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const userData = req.body;
    const requiredFields = ["username", "githubId", "name", "avatarUrl"];
    for (const field of requiredFields) {
      if (!userData[field]) {
        return res.status(400).json({ error: `${field} is required` });
      }
    }

    const user = new User(userData);
    await user.save();
    console.log("Saved User:", user);
    res.status(201).json(user);
  } catch (err) {
    console.error("Error saving user:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;