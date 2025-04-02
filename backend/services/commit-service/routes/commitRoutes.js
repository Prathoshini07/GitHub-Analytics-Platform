const express = require("express");
const axios = require("axios");
const Commit = require("../models/Commit");

const router = express.Router();
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

const githubApi = axios.create({
  baseURL: "https://api.github.com",
  headers: GITHUB_TOKEN ? { Authorization: `token ${GITHUB_TOKEN}` } : {},
});

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const syncingUsers = new Set();

const fetchGitHubUser = async (username) => {
  const { data } = await githubApi.get(`/users/${username}`);
  return data.id.toString();
};

const fetchUserRepos = async (username) => {
  let allRepos = [];
  let page = 1;
  while (true) {
    const { data: reposPage } = await githubApi.get(`/users/${username}/repos`, { params: { per_page: 100, page } });
    if (reposPage.length === 0) break;
    allRepos.push(...reposPage);
    page++;
    await delay(500);
  }
  return allRepos;
};

const syncCommitsForRepo = async (username, repo, userGithubId) => {
  let totalCommitsSynced = 0;
  let commitPage = 1;
  while (true) {
    try {
      const { data: commitsPage } = await githubApi.get(`/repos/${username}/${repo.name}/commits`, {
        params: { author: username, per_page: 100, page: commitPage },
      });
      if (commitsPage.length === 0) break;

      const commitPromises = commitsPage.map((commit) => {
        const commitData = {
          sha: commit.sha,
          repository: repo.id.toString(),
          author: userGithubId,
          message: commit.commit.message,
          date: commit.commit.author.date,
        };
        return Commit.updateOne({ sha: commit.sha }, { $set: commitData }, { upsert: true });
      });

      await Promise.all(commitPromises);
      totalCommitsSynced += commitsPage.length;
      commitPage++;
      await delay(1000);
    } catch (err) {
      console.error(`Error syncing commits for ${repo.name}: ${err.message}`);
      if (err.message.includes("ETIMEDOUT")) await delay(5000);
      else break;
    }
  }
  return totalCommitsSynced;
};

router.post("/sync/:username", async (req, res) => {
  const { username } = req.params;
  if (syncingUsers.has(username)) {
    return res.status(409).json({ message: `Sync already in progress for ${username}` });
  }
  syncingUsers.add(username);

  try {
    console.log(`Starting full commit sync for ${username}`);
    const userGithubId = await fetchGitHubUser(username);
    const allRepos = await fetchUserRepos(username);

    const syncPromises = allRepos.map((repo) => syncCommitsForRepo(username, repo, userGithubId));
    const totalCommitsSynced = (await Promise.all(syncPromises)).reduce((acc, val) => acc + val, 0);

    console.log(`Finished syncing ${totalCommitsSynced} commits for ${username}`);
    res.json({ message: `Synced ${totalCommitsSynced} commits`, totalCommits: totalCommitsSynced });
  } catch (err) {
    console.error("Error syncing commits:", err.message);
    res.status(500).json({ error: err.message });
  } finally {
    syncingUsers.delete(username);
  }
});

module.exports = router;