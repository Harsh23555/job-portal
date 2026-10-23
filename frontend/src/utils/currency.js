/** Currency conversion and formatting utilities (INR / USD). */

export const USD_TO_INR = 83;

/** Converts USD amount to INR. */
export function convertUSDToINR(amount) {
  if (amount === null || amount === undefined || amount === "") return null;

  let num;
  if (typeof amount === "string") {
    const clean = amount.trim().replace(/[$,]/g, "");
    if (/k$/i.test(clean)) {
      num = parseFloat(clean.slice(0, -1)) * 1000;
    } else {
      num = parseFloat(clean);
    }
  } else {
    num = Number(amount);
  }

  if (isNaN(num)) return null;
  return Math.round(num * USD_TO_INR);
}

/** Formats number to Indian abbreviated format (₹1L, ₹10L, ₹1Cr). */
export function formatINR(amount) {
  if (amount === null || amount === undefined || amount === "") return "";
  const num = Number(amount);
  if (isNaN(num)) return String(amount);

  const sign = num < 0 ? "-" : "";
  const abs = Math.abs(num);

  // 1 Crore = 10,000,000
  if (abs >= 10000000) {
    const cr = abs / 10000000;
    const formattedCr = Number(cr.toFixed(2));
    return `${sign}₹${formattedCr}Cr`;
  }

  // 1 Lakh = 100,000
  if (abs >= 100000) {
    const lakh = abs / 100000;
    const formattedLakh = Number(lakh.toFixed(2));
    return `${sign}₹${formattedLakh}L`;
  }

  // 1 Thousand = 1,000
  if (abs >= 1000) {
    const k = abs / 1000;
    const formattedK = Number(k.toFixed(2));
    return `${sign}₹${formattedK}k`;
  }

  return `${sign}₹${abs}`;
}

/** Parses and converts salary string to INR format. */
export function parseAndConvertSalaryString(salaryStr = "") {
  if (!salaryStr || typeof salaryStr !== "string") return salaryStr || "";

  // Check if already formatted in INR with L or Cr
  if (!salaryStr.includes("$") && !/\bUSD\b/i.test(salaryStr)) {
    if (/₹\s*\d+(?:\.\d+)?\s*(?:L|Cr|k)\b/i.test(salaryStr) && !/\d{5,}/.test(salaryStr.replace(/,/g, ""))) {
      return salaryStr;
    }
  }

  const hasSuffixYr = /\/\s*yr\b/i.test(salaryStr);
  const hasSuffixMo = /\/\s*(?:month|mo)\b/i.test(salaryStr);
  const hasStipend = /stipend/i.test(salaryStr);
  let defaultSuffix = "";
  if (hasSuffixYr) defaultSuffix = " / yr";
  else if (hasSuffixMo) defaultSuffix = hasStipend ? " / month Stipend" : " / month";

  // Handle USD
  if (salaryStr.includes("$") || /\bUSD\b/i.test(salaryStr)) {
    const regex = /\$?\s*(\d+(?:,\d+)*(?:\.\d+)?)\s*(k)?/gi;
    const matches = [];
    let match;
    while ((match = regex.exec(salaryStr)) !== null) {
      const valStr = match[1].replace(/,/g, "");
      const isK = Boolean(match[2]);
      const rawNum = parseFloat(valStr) * (isK ? 1000 : 1);
      if (!isNaN(rawNum) && rawNum > 0) {
        matches.push(rawNum);
      }
    }

    if (matches.length >= 2) {
      const minINR = convertUSDToINR(Math.min(matches[0], matches[1]));
      const maxINR = convertUSDToINR(Math.max(matches[0], matches[1]));
      return `${formatINR(minINR)} - ${formatINR(maxINR)}${defaultSuffix || " / yr"}`;
    } else if (matches.length === 1) {
      const inr = convertUSDToINR(matches[0]);
      return `${formatINR(inr)}${defaultSuffix || " / yr"}`;
    }
  }

  // Handle INR numbers
  const rawNums = salaryStr
    .replace(/,/g, "")
    .match(/\d+(?:\.\d+)?/g)
    ?.map(Number)
    .filter((n) => !isNaN(n) && n > 0) || [];

  if (rawNums.length >= 2) {
    const minVal = Math.min(rawNums[0], rawNums[1]);
    const maxVal = Math.max(rawNums[0], rawNums[1]);
    return `${formatINR(minVal)} - ${formatINR(maxVal)}${defaultSuffix || " / yr"}`;
  } else if (rawNums.length === 1) {
    return `${formatINR(rawNums[0])}${defaultSuffix}`;
  }

  return salaryStr;
}

