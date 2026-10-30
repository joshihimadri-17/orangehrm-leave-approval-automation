const { formatByPattern } = require('../utils/dateUtils');

/**
 * OrangeHRM builds its forms from "oxd" components: a label plus a custom control inside
 * `.oxd-input-group`. These helpers find a control by its visible label, so page objects
 * never rely on field order.
 */
function fieldGroup(page, label) {
  return page.locator('.oxd-input-group').filter({ has: page.locator('label', { hasText: label }) });
}

/** OrangeHRM's custom (non-native) dropdown. */
async function selectOption(page, label, optionText) {
  await fieldGroup(page, label).locator('.oxd-select-text').click();
  await page.getByRole('option', { name: optionText, exact: true }).click();
}

/**
 * Fills a date field in whatever format the instance is configured for: the placeholder
 * (e.g. 'yyyy-dd-mm') is read at run time and the date is formatted to match.
 */
async function fillDate(page, label, date) {
  const input = fieldGroup(page, label).locator('input');
  const pattern = await input.getAttribute('placeholder');
  await input.fill(formatByPattern(date, pattern));
  await input.press('Tab');
}

/** Employee-name autocomplete: types the name and picks the matching suggestion. */
async function selectEmployee(page, label, fullName) {
  const input = fieldGroup(page, label).locator('input');
  await input.fill(fullName);
  const suggestion = page.locator('.oxd-autocomplete-option').filter({ hasText: fullName.split(' ').pop() });
  await suggestion.first().click();
}

module.exports = { fieldGroup, selectOption, fillDate, selectEmployee };
