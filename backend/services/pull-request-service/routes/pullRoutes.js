const express = require("express");
const axios = require("axios");
const PullRequest = require("../models/PullRequest");

const router = express.Router();

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const githubApi = axios.create({
  baseURL: "https://api.github.com",
  headers: GITHUB_TOKEN ? { Authorization: `token ${GITHUB_TOKEN}` } : {},
});

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
const syncingUsers = new Set();

const fetchGitHubUserId = async (username) => {
  const response = await githubApi.get(`/users/${username}`);
  return response.data.id.toString();
};

const fetchUserRepos = async (username) => {
  let allRepos = [], page = 1;
  while (true) {
    const response = await githubApi.get(`/users/${username}/repos`, { params: { per_page: 100, page } });
    if (response.data.length === 0) break;
    allRepos = allRepos.concat(response.data);
    page++;
    await delay(500);
  }
  return allRepos;
};

const fetchRepoPullRequests = async (username, repoName, userGithubId) => {
  let allPRs = [], page = 1;
  while (true) {
    try {
      const response = await githubApi.get(`/repos/${username}/${repoName}/pulls?state=all&per_page=100&page=${page}`);
      if (response.data.length === 0) break;
      allPRs = allPRs.concat(response.data.filter(pr => pr.user.id.toString() === userGithubId));
      page++;
      await delay(1000);
    } catch (err) {
      if (err.response?.status === 403 || err.message.includes("ETIMEDOUT")) {
        await delay(5000);
        continue;
      }
      break;
    }
  }
  return allPRs;
};

const processPullRequests = async (prsPage, repoId, userGithubId) => {
  const prUpdates = prsPage.map(pr => ({
    updateOne: {
      filter: { prId: pr.id.toString() },
      update: {
        $set: {
          prId: pr.id.toString(),
          number: pr.number,
          repository: repoId,
          author: userGithubId,
          title: pr.title,
          state: pr.state === "open" ? "open" : pr.merged_at ? "merged" : "closed",
          createdAt: new Date(pr.created_at),
          updatedAt: pr.updated_at ? new Date(pr.updated_at) : null,
          closedAt: pr.closed_at ? new Date(pr.closed_at) : null,
        },
      },
      upsert: true,
    },
  }));
  await PullRequest.bulkWrite(prUpdates);
};

router.post("/sync/:username", async (req, res) => {
  const { username } = req.params;
  if (syncingUsers.has(username)) {
    return res.status(409).json({ message: `Sync already in progress for ${username}` });
  }
  syncingUsers.add(username);

  try {
    console.log(`Starting PR sync for ${username}`);
    const userGithubId = await fetchGitHubUserId(username);
    const allRepos = await fetchUserRepos(username);
    
    let totalPRsSynced = 0;
    for (const repo of allRepos) {
      const repoPRs = await fetchRepoPullRequests(username, repo.name, userGithubId);
      await processPullRequests(repoPRs, repo.id.toString(), userGithubId);
      totalPRsSynced += repoPRs.length;
    }

    console.log(`Finished syncing ${totalPRsSynced} PRs for ${username}`);
    res.json({ message: `Synced ${totalPRsSynced} PRs`, totalPRs: totalPRsSynced });
  } catch (err) {
    console.error("Error syncing PRs:", err.message);
    res.status(500).json({ error: err.message });
  } finally {
    syncingUsers.delete(username);
  }
});

module.exports = router;
