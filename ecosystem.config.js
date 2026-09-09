module.exports = {
  apps: [
    {
      name: "blazor-tracker",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3000",
      cwd: "C:\\Apps\\blazor-tracker",
      env: {
        NODE_ENV: "production",
        PORT: "3000",
        DATABASE_URL: "file:C:/Apps/blazor-tracker/data/prod.db",
      },
      interpreter: "node",
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
    },
  ],
};
