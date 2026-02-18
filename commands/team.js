const fs = require('fs');
const chalk = require('chalk');
const inquirer = require('inquirer');
const ora = require('ora'); // Make sure to require it here
const { table } = require('table');
const api = require('../utils/api');

module.exports = async (action, email, options) => {
  if (!fs.existsSync('.envdock.json')) return console.log(chalk.red('Run `edk link` first.'));
  const projectId = JSON.parse(fs.readFileSync('.envdock.json')).projectId;

  let spinner; // <--- 1. Declare spinner here so 'catch' can see it

  try {
    // --- LIST TEAM (ls) ---
    if (!action || action === 'ls') {
      spinner = ora('Fetching team members...').start();
      const { data: members } = await api.get(`/projects/cli/${projectId}/members`);
      spinner.stop(); // Stop spinner cleanly before printing table

      if (members.length === 0) {
        console.log(chalk.yellow('No members found.'));
        return;
      }

      const output = [['Name', 'Email', 'Role', 'User ID']];
      members.forEach(m => {
        output.push([
          m.name || 'N/A', 
          m.email, 
          m.role === 'admin' ? chalk.bold.red(m.role) : chalk.blue(m.role),
          m.userId
        ]);
      });
      console.log(chalk.bold(`\n👥 Team Members for Project: ${projectId}`));
      console.log(table(output));
      return;
    }

    // --- INVITE USER (invite) ---
    if (action === 'add') {
      if (!email) return console.log(chalk.red('Usage: edk team add <email>'));
      
      const { role } = await inquirer.prompt([{
        type: 'list',
        name: 'role',
        message: 'Select role:',
        choices: ['viewer', 'editor', 'admin']
      }]);

      spinner = ora(`Adding ${email}...`).start(); // Start global spinner
      await api.post(`/projects/${projectId}/invite`, { email, role });
      spinner.succeed(chalk.green(`✅ Added ${email} as ${role}`));
      return;
    }

    // // --- UPDATE ROLE (update) ---
    // if (action === 'update') {
    //   if (!email) return console.log(chalk.red('Usage: edk team update <email>'));

    //   const { newRole } = await inquirer.prompt([{
    //     type: 'list',
    //     name: 'newRole',
    //     message: `Select new role for ${email}:`,
    //     choices: ['viewer', 'editor', 'admin']
    //   }]);

    //   spinner = ora(`Updating role for ${email}...`).start();
    //   await api.put(`/projects/cli/${projectId}/members`, { email, role: newRole });
    //   spinner.succeed(chalk.green(`✅ Updated ${email} to ${newRole}`));
    //   return;
    // }

    // // --- REMOVE USER (remove) ---
    // if (action === 'remove') {
    //   if (!email) return console.log(chalk.red('Usage: edk team remove <email>'));
      
    //   // 1. Fetch list silently to get ID
    //   const { data: members } = await api.get(`/projects/cli/${projectId}/members`);
    //   const targetMember = members.find(m => m.email === email);

    //   if (!targetMember) {
    //     console.log(chalk.red(`❌ User ${email} is not in this project.`));
    //     return;
    //   }

    //   const { confirm } = await inquirer.prompt([{
    //       type: 'confirm', 
    //       name: 'confirm', 
    //       message: `Are you sure you want to remove ${chalk.bold(email)}?`
    //   }]);
      
    //   if (confirm) {
    //       spinner = ora(`Removing ${email}...`).start();
    //       await api.delete(`/projects/${projectId}/members/${targetMember.userId}`);
    //       spinner.succeed(chalk.green(`✅ Removed ${email} from project.`));
    //   } else {
    //       console.log(chalk.gray('Cancelled.'));
    //   }
    //   return;
    // }

  // --- UPDATE ROLE (update) ---
    if (action === 'update') {
      
      // 1. Fetch Current User & Members List concurrently for speed
      spinner = ora('Fetching team details...').start();
      const [membersRes, meRes] = await Promise.all([
        api.get(`/projects/cli/${projectId}/members`),
        api.get('/auth/me') // <--- Ensure this endpoint exists in your backend
      ]);
      spinner.stop();

      const members = membersRes.data;
      const me = meRes.data;
      
      let targetEmail = email;

      // 2. Validate Manual Input (If email provided in args)
      if (targetEmail) {
        if (targetEmail === me.email) {
            console.log(chalk.red('⛔ Operation not allowed: You cannot modify your own role.'));
            return;
        }

        // Check if user actually exists in the project
        const exists = members.find(m => m.email === targetEmail);
        if (!exists) return console.log(chalk.red(`❌ User ${targetEmail} is not in this project.`));
      }

      // 3. Interactive Mode (If no email provided)
      if (!targetEmail) {
        if (members.length === 0) return console.log(chalk.yellow('No members found to update.'));

        // Filter out MYSELF from the list
        const availableMembers = members.filter(m => m.email !== me.email);

        if (availableMembers.length === 0) {
            console.log(chalk.yellow('No other members to update (only you are in this project).'));
            return;
        }

        const { selectedEmail } = await inquirer.prompt([{
          type: 'list',
          name: 'selectedEmail',
          message: 'Select a member to update:',
          choices: availableMembers.map(m => ({
            name: `${m.name || 'Unknown'} (${m.email}) - ${chalk.cyan(m.role)}`,
            value: m.email
          }))
        }]);
        targetEmail = selectedEmail;
      }

      // 4. Select New Role
      const { newRole } = await inquirer.prompt([{
        type: 'list',
        name: 'newRole',
        message: `Select new role for ${chalk.bold(targetEmail)}:`,
        choices: ['viewer', 'editor', 'admin']
      }]);

      spinner = ora(`Updating role for ${targetEmail}...`).start();
      await api.put(`/projects/cli/${projectId}/members`, { email: targetEmail, role: newRole });
      spinner.succeed(chalk.green(`✅ Updated ${targetEmail} to ${newRole}`));
      return;
    }

    // --- REMOVE USER (remove) ---
    if (action === 'remove') {
      
      // 1. Fetch Current User & Members
      spinner = ora('Fetching team details...').start();
      const [membersRes, meRes] = await Promise.all([
        api.get(`/projects/cli/${projectId}/members`),
        api.get('/auth/me') 
      ]);
      spinner.stop();

      const members = membersRes.data;
      const me = meRes.data;
      let targetMember;

      if (members.length === 0) return console.log(chalk.yellow('No members found to remove.'));

      // 2. Validate Manual Input
      if (email) {
        if (email === me.email) {
            console.log(chalk.red('⛔ Operation not allowed: You cannot remove yourself from the project.'));
            console.log(chalk.gray('   (Use `edk leave` if you wish to leave the project)'));
            return;
        }

        targetMember = members.find(m => m.email === email);
        if (!targetMember) return console.log(chalk.red(`❌ User ${email} is not in this project.`));
      } 
      
      // 3. Interactive Mode
      else {
        // Filter out MYSELF
        const availableMembers = members.filter(m => m.email !== me.email);

        if (availableMembers.length === 0) {
            console.log(chalk.yellow('No other members to remove.'));
            return;
        }

        const { selectedMember } = await inquirer.prompt([{
          type: 'list',
          name: 'selectedMember',
          message: 'Select a member to remove:',
          choices: availableMembers.map(m => ({
            name: `${m.name || 'Unknown'} (${m.email})`,
            value: m
          }))
        }]);
        targetMember = selectedMember;
      }

      // 4. Confirm Deletion
      const { confirm } = await inquirer.prompt([{
          type: 'confirm', 
          name: 'confirm', 
          message: `Are you sure you want to remove ${chalk.bold(targetMember.email)}?`,
          default: false
      }]);
      
      if (confirm) {
          spinner = ora(`Removing ${targetMember.email}...`).start();
          await api.delete(`/projects/${projectId}/members/${targetMember.userId}`);
          spinner.succeed(chalk.green(`✅ Removed ${targetMember.email} from project.`));
      } else {
          console.log(chalk.gray('Cancelled.'));
      }
      return;
    }

    // Default Help
    console.log(chalk.yellow('\nUsage:'));
    console.log('  edk team ls                 List all members');
    console.log('  edk team add <email>        Add a new member');
    console.log('  edk team update <email>     Update member role');
    console.log('  edk team remove <email>     Remove a member');
    console.log('');

  } catch (error) {
    // 2. ERROR HANDLING
    const errorMsg = error.response?.data?.message || error.message;

    // If spinner was running, fail it with the error message
    if (spinner) {
      spinner.fail(chalk.red(errorMsg));
    } 
    // If no spinner (e.g., error during prompt or starting checks), just log it
    else if (error.response?.status === 403) {
      console.log(chalk.red('⛔ Access Denied: You must be an Admin to manage the team.'));
    } else {
      console.error(chalk.red('\nError:'), errorMsg);
    }
  }
};