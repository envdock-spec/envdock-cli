const http = require('http');
const open = require('open'); // Ensure you have installed this: npm install open
const chalk = require('chalk');
const ora = require('ora');
const inquirer = require('inquirer');
const config = require('../utils/config'); // Assuming this wraps 'conf' or similar
const api = require('../utils/api');

const PORT = 4200;
const WEB_URL = 'http://envdock.cloud/cli';

module.exports = async (emailArg) => {

  // ==========================================
  // 0. CHECK EXISTING SESSION
  // ==========================================
  const storedToken = config.get('token');
  const storedUser = config.get('user');

  if (storedToken) {
    console.log(chalk.yellow(`\n⚠️  You are already logged in as ${chalk.bold(storedUser?.email || 'a user')}.`));
    console.log(chalk.white(`Run ${chalk.cyan('edk logout')} first if you want to switch accounts.\n`));
    return; // <--- STOP EXECUTION HERE
  }

  console.log(chalk.bold.blue('\n🔑 EnvDock Login'));

  // ==========================================
  // SCENARIO 1: Manual Login (edk login email@...)
  // ==========================================
  if (emailArg) {
    // ... (Your existing manual login logic)
    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(emailArg)) {
      console.log(chalk.red(`\n❌ Invalid email format: ${chalk.bold(emailArg)}`));
      return;
    }
    const questions = [
      { type: 'password', name: 'password', message: 'Password:', mask: '*' },
    ];

    const { password } = await inquirer.prompt(questions);
    const spinner = ora('Authenticating...').start();

    try {
      const { data } = await api.post('/auth/login', { email: emailArg, password });

      config.set('token', data.token);
      config.set('user', { name: data?.name || 'User', email: emailArg });

      spinner.succeed(chalk.green(`Successfully logged in as ${data?.name}!`));
    } catch (error) {
      spinner.fail(chalk.red('Login failed: ' + (error.response?.data?.message || error.message)));
    }
    return;
  }

  // ==========================================
  // SCENARIO 2: Browser Login (edk login)
  // ==========================================

  // ... (Your existing browser login logic remains exactly the same)
  const spinner = ora('Waiting for browser authentication...').start();

  const server = http.createServer(async (req, res) => {
    // ... (rest of your server logic)
    const url = new URL(req.url, `http://localhost:${PORT}`);

    if (url.pathname === '/callback') {
      const token = url.searchParams.get('token');
      const name = url.searchParams.get('name');
      const email = url.searchParams.get('email');

      if (token) {
        // Save separately using keys matching your getter above
        config.set('token', token);
        config.set('user', { name, email });

        // ... (rest of success response)
        res.writeHead(200, { 'Content-Type': 'text/html' });
        // res.end(`<h1>Success!</h1><script>setTimeout(function(){ window.close() }, 1000);</script>`); // Simplified HTML for brevity here
        res.end(`
  <!DOCTYPE html>
  <html>
  <head>
    <title>EnvDock | Authentication Successful</title>
    <style>
      body {
        background-color: #050505;
        color: #ffffff;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100vh;
        margin: 0;
        overflow: hidden;
      }
      .container {
        text-align: center;
        padding: 40px;
        border: 1px solid rgba(255, 255, 255, 0.05);
        background: rgba(255, 255, 255, 0.01);
        border-radius: 40px;
        max-width: 400px;
      }
      .icon-circle {
        width: 64px;
        height: 64px;
        background: rgba(249, 115, 22, 0.1);
        border: 1px solid rgba(249, 115, 22, 0.2);
        border-radius: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 24px auto;
        color: #f97316;
      }
      h1 {
        font-size: 24px;
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: -0.02em;
        margin: 0 0 8px 0;
      }
      p {
        color: #666;
        font-size: 14px;
        margin: 0 0 24px 0;
        line-height: 1.5;
      }
      .status-pill {
        display: inline-block;
        margin-bottom: 10px;
        padding: 4px 12px;
        background: rgba(16, 185, 129, 0.1);
        color: #10b981;
        border-radius: 100px;
        font-size: 10px;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.1em;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="icon-circle">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
      </div>
      <div class="status-pill">Handshake Complete</div>
      <h1>Authentication Success</h1>
      <p>Terminal link established. You can close this tab and return to your CLI.</p>
    </div>

    <script>
      // Auto-close after 2 seconds to give user time to read
      setTimeout(function() {
        window.close();
      }, 2000);
    </script>
  </body>
  </html>
`); // Simplified HTML for brevity here

        spinner.succeed(chalk.green(`Successfully logged in as ${name || 'User'}!`));

        setTimeout(() => {
          server.close();
          process.exit(0);
        }, 2000);
      } else {
        // ... (error handling)
      }
    }
  });

  server.listen(PORT, async () => {
    const callbackUrl = `http://localhost:${PORT}/callback`;
    const targetUrl = `${WEB_URL}?redirect_uri=${encodeURIComponent(callbackUrl)}`;
    await open(targetUrl);
    console.log(chalk.gray(`\nIf the browser doesn't open, visit this link manually:`));
    console.log(chalk.underline(targetUrl));
  });
};