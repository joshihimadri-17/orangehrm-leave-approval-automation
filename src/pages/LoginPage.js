const { BasePage } = require('./BasePage');
const { logger } = require('../utils/logger');

class LoginPage extends BasePage {
  constructor(page) {
    super(page);
    this.username = page.getByPlaceholder('Username');
    this.password = page.getByPlaceholder('Password');
    this.loginButton = page.getByRole('button', { name: 'Login' });
  }

  async open() {
    await this.page.goto('/web/index.php/auth/login', { waitUntil: 'domcontentloaded' });
  }

  /**
   * Logs in and waits until the user menu is visible. OrangeHRM redirects to the last visited
   * page after login (not always the dashboard), so the user menu is the reliable signal.
   */
  async login(username, password) {
    await this.open();
    await this.username.fill(username);
    await this.password.fill(password);
    await this.loginButton.click();
    await this.header.userMenu.waitFor();
    logger.info('Logged in', { username });
  }
}

module.exports = { LoginPage };
