const fs = require("fs");
const path = require("path");

exports.handler = async (event, context) => {
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  const method = event.httpMethod;

  // Utiliser Octokit via require (plus simple)
  const { Octokit } = require("@octokit/rest");
  const octokit = new Octokit({ auth: GITHUB_TOKEN });

  try {
    if (method === "GET") {
      // Lire depuis GitHub data/energy.json
      const { data } = await octokit.repos.getContent({
        owner: "alvanh",
        repo: "Central-Brain-Battery",
        path: "data/energy.json",
      });
      const content = Buffer.from(data.content, "base64").toString("utf-8");
      const json = JSON.parse(content);
      return { statusCode: 200, body: JSON.stringify(json) };
    } else if (method === "POST") {
      const payload = JSON.parse(event.body);
      const { data: fileData } = await octokit.repos
        .getContent({
          owner: "alvanh",
          repo: "Central-Brain-Battery",
          path: "data/energy.json",
        })
        .catch(() => ({ data: { sha: "" } }));

      const content = Buffer.from(
        JSON.stringify(payload)
      ).toString("base64");
      await octokit.repos.createOrUpdateFileContents({
        owner: "alvanh",
        repo: "Central-Brain-Battery",
        path: "data/energy.json",
        message: "[auto] energy data update",
        content: content,
        sha: fileData?.sha,
      });

      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    }
  } catch (err) {
    console.error("Error:", err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
