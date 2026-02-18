const { spawn } = require('child_process');
const fs = require('fs');
const chalk = require('chalk');
const api = require('../utils/api');

module.exports = async (commandParts, options) => {
  // 1. Validation: Check if project is linked
  if (!fs.existsSync('.envdock.json')) {
    console.log(chalk.red('❌ No project linked. Run `edk link` first.'));
    return;
  }

  const localConfig = JSON.parse(fs.readFileSync('.envdock.json'));
  const envName = (options.env || localConfig.env || 'dev').toLowerCase();
  const ALLOWED_ENVS = ['dev', 'staging', 'prod'];

  // 2. Validation: Check Environment
  if (!ALLOWED_ENVS.includes(envName)) {
    console.log(chalk.red(`\n❌ Invalid environment: ${chalk.bold(envName)}`));
    console.log(chalk.white(`Please specify one of the following: ${ALLOWED_ENVS.map(e => chalk.cyan(e)).join(', ')}`));
    return;
  }

  // 3. Validation: Check Command
  if (!commandParts || commandParts.length === 0) {
    console.log(chalk.red('❌ Error: No command provided. Usage: edk run <command>'));
    return;
  }

  try {
    // 4. Fetch Secrets from Cloud
    const { data: secrets } = await api.get(`/cli/${localConfig.projectId}?env=${envName}`);

    // --- UNIVERSAL INJECTION LOGIC (START) ---
    // This ensures secrets work in React, Vite, and Next.js automatically
    const universalSecrets = { ...secrets };

    Object.entries(secrets).forEach(([key, value]) => {
      // Helper to add prefix safely (don't overwrite if user explicitly defined it)
      const addPrefix = (prefix) => {
        const prefixedKey = `${prefix}${key}`;
        if (!universalSecrets[prefixedKey] && !key.startsWith(prefix)) {
          universalSecrets[prefixedKey] = value;
        }
      };

      addPrefix('REACT_APP_');   // For Create React App
      addPrefix('VITE_');        // For Vite (Vue, React, Svelte)
      addPrefix('NEXT_PUBLIC_'); // For Next.js
    });
    // --- UNIVERSAL INJECTION LOGIC (END) ---

    // 5. User Feedback
    console.log(chalk.green(`\n✅ Loaded ${Object.keys(secrets).length} secrets from ${chalk.bold(envName.toUpperCase())}`));
    console.log(chalk.gray(`ℹ️  Auto-prefixed for frontend compatibility (REACT_APP_*, VITE_*, NEXT_PUBLIC_*)`));

    // 6. Prepare Child Process
    const cmd = commandParts[0];
    const args = commandParts.slice(1);
    
    // Join args for Windows compatibility if using shell: true
    // This handles commands like `edk run npm run build` better
    const finalCommand = commandParts.join(' '); 

    const child = spawn(finalCommand, {
      stdio: 'inherit',
      shell: true,
      env: { 
        ...process.env,      // Keep system variables (PATH, HOME, etc.)
        ...universalSecrets  // Inject our enhanced secrets
      }
    });

    // 7. Handle Exit Signals (Prevent Zombie Processes)
    const signals = ['SIGINT', 'SIGTERM', 'SIGHUP'];
    signals.forEach(signal => {
      process.on(signal, () => {
        if (!child.killed) child.kill(signal);
      });
    });

    child.on('exit', (code) => {
      process.exit(code); // Exit CLI with same code as child
    });

    child.on('error', (err) => {
      console.error(chalk.red(`Failed to start command: ${cmd}`), err.message);
      process.exit(1);
    });

  } catch (error) {
    if (error.response?.status === 403) {
      console.error(chalk.red('⛔ Access Denied: You do not have permission to view secrets in this project.'));
    } else {
      console.error(chalk.red('Failed to fetch secrets:'), error.message);
    }
    process.exit(1);
  }
};