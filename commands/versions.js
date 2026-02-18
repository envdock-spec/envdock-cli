const fs = require('fs');
const chalk = require('chalk');
const { table } = require('table');
const inquirer = require('inquirer');
const api = require('../utils/api');

module.exports = async (action, options) => {
  if (!fs.existsSync('.envdock.json')) return console.log(chalk.red('Run `edk link` first.'));

  const config = JSON.parse(fs.readFileSync('.envdock.json'));
  const projectId = config.projectId;
  const env = (options.env || config.env || 'dev').toLowerCase();

  // 2. Define allowed tiers
  const ALLOWED_ENVS = ['dev', 'staging', 'prod'];

  // 3. Strict Validation
  if (!ALLOWED_ENVS.includes(env)) {
    console.log(chalk.red(`\n❌ Invalid environment: ${chalk.bold(env)}`));
    console.log(chalk.white(`Please specify one of the following: ${ALLOWED_ENVS.map(e => chalk.cyan(e)).join(', ')}`));
    console.log(chalk.gray(`\nExample: edk versions -e staging`));
    return; // Stop execution
  }

  try {
    // 1. Fetch Versions
    const { data } = await api.get(`/cli/${projectId}/versions?env=${env}`);
    const { activeVersion, history } = data;

    // --- LIST VERSIONS (Default) ---
    if (!action || action === 'ls') {

      if (!history || history.length === 0) {
        console.log(chalk.yellow(`\n⚠️  No version history found for ${chalk.bold(env)}.`));
        return;
      }
      const output = [['Version', 'Created By', 'Date', 'Status']];

      history.forEach(v => {
        const isCurrent = v.version === activeVersion;
        output.push([
          `v${v.version}`,
          v.createdBy ? v.createdBy.email : 'Unknown',
          new Date(v.createdAt).toLocaleString(),
          isCurrent ? chalk.bold.green('ACTIVE') : chalk.gray('Archived')
        ]);
      });

      console.log(chalk.blue(`\n📜 Version History for ${chalk.bold(env.toUpperCase())}`));
      console.log(table(output));
      return;
    }

    // --- ROLLBACK / REVOKE ---
    if (action === 'rollback' || action === 'revoke') {

      // 1. Filter available versions (exclude current)
      const availableVersions = history.filter(v => v.version !== activeVersion);

      // 2. [FIX] Check if we have anything to rollback to BEFORE starting wizard
      if (availableVersions.length === 0) {
        console.log(chalk.yellow(`\n⚠️  No versions available for rollback in ${chalk.bold(env)}.`));
        return;
      }

      // Step A: Select Version
      const { targetVersion } = await inquirer.prompt([{
        type: 'list',
        name: 'targetVersion',
        message: 'Select a version to restore:',
        choices: history
          .filter(v => v.version !== activeVersion) // Don't allow rollback to current
          .map(v => ({
            name: `v${v.version} - ${new Date(v.createdAt).toLocaleString()} (by ${v.createdBy?.name || 'Unknown'})`,
            value: v.version
          }))
      }]);

      if (!targetVersion) {
        console.log(chalk.yellow('No other versions available to rollback to.'));
        return;
      }

      // Step B: Confirm
      console.log(chalk.yellow(`\n⚠️  WARNING: You are about to overwrite the CURRENT secrets in '${env}' with data from v${targetVersion}.`));

      const { confirm } = await inquirer.prompt([{
        type: 'confirm',
        name: 'confirm',
        message: 'Are you sure?',
        default: false
      }]);

      if (!confirm) return console.log(chalk.gray('Cancelled.'));

      // Step C: Execute
      const spinner = require('ora')('Restoring version...').start();

      try {
        // 1. Call API
        const { data } = await api.post(`/cli/${projectId}/rollback`, { env, version: targetVersion });

        spinner.succeed(chalk.green(`Successfully rolled back ${env} to v${targetVersion}`));

        // 2. [NEW] Update .env File
        if (data.variables) {
          const envContent = Object.entries(data.variables)
            .map(([key, value]) => `${key}=${value}`)
            .join('\n');

          fs.writeFileSync('.env', envContent);
          console.log(chalk.blue(`📝 Updated .env with secrets from v${targetVersion}`));
        }

      } catch (err) {
        if (err.response?.status === 403) {
          spinner.fail(chalk.red('⛔ Access Denied: Viewers cannot perform rollbacks.'));
        } else {
          spinner.fail(chalk.red('Rollback failed: ' + err.message));
        }
      }
    }

  } catch (error) {
    console.error(chalk.red('Error:'), error.message);
  }
};