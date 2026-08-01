module.exports = {
  apps: [
    {
      name: "class-app",
      script: "npm",
      args: "run dev",
      watch: false,
      max_memory_restart: "500M",
      // Restart on crash immediately
      autorestart: true,
      // Max restarts in 100 seconds before giving up
      max_restarts: 10,
      min_uptime: "10s",
      env: {
        PORT: 3000,
        NODE_ENV: "development",
      },
    },
  ],
};
