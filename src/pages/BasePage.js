const { Header } = require('../components/Header');

/** Behaviour shared by every OrangeHRM page object. */
class BasePage {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    this.header = new Header(page);
    this.toast = page.locator('.oxd-toast');
    this.loader = page.locator('.oxd-loading-spinner');
  }

  /** Opens an app route, e.g. '/leave/applyLeave', and waits for its loading spinner to go away. */
  async open(route) {
    await this.page.goto(`/web/index.php${route}`, { waitUntil: 'domcontentloaded' });
    await this.waitForLoaded();
  }

  async waitForLoaded() {
    await this.loader.first().waitFor({ state: 'hidden' });
  }

  /** Waits for the success toast (e.g. "Successfully Saved") and returns its text. */
  async successMessage() {
    const toast = this.toast.filter({ hasText: 'Success' });
    await toast.waitFor();
    return (await toast.innerText()).replace(/\s+/g, ' ').trim();
  }
}

module.exports = { BasePage };
