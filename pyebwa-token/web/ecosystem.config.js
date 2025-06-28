module.exports = {
  apps: [{
    name: 'pyebwa-admin-web',
    script: 'npm',
    args: 'start',
    cwd: '/home/pyebwa-rasin/htdocs/rasin.pyebwa.com/pyebwa-token/web',
    env: {
      NODE_ENV: 'development',
      PORT: 3002,
      REACT_APP_API_URL: 'https://rasin.pyebwa.com/api'
    },
    watch: false,
    max_memory_restart: '1G',
    error_file: 'logs/pm2-error.log',
    out_file: 'logs/pm2-out.log',
    log_file: 'logs/pm2-combined.log',
    time: true
  }]
};