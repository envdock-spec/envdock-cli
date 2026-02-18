const fs = require('fs');
const chalk = require('chalk');
const api = require('../utils/api');
module.exports = async (options) => {
  if (!fs.existsSync('.envdock.json')) {
    return console.log(chalk.red('❌ Not Linked to any cloud project. Run `edk link` first.'));
  }
  
  const config = JSON.parse(fs.readFileSync('.envdock.json'));
  const env = (options.env || config.env || 'dev').toLowerCase();

  // 2. Define allowed tiers
  const ALLOWED_ENVS = ['dev', 'staging', 'prod'];

  // 3. Strict Validation
  if (!ALLOWED_ENVS.includes(env)) {
    console.log(chalk.red(`\n❌ Invalid environment: ${chalk.bold(env)}`));
    console.log(chalk.white(`Please specify one of the following: ${ALLOWED_ENVS.map(e => chalk.cyan(e)).join(', ')}`));
    console.log(chalk.gray(`\nExample: edk status -e staging`));
    return; // Stop execution
  }
  try {
    // Fetch Project Details + Current Version for this Env
    const { data: project } = await api.get(`/projects/${config.projectId}`);
    // You might need a specific endpoint for version status, 
    // but reusing getProject or the new versions endpoint works.
    const { data: versionData } = await api.get(`/cli/${config.projectId}/versions?env=${env}`);

    console.log(chalk.bold.blue('\n🔍 Project Status'));
    console.log(chalk.gray('------------------------------------------------'));
    console.log(`${chalk.bold('Project Name:')}   ${project.name}`);
    console.log(`${chalk.bold('Project ID:')}     ${config.projectId}`);
    console.log(`${chalk.bold('Environment:')}    ${env.toUpperCase()}`);
    console.log(`${chalk.bold('Active Version:')} v${versionData.activeVersion}`);
    console.log(chalk.gray('------------------------------------------------'));

  } catch (error) {
    console.error(chalk.red('Failed to fetch status:'), error.message);
  }
};