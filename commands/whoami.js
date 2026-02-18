const chalk = require('chalk');
const config = require('../utils/config');

module.exports = () => {
  const user = config.get('user');
  const token = config.get('token');

  // 1. ROBUST CHECK: Ensure token is actually a string
  if (!token || typeof token !== 'string' || !user) {
    console.log(chalk.red('❌ You are not logged in (or session is invalid).'));
    console.log(`Run ${chalk.cyan('edk login')} to get started.`);
    return;
  }

  // 2. SAFE VARIABLES: Handle missing names/emails gracefully
  const safeName = user.name || 'Unknown User';
  const safeEmail = user.email || 'N/A';
  


  console.log('\n' + chalk.bold.white('👤 Current User:'));
  console.log(chalk.gray('----------------'));
  console.log(`${chalk.bold('Name:')}  ${chalk.green(safeName)}`);
  console.log(`${chalk.bold('Email:')} ${chalk.blue(safeEmail)}`);
  console.log('');
};