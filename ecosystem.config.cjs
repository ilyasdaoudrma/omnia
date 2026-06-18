// PM2 process manager for the 4 OMNIA NestJS backends.
// Runs the BUILT output (dist/main.js) — no file-watch — and auto-restarts on crash.
//
//   Build first:  npm --prefix ai-agent-hub/backend run build   (repeat per app)
//   Start:        pm2 start ecosystem.config.cjs   (then: pm2 save)
//   Status/logs:  pm2 status   |   pm2 logs omnia-agent-api
//   Restart:      pm2 restart omnia-agent-api
//
// Paths are relative to this file, so it works wherever the repo is cloned.
const path = require('path');

const backend = (name, dir) => ({
  name,
  cwd: path.join(__dirname, dir, 'backend'),
  script: 'dist/main.js',
  autorestart: true,
  max_restarts: 30,
  restart_delay: 2000,
  min_uptime: '8s',
  exp_backoff_restart_delay: 200,
  kill_timeout: 5000,
});

module.exports = {
  apps: [
    backend('omnia-agent-api', 'ai-agent-hub'),
    backend('omnia-stays-api', 'omnia-stays'),
    backend('omnia-eats-api', 'omnia-eats'),
    backend('omnia-rides-api', 'omnia-rides'),
  ],
};
