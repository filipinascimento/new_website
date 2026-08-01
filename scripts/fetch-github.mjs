import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const config = JSON.parse(
  await readFile(path.join(root, "config/profile-sources.json"), "utf8"),
);
const { username, featuredRepositories } = config.github;
const headers = {
  Accept: "application/vnd.github+json",
  "User-Agent": "filipinascimento-website/1.0",
};
if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

async function getJson(url) {
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`GitHub request failed (${response.status}): ${url}`);
  return response.json();
}

const fetchedAt = new Date().toISOString();
const user = await getJson(`https://api.github.com/users/${username}`);
const repos = await getJson(
  `https://api.github.com/users/${username}/repos?per_page=100&sort=updated`,
);
const repoMap = new Map(repos.map((repo) => [repo.name, repo]));
const featured = featuredRepositories
  .map((name) => repoMap.get(name))
  .filter(Boolean)
  .map((repo) => ({
    name: repo.name,
    description: repo.description || "",
    url: repo.html_url,
    homepage: repo.homepage || null,
    language: repo.language || null,
    stars: repo.stargazers_count || 0,
    forks: repo.forks_count || 0,
    pushedAt: repo.pushed_at,
    topics: repo.topics || [],
  }));

const outputDir = path.join(root, "data/github");
await mkdir(outputDir, { recursive: true });
await writeFile(
  path.join(outputDir, "repos.json"),
  `${JSON.stringify(
    {
      fetchedAt,
      profile: {
        login: user.login,
        name: user.name,
        bio: user.bio,
        company: user.company,
        publicRepos: user.public_repos,
        followers: user.followers,
        url: user.html_url,
      },
      featured,
    },
    null,
    2,
  )}\n`,
);

console.log(`GitHub: refreshed ${featured.length} curated repositories for ${username}.`);
