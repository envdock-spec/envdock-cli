const fs = require('fs');
const chalk = require('chalk');
const { table } = require('table');
const api = require('../utils/api');

module.exports = async (options) => {
  if (!fs.existsSync('.envdock.json')) return console.log(chalk.red('Run `edk link` first.'));
  const localConfig = JSON.parse(fs.readFileSync('.envdock.json'));

  try {
    const { data: logs } = await api.get(`/projects/${localConfig.projectId}/audit-logs`);

    if (logs.length === 0) {
      console.log(chalk.yellow('No history available for this project.'));
      return;
    }

    const output = [['Action', 'User', 'Details', 'Date']];
    logs.forEach(log => {
      output.push([
        chalk.bold(log.action), // e.g., "PUSH_SECRETS"
        log.userEmail,
        log.details || 'N/A',
        // log.ipAddress,
        new Date(log.createdAt).toLocaleString()
      ]);
    });

    console.log(chalk.blue(`\n📜 Project History (Last 10 events)`));
    console.log(table(output));

  } catch (error) {
    console.error(chalk.red('Failed to fetch history:'), error.message);
  }
};