/** Formats salary for UI display. */
export function formatSalaryDisplay(salary, fallback = "Competitive") {
  if (salary === null || salary === undefined || salary === "") {
    return fallback;
  }

  if (typeof salary === "number") {
    if (isNaN(salary) || salary <= 0) return fallback;
    return `${formatINR(salary)} / yr`;
  }

  if (typeof salary === "string") {
    const trimmed = salary.trim();
    if (!trimmed) return fallback;

    if (/^\d+$/.test(trimmed)) {
      const num = parseInt(trimmed, 10);
      if (isNaN(num) || num <= 0) return fallback;
      return `${formatINR(num)} / yr`;
    }

    return parseAndConvertSalaryString(trimmed);
  }

  return fallback;
}

/** Formats salary range in INR. */
export function formatSalaryRangeINR(min, max, currency = "INR", rawDisplay = "") {
  const isUSD = (currency || "").toUpperCase() === "USD";

  const numMin = min !== null && min !== undefined && !isNaN(Number(min)) ? Number(min) : null;
  const numMax = max !== null && max !== undefined && !isNaN(Number(max)) ? Number(max) : null;

  if (numMin === null && numMax === null) {
    if (rawDisplay) {
      return parseAndConvertSalaryString(rawDisplay);
    }
    return "";
  }

  const convertedMin = numMin !== null ? (isUSD ? convertUSDToINR(numMin) : Math.round(numMin)) : null;
  const convertedMax = numMax !== null ? (isUSD ? convertUSDToINR(numMax) : Math.round(numMax)) : null;

  if (convertedMin !== null && convertedMax !== null) {
    const finalMin = Math.min(convertedMin, convertedMax);
    const finalMax = Math.max(convertedMin, convertedMax);
    return `${formatINR(finalMin)} - ${formatINR(finalMax)} / yr`;
  }
  if (convertedMin !== null) {
    return `From ${formatINR(convertedMin)} / yr`;
  }
  if (convertedMax !== null) {
    return `Up to ${formatINR(convertedMax)} / yr`;
  }

  return rawDisplay || "";
}

/** Extracts numeric annual salary in INR for sorting. */
export function getJobNumericSalary(jobOrSalary) {
  if (!jobOrSalary) return 0;

  if (typeof jobOrSalary === "number") {
    return isNaN(jobOrSalary) ? 0 : jobOrSalary;
  }

  if (typeof jobOrSalary === "object") {
    if (typeof jobOrSalary.salary === "number" && !isNaN(jobOrSalary.salary)) {
      return jobOrSalary.salary;
    }
    if (typeof jobOrSalary.salaryMin === "number" && !isNaN(jobOrSalary.salaryMin)) {
      return jobOrSalary.salaryMin;
    }
    if (typeof jobOrSalary.salary_min === "number" && !isNaN(jobOrSalary.salary_min)) {
      return jobOrSalary.salary_min;
    }
    if (typeof jobOrSalary.salaryMax === "number" && !isNaN(jobOrSalary.salaryMax)) {
      return jobOrSalary.salaryMax;
    }
    if (typeof jobOrSalary.salary_max === "number" && !isNaN(jobOrSalary.salary_max)) {
      return jobOrSalary.salary_max;
    }
  }

  const str = typeof jobOrSalary === "string" ? jobOrSalary : (jobOrSalary.salaryDisplay || jobOrSalary.salary || "");
  if (typeof str === "string") {
    const crMatch = str.match(/₹?\s*(\d+(?:\.\d+)?)\s*Cr/i);
    if (crMatch) return Math.round(parseFloat(crMatch[1]) * 10000000);

    const lMatch = str.match(/₹?\s*(\d+(?:\.\d+)?)\s*L/i);
    if (lMatch) return Math.round(parseFloat(lMatch[1]) * 100000);

    const kMatch = str.match(/₹?\s*(\d+(?:\.\d+)?)\s*k/i);
    if (kMatch) return Math.round(parseFloat(kMatch[1]) * 1000);

    const digits = str.replace(/,/g, "").match(/\d+/g);
    if (digits && digits.length > 0) {
      return parseInt(digits[0], 10);
    }
  }

  return 0;
}
