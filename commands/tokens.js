const fs = require('fs');
const chalk = require('chalk');
const { table } = require('table');
const api = require('../utils/api');
const inquirer = require('inquirer');

module.exports = async (action, arg1) => {
  if (!fs.existsSync('.envdock.json')) return console.log(chalk.red('Run `edk link` first.'));
  const projectId = JSON.parse(fs.readFileSync('.envdock.json')).projectId;

  try {
    // --- LIST TOKENS ---
    if (!action || action === 'ls') {
      const { data: tokens } = await api.get(`/projects/${projectId}/tokens`);
      if (tokens.length === 0) return console.log(chalk.yellow('No active tokens.'));

      const output = [['Name', 'Created By', 'Created At']];
      tokens.forEach(t => output.push([t.name, t.createdBy.email, new Date(t.createdAt).toLocaleDateString()]));
      console.log(table(output));
      return;
    }

    // --- CREATE TOKEN ---
   if (action === 'create') {
      let tokenName = arg1;

      // 1. If name is missing, prompt the user for it
      if (!tokenName) {
        const { name } = await inquirer.prompt([{
          type: 'input',
          name: 'name',
          message: 'Enter a name for this token (e.g., ci-pipeline):',
          validate: input => input.trim().length > 0 ? true : 'Token name cannot be empty'
        }]);
        tokenName = name;
      }

      // 2. Call API
      try {
        const { data } = await api.post(`/projects/${projectId}/tokens`, { name: tokenName });

        console.log(chalk.green(`\n✅ Token '${tokenName}' Created Successfully!`));
        console.log(chalk.yellow('⚠️  Make sure to copy it now. You won\'t see it again.'));
        console.log(chalk.gray('------------------------------------------------'));
        console.log(chalk.bold.white(data.token)); 
        console.log(chalk.gray('------------------------------------------------'));
      } catch (err) {
        console.error(chalk.red('\n❌ Failed to create token.'));
        console.error(chalk.red(err.response?.data?.message || err.message));
      }
      return;
    }

    // --- REVOKE TOKEN ---
    if (action === 'revoke') {
      // 1. Fetch current tokens to get the mapping of Name -> ID
      const { data: tokens } = await api.get(`/projects/${projectId}/tokens`);

      if (tokens.length === 0) {
        console.log(chalk.yellow('No tokens found to revoke.'));
        return;
      }

      let tokenIdToDelete;
      let tokenNameDisplay;

      // Case A: User provided a name (e.g., `edk tokens revoke my-ci-token`)
      if (arg1) {
        const targetToken = tokens.find(t => t.name === arg1);
        if (!targetToken) {
          console.log(chalk.red(`❌ Token '${arg1}' not found.`));
          return;
        }
        tokenIdToDelete = targetToken._id;
        tokenNameDisplay = targetToken.name;
      }
      // Case B: User didn't provide name -> Show Selection List
      else {
        const { selectedId } = await inquirer.prompt([{
          type: 'list',
          name: 'selectedId',
          message: 'Select the token to revoke:',
          choices: tokens.map(t => ({
            name: `${chalk.bold(t.name)} (${t.tokenPrefix}...) - ${chalk.gray(new Date(t.createdAt).toLocaleDateString())}`,
            value: t._id
          }))
        }]);
        tokenIdToDelete = selectedId;
        // Find name just for the confirmation message
        tokenNameDisplay = tokens.find(t => t._id === selectedId).name;
      }

      // 2. Safety Confirmation
      const { confirm } = await inquirer.prompt([{
        type: 'confirm',
        name: 'confirm',
        message: `Are you sure you want to revoke '${chalk.red(tokenNameDisplay)}'? This will break any apps using it.`,
        default: false
      }]);

      if (confirm) {
        // 3. Call Delete API
        await api.delete(`/projects/${projectId}/tokens/${tokenIdToDelete}`);
        console.log(chalk.green(`✅ Token '${tokenNameDisplay}' revoked successfully.`));
      } else {
        console.log(chalk.gray('Operation cancelled.'));
      }
    }

  } catch (error) {
    if (error.response?.status === 403) {
      console.log(chalk.red('⛔ Access Denied: Only Admins can manage tokens.'));
    } else {
      console.error(chalk.red('Error:'), error.message);
    }
  }
};