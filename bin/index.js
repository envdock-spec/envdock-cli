#!/usr/bin/env node

const { Command } = require('commander');
const chalk = require('chalk');
const fs = require('fs');
const os = require('os');
const path = require('path');

const program = new Command();

// Import Commands
const login = require('../commands/login');
const link = require('../commands/link');
const run = require('../commands/run');
const pull = require('../commands/pull');
const push = require('../commands/push');
const whoami = require('../commands/whoami');
const logout = require('../commands/logout');
const configCmd = require('../commands/config');
const history = require('../commands/history');
const team = require('../commands/team');
const tokens = require('../commands/tokens');
const statusCommand = require('../commands/status');
const versionsCommand = require('../commands/versions');

// --- AUTH MIDDLEWARE ---
// Adjust this path if your global config is stored elsewhere (e.g., ~/.config/envdock/config.json)
const GLOBAL_CONFIG_PATH = path.join(os.homedir(), '.envdock', 'config.json');

const requireAuth = (thisCommand) => {
    // 1. Check if config file exists
    if (!fs.existsSync(GLOBAL_CONFIG_PATH)) {
        console.log(chalk.red(`\n⛔ You are not logged in.`));
        console.log(`Run ${chalk.bold.cyan('edk login')} to authenticate first.\n`);
        process.exit(1); // Stop execution
    }

    // 2. (Optional) Check if token specifically exists inside
    try {
        const config = JSON.parse(fs.readFileSync(GLOBAL_CONFIG_PATH, 'utf-8'));
        if (!config.token) throw new Error('No token');
    } catch (err) {
        console.log(chalk.red(`\n⛔ Session expired or invalid.`));
        console.log(`Run ${chalk.bold.cyan('edk login')} to authenticate again.\n`);
        process.exit(1);
    }
};

program
    .name('edk')
    .description('Manage your secrets securely from the CLI')
    .version('1.0.0');

// --- COMMANDS THAT DO NOT NEED AUTH ---

program
    .command('login [email]')
    .description('Login to EnvDock')
    .action((email) => login(email));

program
    .command('logout')
    .description('Log out and clear credentials')
    .action(logout);

// --- COMMANDS THAT REQUIRE AUTH ---
// We attach .hook('preAction', requireAuth) to these

program
    .command('whoami')
    .description('Show current logged-in user')
    .hook('preAction', requireAuth) // <--- Added Hook
    .action(whoami);

program
    .command('link')
    .description('Link the current directory to a EnvDock project')
    .hook('preAction', requireAuth) // <--- Added Hook
    .action(link);

program
    .command('run <command...>')
    .description('Run a command with injected secrets')
    .option('-e, --env <env>', 'Environment')
    .hook('preAction', requireAuth) // <--- Added Hook
    .action((command, options) => run(command, options));

program
    .command('pull')
    .description('Download secrets to a .env file')
    .option('-e, --env <env>', 'Environment')
    .hook('preAction', requireAuth) // <--- Added Hook
    .action(pull);

program
    .command('push')
    .description('Upload .env file secrets to EnvDock')
    .option('-e, --env <env>', 'Target environment')
    .option('-f, --file <path>', 'Source file', '.env')
    .hook('preAction', requireAuth) // <--- Added Hook
    .action(push);

program
    .command('config [action] [key] [value]')
    .description('Configure CLI settings (list, get, set)')
    .hook('preAction', requireAuth) // <--- Added Hook
    .action((action, key, value) => configCmd(action, key, value));

program
    .command('history')
    .description('View audit log of secret changes')
    .hook('preAction', requireAuth) // <--- Added Hook
    .action(history);

program
    .command('team [action] [email]')
    .description('Manage team members (ls, add, remove)')
    .hook('preAction', requireAuth) // <--- Added Hook
    .action(team);

program
    .command('tokens [action] [name]')
    .description('Manage CI/CD tokens (ls, create, revoke)')
    .hook('preAction', requireAuth) // <--- Added Hook
    .action(tokens);

program
    .command('status')
    .description('Show current project status')
    .option('-e, --env <env>', 'Environment')
    .hook('preAction', requireAuth) // <--- Added Hook
    .action((options) => statusCommand(options));

program
    .command('versions [action]')
    .description('Manage secret versions')
    .option('-e, --env <env>', 'Environment')
    .hook('preAction', requireAuth) // <--- Added Hook
    .action((action, options) => versionsCommand(action, options));

// --- HELP TEXT & ERROR HANDLING ---

program.addHelpText('after', `
${chalk.bold.cyan('\nCommand Formats & Examples:')}
  ${chalk.gray('Login:')}
    $ edk login                          ${chalk.dim('# Browser-based auth')}
    $ edk login user@example.com         ${chalk.dim('# Manual email auth')}
    $ edk logout                         ${chalk.dim('# Clear the session')}

  ${chalk.gray('Project Sync:')}
    $ edk link                           ${chalk.dim('# Connect folder to cloud project')}
    $ edk pull                           ${chalk.dim('# Sync secrets to .env')}
    $ edk push                           ${chalk.dim('# Upload secrets to cloud')}

  ${chalk.gray('Execution:')}
    $ edk run "npm start"                ${chalk.dim('# Inject dev secrets')}
    $ edk run -e prod "node app.js"      ${chalk.dim('# Inject prod secrets')}

${chalk.bold.blue('Documentation:')} ${chalk.underline('https://www.envdock.cloud/docs')}
`);

process.on('uncaughtException', (err) => {
    console.error(chalk.red('\n💥 An unexpected error occurred:'), err.message);
    console.log(chalk.gray('If this persists, contact envdock@gmail.com'));
    process.exit(1);
});

program.parse(process.argv);