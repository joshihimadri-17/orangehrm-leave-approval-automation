const pad = (value) => String(value).padStart(2, '0');

/** Date -> 'YYYY-MM-DD' in local time (the format OrangeHRM's API uses). */
function toIsoDate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * Formats a date using the pattern OrangeHRM shows as the date-input placeholder,
 * e.g. 'yyyy-dd-mm' or 'dd-mm-yyyy'. The demo's format is configurable, so it's read at run time.
 */
function formatByPattern(date, pattern) {
  return pattern
    .replace('yyyy', String(date.getFullYear()))
    .replace('mm', pad(date.getMonth() + 1))
    .replace('dd', pad(date.getDate()));
}

const isWeekend = (date) => date.getDay() === 0 || date.getDay() === 6;

/**
 * First working day at least `daysAhead` days from `from`: skips weekends and any holiday
 * in `holidays` (array of 'YYYY-MM-DD'), so the leave request always covers a real working day.
 */
function nextWorkingDay(daysAhead, holidays = [], from = new Date()) {
  const date = new Date(from.getFullYear(), from.getMonth(), from.getDate() + daysAhead);
  while (isWeekend(date) || holidays.includes(toIsoDate(date))) {
    date.setDate(date.getDate() + 1);
  }
  return date;
}

module.exports = { toIsoDate, formatByPattern, nextWorkingDay };
