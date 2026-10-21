const UNIT_ALIASES = {
  day: 'days',
  days: 'days',
  week: 'weeks',
  weeks: 'weeks',
  month: 'months',
  months: 'months',
};

const WORD_NUMBERS = {
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  twenty: 20,
  thirty: 30,
};

const parseLegacyDuration = (value) => {
  if (value === undefined || value === null) return null;
  const text = String(value).trim().toLowerCase();
  if (!text) return null;

  const match = text.match(/^(\d+(?:\.\d+)?)\s*(day|days|week|weeks|month|months)?$/);
  if (match) {
    return {
      value: Number(match[1]),
      unit: UNIT_ALIASES[match[2] || 'days'],
    };
  }

  const wordMatch = text.match(/^(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|twenty|thirty)\s*(day|days|week|weeks|month|months)?$/);
  if (wordMatch) {
    return {
      value: WORD_NUMBERS[wordMatch[1]],
      unit: UNIT_ALIASES[wordMatch[2] || 'days'],
    };
  }

  return null;
};

const normalizeDuration = ({ durationValue, durationUnit, duration } = {}) => {
  let value = Number(durationValue);
  let unit = UNIT_ALIASES[String(durationUnit || '').trim().toLowerCase()];

  if (!Number.isFinite(value) || value <= 0 || !unit) {
    const legacy = parseLegacyDuration(duration);
    if (!legacy) return null;
    value = legacy.value;
    unit = legacy.unit;
  }

  value = Math.round(value * 100) / 100;
  return {
    durationValue: value,
    durationUnit: unit,
    duration: `${value} ${unit.slice(0, -1)}`,
  };
};

const calculateEndDate = (startDate, duration) => {
  if (!duration) return null;
  const endDate = new Date(startDate);
  if (Number.isNaN(endDate.getTime())) return null;

  if (duration.durationUnit === 'days') {
    endDate.setDate(endDate.getDate() + duration.durationValue);
  } else if (duration.durationUnit === 'weeks') {
    endDate.setDate(endDate.getDate() + duration.durationValue * 7);
  } else {
    endDate.setMonth(endDate.getMonth() + duration.durationValue);
  }

  return endDate;
};

module.exports = { normalizeDuration, calculateEndDate };
