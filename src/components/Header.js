/** Top bar shown on every page after login: the user menu with Logout. */
class Header {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    this.userMenu = page.locator('.oxd-userdropdown-tab');
    this.userName = page.locator('.oxd-userdropdown-name');
    this.logoutItem = page.getByRole('menuitem', { name: 'Logout' });
  }

  async logout() {
    await this.userMenu.click();
    await this.logoutItem.click();
    await this.page.waitForURL(/\/auth\/login/);
  }
}

module.exports = { Header };
