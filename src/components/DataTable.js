/**
 * OrangeHRM's list tables (`.oxd-table`). Cells are read by COLUMN HEADER NAME, not by position,
 * so a column being added or reordered doesn't break the tests.
 */
class DataTable {
  /** @param {import('@playwright/test').Page} page */
  constructor(page) {
    this.page = page;
    this.root = page.locator('.oxd-table');
    this.headers = this.root.locator('.oxd-table-header .oxd-table-th');
    this.rows = this.root.locator('.oxd-table-body .oxd-table-card');
    this.noRecords = page.getByText('No Records Found');
  }

  /** The single row whose text contains `text` (e.g. a unique leave comment). */
  rowContaining(text) {
    return this.rows.filter({ hasText: text });
  }

  async columnIndex(headerName) {
    const names = (await this.headers.allInnerTexts()).map((h) => h.trim());
    const index = names.findIndex((name) => name === headerName);
    if (index === -1) throw new Error(`Column "${headerName}" not found. Columns: ${names.join(', ')}`);
    return index;
  }

  async cellText(row, headerName) {
    const index = await this.columnIndex(headerName);
    return (await row.locator('.oxd-table-cell').nth(index).innerText()).trim();
  }
}

module.exports = { DataTable };
