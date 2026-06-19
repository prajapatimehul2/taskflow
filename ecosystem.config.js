// pm2 process definition for TaskFlow.
//   start:   pm2 start ecosystem.config.js
//   reload:  pm2 reload ecosystem.config.js
//
// Runtime env (DATABASE_URL, AUTH_SECRET, AUTH_URL) is read by Next.js from the
// .env file in this directory at startup, so it is not duplicated here.
module.exports = {
  apps: [
    {
      name: "taskflow",
      script: "node_modules/next/dist/bin/next",
      args: "start -H 127.0.0.1 -p 3000",
      cwd: __dirname,
      // Keep a single instance: the auth rate limiter is in-memory (per-process).
      instances: 1,
      exec_mode: "fork",
      env: { NODE_ENV: "production" },
      max_memory_restart: "500M",
    },
  ],
};
