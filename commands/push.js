const fs = require('fs');
const chalk = require('chalk');
const inquirer = require('inquirer');
const ora = require('ora'); 
const api = require('../utils/api');

// Robust .env parser helper
const parseEnv = (content) => {
  const secrets = {};
  const lines = content.split('\n');
  const LINE_REGEX = /^\s*([\w.-]+)\s*=\s*(.*)?\s*$/;

  lines.forEach(line => {
    const match = line.match(LINE_REGEX);
    if (!match) return;
    
    let key = match[1];
    let value = match[2] || '';

    // Remove inline comments (naive but effective for most cases)
    // Be careful not to remove # inside quotes
    if (value.includes('#') && !value.includes('"') && !value.includes("'")) {
        value = value.split('#')[0].trim();
    }

    // Strip quotes
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    secrets[key] = value;
  });
  return secrets;
};

module.exports = async (options) => {
  if (!fs.existsSync('.envdock.json')) return console.log(chalk.red('Run `edk link` first.'));

  const localConfig = JSON.parse(fs.readFileSync('.envdock.json'));
  const filePath = options.file || '.env';
  const envName = (options.env || localConfig.env || 'dev').toLowerCase();

  // 2. Define allowed tiers
  const ALLOWED_ENVS = ['dev', 'staging', 'prod'];

  // 3. Strict Validation
  if (!ALLOWED_ENVS.includes(envName)) {
    console.log(chalk.red(`\n❌ Invalid environment: ${chalk.bold(envName)}`));
    console.log(chalk.white(`Please specify one of the following: ${ALLOWED_ENVS.map(e => chalk.cyan(e)).join(', ')}`));
    console.log(chalk.gray(`\nExample: edk push -e staging`));
    return; // Stop execution
  }

  if (!fs.existsSync(filePath)) {
    console.log(chalk.red(`❌ File not found: ${filePath}`));
    return;
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const secrets = parseEnv(content);
  const secretCount = Object.keys(secrets).length;

  if (secretCount === 0) {
    console.log(chalk.yellow('⚠️  No valid secrets found in file.'));
    return;
  }

  console.log(chalk.yellow(`\n⚠️  Pushing ${secretCount} secrets to ${chalk.bold(envName.toUpperCase())}.`));
  console.log(chalk.gray(`Target: Project ID ${localConfig.projectId}`));

  const { confirm } = await inquirer.prompt([{
    type: 'confirm',
    name: 'confirm',
    message: 'This will overwrite cloud secrets. Proceed?',
    default: false
  }]);

  if (!confirm) return;

  const spinner = ora('Pushing secrets...').start();

  try {
    await api.post(`/cli/push/${localConfig.projectId}`, {
      secrets,
      env: envName
    });
    spinner.succeed(chalk.green(`✅ Pushed successfully to ${envName}!`));
  } catch (error) {
    if (error.response?.status === 403) {
        spinner.fail(chalk.red('⛔ Access Denied: You do not have permission to edit secrets (Viewer Role).'));
    } else {
        spinner.fail(chalk.red('Push failed: ' + (error.response?.data?.message || error.message)));
    }
  }
};