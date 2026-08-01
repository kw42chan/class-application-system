import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// A throwaway file database, pointed at before the data layer loads.
// `:memory:` is not usable here — libSQL recycles the connection between
// operations, so each statement would see a fresh, empty database.
const dir = mkdtempSync(path.join(tmpdir(), "cas-test-"));
process.env.DATABASE_URL = `file:${path.join(dir, "test.db").replace(/\\/g, "/")}`;

type ClassesModule = typeof import("@/lib/classes");
let lib: ClassesModule;

beforeAll(async () => {
  lib = await import("@/lib/classes");
});

afterAll(async () => {
  // Windows refuses to unlink a file whose handle is still open, so close the
  // connection first. Leftover files in the OS temp dir are harmless either way.
  const { db } = await import("@/lib/db");
  db.close();
  try {
    rmSync(dir, { recursive: true, force: true });
  } catch {
    // Best effort — the OS will reclaim it.
  }
});

let counter = 0;

async function makeClass(
  overrides: Partial<Parameters<ClassesModule["createClass"]>[0]> = {},
) {
  counter += 1;
  return lib.createClass({
    title: `Class ${counter}`,
    description: "",
    instructor: "",
    location: "",
    schedule: "",
    capacity: 2,
    isOpen: true,
    waitlistEnabled: false,
    ...overrides,
  });
}

/** Distinct phone numbers so the duplicate rule doesn't interfere. */
function phone(n: number) {
  return `6012345${String(n).padStart(4, "0")}`;
}

describe("applyToClass", () => {
  it("confirms an applicant while seats remain", async () => {
    const id = await makeClass({ capacity: 2 });
    const result = await lib.applyToClass(id, "Ann", phone(1), "+60 12 345 0001");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.status).toBe("confirmed");
    expect(result.position).toBeNull();
    expect(result.withdrawToken).toMatch(/^[A-Za-z0-9_-]{20,}$/);
  });

  it("refuses a closed class", async () => {
    const id = await makeClass({ isOpen: false });
    const result = await lib.applyToClass(id, "Ben", phone(2), "+60 12 345 0002");

    expect(result).toEqual({ ok: false, reason: "closed" });
  });

  it("refuses a missing class", async () => {
    const result = await lib.applyToClass(999999, "Cat", phone(3), "+60 12 345 0003");
    expect(result).toEqual({ ok: false, reason: "not_found" });
  });

  it("rejects the same number applying twice", async () => {
    const id = await makeClass({ capacity: 5 });
    await lib.applyToClass(id, "Dee", phone(4), "+60 12 345 0004");
    const second = await lib.applyToClass(id, "Dee again", phone(4), "+60 12 345 0004");

    expect(second).toEqual({ ok: false, reason: "duplicate" });
  });

  it("allows the same number to apply to a different class", async () => {
    const first = await makeClass({ capacity: 5 });
    const second = await makeClass({ capacity: 5 });
    await lib.applyToClass(first, "Eve", phone(5), "+60 12 345 0005");
    const result = await lib.applyToClass(second, "Eve", phone(5), "+60 12 345 0005");

    expect(result.ok).toBe(true);
  });

  it("refuses once full when no waitlist is enabled", async () => {
    const id = await makeClass({ capacity: 1, waitlistEnabled: false });
    await lib.applyToClass(id, "Fay", phone(6), "+60 12 345 0006");
    const overflow = await lib.applyToClass(id, "Gil", phone(7), "+60 12 345 0007");

    expect(overflow).toEqual({ ok: false, reason: "full" });
  });

  it("queues overflow applicants when a waitlist is enabled", async () => {
    const id = await makeClass({ capacity: 1, waitlistEnabled: true });
    await lib.applyToClass(id, "Hal", phone(8), "+60 12 345 0008");

    const first = await lib.applyToClass(id, "Ivy", phone(9), "+60 12 345 0009");
    const second = await lib.applyToClass(id, "Jon", phone(10), "+60 12 345 0010");

    expect(first.ok && first.status).toBe("waitlisted");
    expect(first.ok && first.position).toBe(1);
    expect(second.ok && second.position).toBe(2);

    const counts = await lib.countApplications(id);
    expect(counts).toMatchObject({ confirmed: 1, waitlisted: 2, cancelled: 0 });
  });

  // The reason applyToClass uses a write transaction: a plain count-then-insert
  // lets several racing requests each see the same free seat.
  it("never hands out more seats than the capacity under concurrency", async () => {
    const capacity = 3;
    const id = await makeClass({ capacity, waitlistEnabled: false });

    const attempts = Array.from({ length: 12 }, (_, i) =>
      lib.applyToClass(id, `Racer ${i}`, phone(100 + i), `+60 12 345 ${100 + i}`),
    );
    const settled = await Promise.allSettled(attempts);

    const confirmed = settled.filter(
      (r) => r.status === "fulfilled" && r.value.ok && r.value.status === "confirmed",
    );
    expect(confirmed).toHaveLength(capacity);

    const counts = await lib.countApplications(id);
    expect(counts.confirmed).toBe(capacity);
  });
});

