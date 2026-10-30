const { BasePage } = require('./BasePage');
const { selectOption, fillDate, fieldGroup } = require('../components/FormControls');
const { logger } = require('../utils/logger');

/** Leave > Apply (employee self-service). */
class ApplyLeavePage extends BasePage {
  constructor(page) {
    super(page);
    this.balance = page.locator('.orangehrm-leave-balance-text');
    this.comment = fieldGroup(page, 'Comments').locator('textarea');
    this.applyButton = page.getByRole('button', { name: 'Apply' });
  }

  async open() {
    await super.open('/leave/applyLeave');
  }

  /**
   * Applies for a single full day of leave and returns the request OrangeHRM created.
   * The Leave Request ID isn't shown on screen, so it's captured from the API response
   * that the Apply button triggers.
   * @returns {Promise<{id: number, leaveType: {name: string}, dateApplied: string}>}
   */
  async applyForLeave({ type, date, comment }) {
    await selectOption(this.page, 'Leave Type', type);
    await this.balance.waitFor();
    await fillDate(this.page, 'From Date', date);
    await this.comment.fill(comment);

    const [response] = await Promise.all([
      this.page.waitForResponse((r) => r.url().endsWith('/api/v2/leave/leave-requests') && r.request().method() === 'POST'),
      this.applyButton.click(),
    ]);
    if (!response.ok()) throw new Error(`Apply leave failed with ${response.status()}: ${await response.text()}`);
    const request = (await response.json()).data;
    logger.info('Leave applied', { leaveRequestId: request.id, date: request.dateApplied, leaveType: request.leaveType.name });
    return request;
  }
}

module.exports = { ApplyLeavePage };
