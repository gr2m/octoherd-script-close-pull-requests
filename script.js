// @ts-check

/**
 * Close pull requests across multiple repositories
 *
 * @param {import('@octoherd/cli').Octokit} octokit
 * @param {import('@octoherd/cli').Repository} repository
 * @param {object} options
 * @param {string} options.author username of pull request author.
 */
export async function script(octokit, repository, { author }) {
  const owner = repository.owner.login;
  const repo = repository.name;

  if (!author) {
    throw new Error("--author must be set");
  }

  if (repository.archived) {
    octokit.log.info(
      { updated: false, reason: "archived" },
      `${repository.html_url} is archived`
    );
    return;
  }

  const iterator = await octokit.paginate.iterator(
    "GET /repos/{owner}/{repo}/issues",
    {
      owner,
      repo,
      state: "open",
    }
  );

  for await (const { data: pullRequests } of iterator) {
    for (const pullRequest of pullRequests) {
      // normalize user and app logins
      const pullRequestAuthor = pullRequest.user?.login.replace("[bot]", "");

      if (pullRequestAuthor !== author) continue;

      await octokit.request("PATCH /repos/{owner}/{repo}/pulls/{pull_number}", {
        owner,
        repo,
        pull_number: pullRequest.number,
        state: "closed",
      });

      octokit.log.info({ updated: true }, `${pullRequest.html_url} closed`);
    }
  }
}
