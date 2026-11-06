import { config } from "./config/index.js";
import { startServer } from "./server/http.js";
import { startPollLoop } from "./poll/index.js";
import { startTrackLoop } from "./timesheet/index.js";

async function main() {
  await startServer();
  startPollLoop();
  if (config.timesheet.repos.length) startTrackLoop();
  console.log(
    `jira-dev-agent rodando em http://127.0.0.1:${config.server.port}  (Jira: ${config.jira.baseUrl})`,
  );
}

main().catch((e) => {
  console.error("Falha ao iniciar:", e);
  process.exit(1);
});
