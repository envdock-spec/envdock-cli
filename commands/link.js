const inquirer = require('inquirer');
const fs = require('fs');
const chalk = require('chalk');
const ora = require('ora'); // We need spinner for the pull
const api = require('../utils/api');

module.exports = async () => {
  // 1. Check for existing link
  if (fs.existsSync('.envdock.json')) {
    const { overwrite } = await inquirer.prompt([{
      type: 'confirm',
      name: 'overwrite',
      message: 'This folder is already linked. Overwrite?',
      default: false
    }]);
    if (!overwrite) return;
  }
  let spinner;

  try {
    // 2. Fetch User's Projects
     spinner = ora('Fetching projects...').start();
    const { data } = await api.get('/dashboard/stats'); 
    spinner.stop();

    const existingProjects = data.projects || [];
    
    // 3. Build Choices
    const choices = [
      { name: chalk.bold.green('+ Create New Project'), value: 'CREATE_NEW' },
      new inquirer.Separator(),
      ...existingProjects.map(p => ({ name: p.name, value: p._id }))
    ];

    // 4. Prompt Selection
    let { projectId } = await inquirer.prompt([
      {
        type: 'list',
        name: 'projectId',
        message: 'Select a project to link (or create new):',
        choices: choices,
        pageSize: 10
      }
    ]);

    // Track if this is a fresh project or an existing one
    let isNewProject = false; 

    // 5. Handle "Create New" Flow
    if (projectId === 'CREATE_NEW') {
      isNewProject = true; // Mark as new
      const { newName } = await inquirer.prompt([
        {
          type: 'input',
          name: 'newName',
          message: 'Enter name for the new project:',
          validate: input => input.trim().length > 0 ? true : 'Project name cannot be empty'
        }
      ]);

      try {
        const createSpinner = ora('Creating project...').start();
        const createRes = await api.post('/projects', { name: newName });
        createSpinner.succeed(chalk.green(`Created new project: ${chalk.bold(createRes.data.name)}`));
        projectId = createRes.data._id;
      } catch (err) {
        // ... error handling
        return;
      }
    }

    // 6. Ask for Default Environment
    const { defaultEnv } = await inquirer.prompt([
      {
        type: 'list',
        name: 'defaultEnv',
        message: 'Select the default environment for this folder:',
        choices: ['dev', 'staging', 'prod'],
        default: 'dev'
      }
    ]);

    // 7. Save .envdock.json
    const config = { projectId: projectId, env: defaultEnv };
    fs.writeFileSync('.envdock.json', JSON.stringify(config, null, 2));

    // =========================================================
    // 8. [NEW] Auto-Pull Logic for Existing Projects
    // =========================================================
    if (!isNewProject) {
      console.log(''); // spacer
      const { shouldPull } = await inquirer.prompt([{
        type: 'confirm',
        name: 'shouldPull',
        message: `Would you like to pull secrets from ${chalk.cyan(defaultEnv)} to .env now?`,
        default: true
      }]);

      if (shouldPull) {
        const pullSpinner = ora('Fetching secrets...').start();
        try {
          // Assuming your endpoint returns { secrets: { KEY: "VAL" } }
          // Adjust the endpoint path to match your actual Pull API
          const { data: pullData } = await api.get(`/cli/${projectId}?env=${defaultEnv}`);
          const envContent = Object.entries(pullData)
            .map(([k, v]) => `${k}=${v}`)
            .join('\n');
            
          fs.writeFileSync('.env', envContent);
          pullSpinner.succeed(chalk.green('Secrets pulled to .env successfully'));
        } catch (err) {
          pullSpinner.fail(chalk.red('Failed to pull secrets automatically.'));
          console.log(chalk.gray('You can try manually with `edk pull` later.'));
        }
      }
    }
    // =========================================================

    // 9. Security Checks (.gitignore)
    if (fs.existsSync('.gitignore')) {
      const gitignore = fs.readFileSync('.gitignore', 'utf-8');
      if (!gitignore.includes('.env')) {
        console.log(chalk.yellow('\n⚠️  Security Warning: .env is not in your .gitignore file.'));
      }
    }

    console.log(chalk.green(`\n✅ Project linked successfully!`));

  } catch (error) {
    spinner.stop();
    console.error(chalk.red('Linking failed:'), error.response?.data?.message || error.message);
  }
};