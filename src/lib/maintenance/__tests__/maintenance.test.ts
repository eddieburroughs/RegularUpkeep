/**
 * Maintenance Calendar Library Tests
 *
 * Tests for due date computation, status logic, and utility functions.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  computeNextDueDate,
  formatDueDate,
  getTaskStatus,
  getFrequencyLabel,
  CATEGORIES,
  PRIORITIES,
  SKILL_LEVELS,
  FREQUENCY_TYPES,
} from "../index";

// ============================================================================
// computeNextDueDate
// ============================================================================

describe("computeNextDueDate", () => {
  const baseDate = new Date("2025-06-15");

  describe("weekly frequency", () => {
    it("adds 1 week for interval 1", () => {
      const result = computeNextDueDate("weekly", 1, null, baseDate);
      expect(result?.toISOString().split("T")[0]).toBe("2025-06-22");
    });

    it("adds 2 weeks for interval 2", () => {
      const result = computeNextDueDate("weekly", 2, null, baseDate);
      expect(result?.toISOString().split("T")[0]).toBe("2025-06-29");
    });

    it("adds 4 weeks for interval 4", () => {
      const result = computeNextDueDate("weekly", 4, null, baseDate);
      expect(result?.toISOString().split("T")[0]).toBe("2025-07-13");
    });
  });

  describe("monthly frequency", () => {
    it("adds 1 month for interval 1", () => {
      const result = computeNextDueDate("monthly", 1, null, baseDate);
      expect(result?.toISOString().split("T")[0]).toBe("2025-07-15");
    });

    it("adds 3 months for interval 3", () => {
      const result = computeNextDueDate("monthly", 3, null, baseDate);
      expect(result?.toISOString().split("T")[0]).toBe("2025-09-15");
    });

    it("handles year rollover", () => {
      const novDate = new Date("2025-11-15");
      const result = computeNextDueDate("monthly", 3, null, novDate);
      expect(result?.toISOString().split("T")[0]).toBe("2026-02-15");
    });
  });

  describe("seasonal frequency", () => {
    it("returns next suggested month in same year", () => {
      const marchDate = new Date("2025-03-15");
      const suggestedMonths = [3, 6, 9, 12]; // Mar, Jun, Sep, Dec
      const result = computeNextDueDate("seasonal", 1, suggestedMonths, marchDate);
      // Current month is 3, so next should be 6 (June)
      expect(result?.getMonth()).toBe(5); // June (0-indexed)
      expect(result?.getFullYear()).toBe(2025);
    });

    it("wraps to next year when past all suggested months", () => {
      const decDate = new Date("2025-12-15");
      const suggestedMonths = [3, 6, 9, 12]; // Mar, Jun, Sep, Dec
      const result = computeNextDueDate("seasonal", 1, suggestedMonths, decDate);
      // Current month is 12, past all months, so wrap to March next year
      expect(result?.getMonth()).toBe(2); // March (0-indexed)
      expect(result?.getFullYear()).toBe(2026);
    });

    it("defaults to 3 months when no suggested months", () => {
      const result = computeNextDueDate("seasonal", 1, null, baseDate);
      expect(result?.toISOString().split("T")[0]).toBe("2025-09-15");
    });

    it("defaults to 3 months for empty suggested months", () => {
      const result = computeNextDueDate("seasonal", 1, [], baseDate);
      expect(result?.toISOString().split("T")[0]).toBe("2025-09-15");
    });
  });

  describe("annual frequency", () => {
    it("adds 1 year for interval 1", () => {
      const result = computeNextDueDate("annual", 1, null, baseDate);
      expect(result?.toISOString().split("T")[0]).toBe("2026-06-15");
    });

    it("adds 2 years for interval 2", () => {
      const result = computeNextDueDate("annual", 2, null, baseDate);
      expect(result?.toISOString().split("T")[0]).toBe("2027-06-15");
    });
  });

  describe("multi_year frequency", () => {
    it("adds 3 years for interval 3", () => {
      const result = computeNextDueDate("multi_year", 3, null, baseDate);
      expect(result?.toISOString().split("T")[0]).toBe("2028-06-15");
    });

    it("adds 5 years for interval 5", () => {
      const result = computeNextDueDate("multi_year", 5, null, baseDate);
      expect(result?.toISOString().split("T")[0]).toBe("2030-06-15");
    });
  });

  describe("one_time frequency", () => {
    it("returns null (no next date)", () => {
      const result = computeNextDueDate("one_time", 1, null, baseDate);
      expect(result).toBeNull();
    });
  });

  describe("default frequency handling", () => {
    it("defaults to 1 year for unknown types", () => {
      // @ts-expect-error Testing unknown type
      const result = computeNextDueDate("unknown_type", 1, null, baseDate);
      expect(result?.toISOString().split("T")[0]).toBe("2026-06-15");
    });
  });

  describe("default fromDate", () => {
    it("uses current date when no fromDate provided", () => {
      const result = computeNextDueDate("weekly", 1, null);
      expect(result).toBeDefined();
      // Should be about 1 week from now
      const now = new Date();
      const expected = new Date(now);
      expected.setDate(expected.getDate() + 7);
      // Check that it's within a day (accounting for time differences)
      const diffDays = Math.abs(
        (result!.getTime() - expected.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(diffDays).toBeLessThan(1);
    });
  });
});

// ============================================================================
// formatDueDate
// ============================================================================

describe("formatDueDate", () => {
  let mockDate: Date;

  beforeEach(() => {
    // Mock "today" as June 15, 2025
    mockDate = new Date("2025-06-15T12:00:00");
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 'Not scheduled' for null", () => {
    expect(formatDueDate(null)).toBe("Not scheduled");
  });

  it("returns 'Today' for today's date", () => {
    expect(formatDueDate("2025-06-15")).toBe("Today");
  });

  it("returns 'Tomorrow' for tomorrow", () => {
    expect(formatDueDate("2025-06-16")).toBe("Tomorrow");
  });

  it("returns 'Yesterday' for yesterday", () => {
    expect(formatDueDate("2025-06-14")).toBe("Yesterday");
  });

  it("returns 'In X days' for near future", () => {
    expect(formatDueDate("2025-06-18")).toBe("In 3 days");
    expect(formatDueDate("2025-06-20")).toBe("In 5 days");
  });

  it("returns 'In X weeks' for 1-4 weeks out", () => {
    expect(formatDueDate("2025-06-25")).toBe("In 2 weeks");
    expect(formatDueDate("2025-07-06")).toBe("In 3 weeks");
  });

  it("returns 'In X months' for 1-12 months out", () => {
    // Note: The function uses Math.ceil(diffDays / 30), so ~61 days = 3 months
    expect(formatDueDate("2025-08-15")).toBe("In 3 months");
    expect(formatDueDate("2025-12-15")).toBe("In 7 months");
  });

  it("returns 'X days overdue' for recent past", () => {
    expect(formatDueDate("2025-06-13")).toBe("2 days overdue");
    expect(formatDueDate("2025-06-10")).toBe("5 days overdue");
  });

  it("returns 'X weeks overdue' for 1-4 weeks past", () => {
    expect(formatDueDate("2025-06-05")).toBe("1 weeks overdue");
    expect(formatDueDate("2025-05-25")).toBe("3 weeks overdue");
  });

  it("returns 'X months overdue' for more than 4 weeks past", () => {
    expect(formatDueDate("2025-05-01")).toBe("1 months overdue");
    expect(formatDueDate("2025-03-15")).toBe("3 months overdue");
  });

  it("returns formatted date for more than 1 year out", () => {
    const result = formatDueDate("2026-08-15");
    expect(result).toContain("2026");
  });
});

// ============================================================================
// getTaskStatus
// ============================================================================

describe("getTaskStatus", () => {
  let mockDate: Date;

  beforeEach(() => {
    mockDate = new Date("2025-06-15T12:00:00");
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("no due date", () => {
    it("returns 'completed' if last completed exists", () => {
      expect(getTaskStatus(null, "2025-06-01")).toBe("completed");
    });

    it("returns 'upcoming' if never completed", () => {
      expect(getTaskStatus(null, null)).toBe("upcoming");
    });
  });

  describe("with due date", () => {
    it("returns 'overdue' for past dates", () => {
      expect(getTaskStatus("2025-06-14", null)).toBe("overdue");
      expect(getTaskStatus("2025-06-10", null)).toBe("overdue");
      expect(getTaskStatus("2025-01-01", null)).toBe("overdue");
    });

    it("returns 'due' for today", () => {
      expect(getTaskStatus("2025-06-15", null)).toBe("due");
    });

    it("returns 'due' for within 7 days", () => {
      expect(getTaskStatus("2025-06-16", null)).toBe("due");
      expect(getTaskStatus("2025-06-20", null)).toBe("due");
      expect(getTaskStatus("2025-06-22", null)).toBe("due"); // 7 days out
    });

    it("returns 'upcoming' for more than 7 days", () => {
      expect(getTaskStatus("2025-06-23", null)).toBe("upcoming");
      expect(getTaskStatus("2025-07-15", null)).toBe("upcoming");
      expect(getTaskStatus("2025-12-25", null)).toBe("upcoming");
    });
  });
});

// ============================================================================
// getFrequencyLabel
// ============================================================================

describe("getFrequencyLabel", () => {
  describe("weekly", () => {
    it("returns 'Weekly' for interval 1", () => {
      expect(getFrequencyLabel("weekly", 1)).toBe("Weekly");
    });

    it("returns 'Every X weeks' for interval > 1", () => {
      expect(getFrequencyLabel("weekly", 2)).toBe("Every 2 weeks");
      expect(getFrequencyLabel("weekly", 4)).toBe("Every 4 weeks");
    });
  });

  describe("monthly", () => {
    it("returns 'Monthly' for interval 1", () => {
      expect(getFrequencyLabel("monthly", 1)).toBe("Monthly");
    });

    it("returns 'Every X months' for interval > 1", () => {
      expect(getFrequencyLabel("monthly", 3)).toBe("Every 3 months");
      expect(getFrequencyLabel("monthly", 6)).toBe("Every 6 months");
    });
  });

  describe("seasonal", () => {
    it("returns 'Seasonal' regardless of interval", () => {
      expect(getFrequencyLabel("seasonal", 1)).toBe("Seasonal");
      expect(getFrequencyLabel("seasonal", 3)).toBe("Seasonal");
    });
  });

  describe("annual", () => {
    it("returns 'Annual' for interval 1", () => {
      expect(getFrequencyLabel("annual", 1)).toBe("Annual");
    });

    it("returns 'Every X years' for interval > 1", () => {
      expect(getFrequencyLabel("annual", 2)).toBe("Every 2 years");
    });
  });

  describe("multi_year", () => {
    it("returns 'Every X years'", () => {
      expect(getFrequencyLabel("multi_year", 3)).toBe("Every 3 years");
      expect(getFrequencyLabel("multi_year", 5)).toBe("Every 5 years");
    });
  });

  describe("one_time", () => {
    it("returns 'One-time'", () => {
      expect(getFrequencyLabel("one_time", 1)).toBe("One-time");
    });
  });

  describe("unknown type", () => {
    it("returns the type as-is", () => {
      // @ts-expect-error Testing unknown type
      expect(getFrequencyLabel("custom", 1)).toBe("custom");
    });
  });
});

// ============================================================================
// Constants
// ============================================================================

describe("CATEGORIES constant", () => {
  it("has all expected categories", () => {
    const categoryValues = CATEGORIES.map((c) => c.value);
    expect(categoryValues).toContain("hvac");
    expect(categoryValues).toContain("plumbing");
    expect(categoryValues).toContain("electrical");
    expect(categoryValues).toContain("appliances");
    expect(categoryValues).toContain("exterior");
    expect(categoryValues).toContain("interior");
    expect(categoryValues).toContain("landscaping");
    expect(categoryValues).toContain("pest_control");
    expect(categoryValues).toContain("safety");
    expect(categoryValues).toContain("other");
  });

  it("has labels for all categories", () => {
    for (const cat of CATEGORIES) {
      expect(cat.label).toBeTruthy();
      expect(typeof cat.label).toBe("string");
    }
  });
});

describe("PRIORITIES constant", () => {
  it("has expected priority levels", () => {
    const priorityValues = PRIORITIES.map((p) => p.value);
    expect(priorityValues).toEqual(["urgent", "high", "normal", "low"]);
  });

  it("has colors for all priorities", () => {
    for (const priority of PRIORITIES) {
      expect(priority.color).toBeTruthy();
      expect(priority.color).toContain("text-");
    }
  });
});

describe("SKILL_LEVELS constant", () => {
  it("has expected skill levels", () => {
    const skillValues = SKILL_LEVELS.map((s) => s.value);
    expect(skillValues).toEqual(["diy", "pro_recommended", "pro_required"]);
  });

  it("has descriptions for all skill levels", () => {
    for (const skill of SKILL_LEVELS) {
      expect(skill.description).toBeTruthy();
      expect(typeof skill.description).toBe("string");
    }
  });
});

describe("FREQUENCY_TYPES constant", () => {
  it("has expected frequency types", () => {
    const freqValues = FREQUENCY_TYPES.map((f) => f.value);
    expect(freqValues).toEqual([
      "weekly",
      "monthly",
      "seasonal",
      "annual",
      "multi_year",
      "one_time",
    ]);
  });
});

// ============================================================================
// Edge Cases
// ============================================================================

describe("Edge cases", () => {
  describe("computeNextDueDate edge cases", () => {
    it("handles leap year correctly for annual", () => {
      const leapYearDate = new Date("2024-02-29");
      const result = computeNextDueDate("annual", 1, null, leapYearDate);
      // Feb 29, 2024 + 1 year = Mar 1, 2025 (since 2025 has no Feb 29)
      expect(result?.getFullYear()).toBe(2025);
    });

    it("handles month end dates correctly", () => {
      const jan31 = new Date("2025-01-31");
      const result = computeNextDueDate("monthly", 1, null, jan31);
      // Jan 31 + 1 month might be Feb 28/March 2-3 depending on implementation
      expect(result?.getMonth()).toBeGreaterThanOrEqual(1); // At least February
    });
  });

  describe("formatDueDate edge cases", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2025-06-15T12:00:00"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("handles invalid date strings gracefully", () => {
      // This tests that the function doesn't throw on weird input
      // The actual output doesn't matter as much as not crashing
      expect(() => formatDueDate("not-a-date")).not.toThrow();
    });

    it("handles timezone differences", () => {
      // Date at midnight UTC might be different in local time
      const result = formatDueDate("2025-06-15");
      expect(result).toBe("Today");
    });
  });

  describe("getTaskStatus edge cases", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2025-06-15T12:00:00"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("handles exactly 7 days from now", () => {
      // June 15 + 7 = June 22 should be "due"
      expect(getTaskStatus("2025-06-22", null)).toBe("due");
    });

    it("handles exactly 8 days from now", () => {
      // June 15 + 8 = June 23 should be "upcoming"
      expect(getTaskStatus("2025-06-23", null)).toBe("upcoming");
    });

    it("handles same-day completion with future due date", () => {
      // Even if completed today, if due date is in the future, it should show status based on due date
      expect(getTaskStatus("2025-06-20", "2025-06-15")).toBe("due");
    });
  });
});
