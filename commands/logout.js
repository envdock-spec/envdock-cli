const chalk = require('chalk');
const config = require('../utils/config');

module.exports = () => {
  // 1. Check if a session exists
  const token = config.get('token');

  if (!token) {
    console.log(chalk.yellow('\n⚠️  You are not currently logged in.'));
    console.log(chalk.gray('Run \'edk login\' to get started.\n'));
    return; // Stop execution here
  }

  // 2. Perform Logout
  config.delete('token');
  config.delete('user');

  console.log(chalk.green('\n✅ Successfully logged out.'));
  console.log(chalk.gray('Run \'edk login\' to log back in.\n'));
};