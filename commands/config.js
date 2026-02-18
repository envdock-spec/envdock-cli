const inquirer = require('inquirer');
const chalk = require('chalk');
const ora = require('ora');
const { table } = require('table');
const config = require('../utils/config');
const fs = require('fs');
const api = require('../utils/api');

module.exports = async (action, key, value) => {
    // --- MODE 1: LIST ALL SETTINGS ---

    // --- MODE 4: INTERACTIVE MENU ---
    console.log(chalk.bold.blue('\n🔧 Interactive Configuration'));

    // 1. CHECK AUTH STATUS
    const token = config.get('token');
    const user = config.get('user') || {};
    const isLoggedIn = !!token;

    if (!isLoggedIn) {
        console.log(chalk.yellow('⚠️  You are currently not logged in.'));
        console.log(chalk.gray('   Profile and Password options are hidden.\n'));
    } else {
        console.log(chalk.gray(`   Logged in as: ${chalk.cyan(user.email || 'User')}\n`));
    }

    // 2. BUILD DYNAMIC CHOICES
    const choices = [];

    if (isLoggedIn) {
        // 🔒 Protected Options (Only show if logged in)
        choices.push({ name: 'Update Profile (Name)', value: 'profile' });
        choices.push({ name: 'Change Password', value: 'password' });
        choices.push({ name: 'Change Default Environment', value: 'env' });
        choices.push({ name: 'Reset/Clear All Config', value: 'reset' });
        choices.push(new inquirer.Separator());
    } else {
        // 🔒 Login Hint
        choices.push({ name: 'Login to EnvDock', value: 'login_hint' });
        choices.push(new inquirer.Separator());
    }

    // 🌍 Public Options (Always visible)
    choices.push(new inquirer.Separator());
    choices.push({ name: 'Exit', value: 'exit' });

    // 3. PROMPT
    const { choice } = await inquirer.prompt([
        {
            type: 'list',
            name: 'choice',
            message: 'What do you want to configure?',
            choices: choices
        }
    ]);

    // --- HANDLER: LOGIN HINT ---
    if (choice === 'login_hint') {
        console.log(chalk.red('❌ Access Denied'));
        console.log(`Run ${chalk.cyan('edk login')} to authenticate first.`);
        return;
    }

    // --- HANDLER: PROFILE (Protected) ---
    if (choice === 'profile') {
        // Double check just to be safe
        if (!isLoggedIn) return console.log(chalk.red('❌ Login required.'));

        const { newName } = await inquirer.prompt([
            {
                type: 'input',
                name: 'newName',
                message: 'Enter your new display name:',
                default: user.name,
                validate: input => input.length > 0 ? true : 'Name cannot be empty'
            }
        ]);

        const spinner = ora('Updating profile on server...').start();

        try {
            const { data } = await api.put('/auth/profile', { name: newName });
            config.set('user.name', data.name);
            spinner.succeed(chalk.green('✅ Profile updated successfully!'));
        } catch (error) {
            spinner.fail(chalk.red('Failed to update profile.'));
            console.error(chalk.red(error.response?.data?.message || error.message));
        }
    }

    // --- HANDLER: PASSWORD (Protected) ---
    if (choice === 'password') {
        if (!isLoggedIn) return console.log(chalk.red('❌ Login required.'));

        const answers = await inquirer.prompt([
            { type: 'password', name: 'currentPassword', message: 'Current Password:', mask: '*' },
            { type: 'password', name: 'newPassword', message: 'New Password:', mask: '*' }
        ]);

        const spinner = ora('Securely updating password...').start();

        try {
            await api.put('/auth/password', {
                currentPassword: answers.currentPassword,
                newPassword: answers.newPassword
            });
            spinner.succeed(chalk.green('✅ Password changed successfully.'));
        } catch (error) {
            spinner.fail(chalk.red('Failed to change password.'));
            console.log(chalk.red('Reason: ' + (error.response?.data?.message || error.message)));
        }
    }

    // --- HANDLER: ENV (Local Project Config) ---
    if (choice === 'env') {

        // 1. Check if we are inside a project folder
        if (!fs.existsSync('.envdock.json')) {
            console.log(chalk.red('❌ No configuration file found. Run `edk link` first or navigate to a project folder.'));
            return;
        }

        // 2. Prompt the user
        const { env } = await inquirer.prompt([
            {
                type: 'list',
                name: 'env',
                message: 'Select default environment for this folder:',
                choices: ['dev', 'staging', 'prod']
            }
        ]);

        try {
            // 3. Read the existing file
            const projectConfig = JSON.parse(fs.readFileSync('.envdock.json', 'utf8'));

            // 4. Update the environment field
            projectConfig.env = env;

            // 5. Write it back to the file
            fs.writeFileSync('.envdock.json', JSON.stringify(projectConfig, null, 2));

            console.log(chalk.green(`✅ Default environment for this folder updated to: ${chalk.bold(env)}`));

        } catch (error) {
            console.log(chalk.red('Failed to update .envdock.json:'), error.message);
        }
    }

    // --- HANDLER: RESET (Public) ---
    if (choice === 'reset') {
        const { confirm } = await inquirer.prompt([
            { type: 'confirm', name: 'confirm', message: 'Are you sure you want to wipe all settings?' }
        ]);
        if (confirm) {
            config.clear();
            console.log(chalk.yellow('⚠️  Configuration cleared.'));
        }
    }
};