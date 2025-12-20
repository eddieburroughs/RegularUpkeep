module.exports = {
  apps: [
    // Main Next.js Application
    {
      name: 'regularupkeep-main-app',
      script: 'npm',
      args: 'start',
      cwd: '/root/RegularUpkeep-app',
      env: {
        NODE_ENV: 'production',
        PORT: 3002
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      error_file: '/root/.pm2/logs/regularupkeep-main-app-error.log',
      out_file: '/root/.pm2/logs/regularupkeep-main-app-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    },

    // Security Check - Runs daily at 1:00 AM
    {
      name: 'security-check',
      script: '/root/RegularUpkeep-app/scripts/security-check.sh',
      cwd: '/root/RegularUpkeep-app',
      cron_restart: '0 1 * * *',  // Every day at 1:00 AM
      autorestart: false,         // Don't restart after script completes
      watch: false,
      instances: 1,
      error_file: '/root/.pm2/logs/security-check-error.log',
      out_file: '/root/.pm2/logs/security-check-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      // Script runs once and exits, PM2 will restart it at cron time
      exp_backoff_restart_delay: 100,
      max_restarts: 0             // Don't restart on failure
    }
  ]
};