describe("confirmApplication", () => {
  it("promotes a waitlisted applicant into a freed seat", async () => {
    const id = await makeClass({ capacity: 1, waitlistEnabled: true });
    const seated = await lib.applyToClass(id, "Kim", phone(20), "+60 12 345 0020");
    const queued = await lib.applyToClass(id, "Lee", phone(21), "+60 12 345 0021");
    if (!seated.ok || !queued.ok) throw new Error("setup failed");

    // No seat yet, so promotion must fail.
    expect(await lib.confirmApplication(queued.applicationId)).toEqual({
      ok: false,
      reason: "full",
    });

    await lib.cancelApplication(seated.applicationId);
    expect(await lib.confirmApplication(queued.applicationId)).toEqual({ ok: true });

    const counts = await lib.countApplications(id);
    expect(counts).toMatchObject({ confirmed: 1, waitlisted: 0, cancelled: 1 });
  });

  it("reports a missing application", async () => {
    expect(await lib.confirmApplication(999999)).toEqual({
      ok: false,
      reason: "not_found",
    });
  });
});

describe("withdrawByToken", () => {
  it("cancels the application behind a valid token", async () => {
    const id = await makeClass({ capacity: 2 });
    const applied = await lib.applyToClass(id, "Mia", phone(30), "+60 12 345 0030");
    if (!applied.ok) throw new Error("setup failed");

    const result = await lib.withdrawByToken(applied.withdrawToken);
    expect(result.ok).toBe(true);

    const counts = await lib.countApplications(id);
    expect(counts).toMatchObject({ confirmed: 0, cancelled: 1 });
  });

  it("frees the seat so someone else can take it", async () => {
    const id = await makeClass({ capacity: 1 });
    const applied = await lib.applyToClass(id, "Ned", phone(31), "+60 12 345 0031");
    if (!applied.ok) throw new Error("setup failed");

    expect(await lib.applyToClass(id, "Oli", phone(32), "+60 12 345 0032")).toEqual({
      ok: false,
      reason: "full",
    });

    await lib.withdrawByToken(applied.withdrawToken);
    const retry = await lib.applyToClass(id, "Oli", phone(32), "+60 12 345 0032");
    expect(retry.ok && retry.status).toBe("confirmed");
  });

  it("refuses a second withdrawal with the same token", async () => {
    const id = await makeClass({ capacity: 2 });
    const applied = await lib.applyToClass(id, "Pat", phone(33), "+60 12 345 0033");
    if (!applied.ok) throw new Error("setup failed");

    await lib.withdrawByToken(applied.withdrawToken);
    expect(await lib.withdrawByToken(applied.withdrawToken)).toEqual({
      ok: false,
      reason: "already_withdrawn",
    });
  });

  it("refuses an unknown token", async () => {
    expect(await lib.withdrawByToken("nope")).toEqual({
      ok: false,
      reason: "not_found",
    });
  });

  it("lets a withdrawn applicant re-apply with the same number", async () => {
    const id = await makeClass({ capacity: 2 });
    const applied = await lib.applyToClass(id, "Quin", phone(34), "+60 12 345 0034");
    if (!applied.ok) throw new Error("setup failed");

    await lib.withdrawByToken(applied.withdrawToken);
    const again = await lib.applyToClass(id, "Quin", phone(34), "+60 12 345 0034");
    expect(again.ok).toBe(true);
  });
});

describe("listApplications", () => {
  it("orders confirmed, then waitlisted, then cancelled, and paginates", async () => {
    const id = await makeClass({ capacity: 2, waitlistEnabled: true });
    const a = await lib.applyToClass(id, "Rae", phone(40), "+60 12 345 0040");
    await lib.applyToClass(id, "Sam", phone(41), "+60 12 345 0041");
    await lib.applyToClass(id, "Tom", phone(42), "+60 12 345 0042"); // waitlisted
    if (!a.ok) throw new Error("setup failed");
    await lib.cancelApplication(a.applicationId); // Rae -> cancelled

    // Cancelling Rae frees a seat, so Tom stays queued until promoted.
    const all = await lib.listApplications(id);
    expect(all.map((r) => r.status)).toEqual([
      "confirmed",
      "waitlisted",
      "cancelled",
    ]);

    const firstPage = await lib.listApplications(id, { limit: 2, offset: 0 });
    const secondPage = await lib.listApplications(id, { limit: 2, offset: 2 });
    expect(firstPage).toHaveLength(2);
    expect(secondPage).toHaveLength(1);
    expect(secondPage[0].status).toBe("cancelled");
  });
});
