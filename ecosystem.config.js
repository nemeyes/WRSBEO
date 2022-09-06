module.exports = {
  apps : [{
    name: 'wrs',
    script: './bin/www',
    instances: 'max',
    watch: true,
    ignore_watch: ['node_modules', 'logs'],
    env_dev: {
      NODE_ENV: 'development'
    },
    env_prod: {
      NODE_ENV: 'production'
    },
    output: './logs/pm2/console.log', // 로그 출력 경로 재설정
    error: './logs/pm2/error.log', // 에러 로그 출력 경로 재설정
  }]
};
