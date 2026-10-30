const { BasePage } = require('./BasePage');
const { DataTable } = require('../components/DataTable');

/** Leave > My Leave: the employee's own leave requests. */
class MyLeavePage extends BasePage {
  constructor(page) {
    super(page);
    this.table = new DataTable(page);
  }

  async open() {
    await super.open('/leave/viewMyLeaveList');
    await this.table.root.waitFor();
  }

  /** The instance's date format, read from the filter's date input (e.g. 'yyyy-dd-mm'). */
  async datePattern() {
    return this.page.locator('.oxd-date-input input').first().getAttribute('placeholder');
  }

  /** Reads one request (found by its unique comment) as { date, type, status }. */
  async getRequest(comment) {
    const row = this.table.rowContaining(comment);
    await row.waitFor();
    return {
      date: await this.table.cellText(row, 'Date'),
      type: await this.table.cellText(row, 'Leave Type'),
      status: await this.table.cellText(row, 'Status'),
    };
  }
}

module.exports = { MyLeavePage };
