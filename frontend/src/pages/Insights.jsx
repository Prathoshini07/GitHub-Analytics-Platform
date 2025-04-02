import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getUser, getRepos, getCommitsTotal, syncCommits, getPRsTotal, syncPRs } from '../services/api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

function Insights() {
  const { username } = useParams();
  const [user, setUser] = useState(null);
  const [repos, setRepos] = useState([]);
  const [totalCommits, setTotalCommits] = useState(null);
  const [totalPRs, setTotalPRs] = useState(null);
  const [error, setError] = useState(null);
  const [syncingCommits, setSyncingCommits] = useState(false);
  const [syncingPRs, setSyncingPRs] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [userResponse, reposResponse, commitsResponse, prsResponse] = await Promise.all([
          getUser(username),
          getRepos(username),
          getCommitsTotal(username),
          getPRsTotal(username),
        ]);
        setUser(userResponse.data || {});
        setRepos(reposResponse.data || []);
        setTotalCommits(commitsResponse.data?.totalCommits || 0);
        setTotalPRs(prsResponse.data?.totalPRs || 0);
      } catch (err) {
        console.error("Fetch Error:", err);
        setError(err.message || "Failed to load data");
      }
    };
    fetchData();
  }, [username]);

  const handleSync = async (type) => {
    if (type === 'commits') {
      setSyncingCommits(true);
    } else {
      setSyncingPRs(true);
    }
    try {
      const syncResponse = type === 'commits' ? await syncCommits(username) : await syncPRs(username);
      if (type === 'commits') {
        setTotalCommits(syncResponse.data.totalCommits || totalCommits);
      } else {
        setTotalPRs(syncResponse.data.totalPRs || totalPRs);
      }
    } catch (err) {
      setError(err.message || `Failed to sync ${type}`);
    } finally {
      if (type === 'commits') {
        setSyncingCommits(false);
      } else {
        setSyncingPRs(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background p-6 w-full dark">
      <h1 className="text-3xl text-foreground mb-12 font text-left">Insights for {username}</h1>
      {error && <p className="text-destructive mb-4">Error: {error}</p>}
      {user ? (
        <>
          <Card className="w-full max-w-2xl mx-auto bg-card text-card-foreground border-border mt-6">
            <CardHeader>
              <div className="flex items-center space-x-4">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt={`${username}'s profile`} className="w-16 h-16 rounded-full" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                    No Photo
                  </div>
                )}
                <CardTitle className="text-foreground">{user.username || username}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-foreground mb-4">{user.bio || 'No bio available'}</p>
              <div className="space-y-4">
                <p className="text-muted-foreground">Repositories: {repos.length} total</p>
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground">
                    Commits: {totalCommits !== null ? totalCommits : 'Loading...'}
                  </p>
                  <Button onClick={() => handleSync('commits')} disabled={syncingCommits}>
                    {syncingCommits ? 'Syncing...' : 'Sync Commits'}
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-muted-foreground">
                    PRs: {totalPRs !== null ? totalPRs : 'Loading...'}
                  </p>
                  <Button onClick={() => handleSync('prs')} disabled={syncingPRs}>
                    {syncingPRs ? 'Syncing...' : 'Sync PRs'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="mt-6 flex justify-center space-x-6">
            <Button onClick={() => navigate(`/commits/${username}`)}>Commits Dashboard</Button>
            <Button onClick={() => navigate(`/top-repos/${username}`)}>Explore Top Repos</Button>
          </div>
        </>
      ) : (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="ml-2 text-foreground">Loading...</span>
        </div>
      )}
    </div>
  );
}

export default Insights;