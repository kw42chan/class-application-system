"use client";

import { useActionState } from "react";
import Link from "next/link";
import { saveClass, type FormState } from "@/app/actions/admin";
import { SubmitButton } from "@/components/form-buttons";
import type { ClassRecord } from "@/lib/classes";

const INITIAL: FormState = { status: "idle" };

export function ClassForm({ initial }: { initial?: ClassRecord }) {
  const [state, formAction] = useActionState(saveClass, INITIAL);
  const isEdit = Boolean(initial);

  return (
    <form action={formAction} className="card space-y-5 p-6">
      {initial && <input type="hidden" name="id" value={initial.id} />}

      <div>
        <label htmlFor="title" className="label">
          Class title <span className="text-red-500">*</span>
        </label>
        <input
          id="title"
          name="title"
          type="text"
          required
          maxLength={120}
          defaultValue={initial?.title ?? ""}
          placeholder="e.g. Beginner Guitar — Term 3"
          className="input"
        />
      </div>

      <div>
        <label htmlFor="description" className="label">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          maxLength={2000}
          defaultValue={initial?.description ?? ""}
          placeholder="What the class covers, who it's for, what to bring…"
          className="input resize-y"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label htmlFor="instructor" className="label">
            Instructor
          </label>
          <input
            id="instructor"
            name="instructor"
            type="text"
            maxLength={120}
            defaultValue={initial?.instructor ?? ""}
            placeholder="e.g. Ms. Lim"
            className="input"
          />
        </div>

        <div>
          <label htmlFor="schedule" className="label">
            When
          </label>
          <input
            id="schedule"
            name="schedule"
            type="text"
            maxLength={200}
            defaultValue={initial?.schedule ?? ""}
            placeholder="e.g. Every Tuesday, 8–9.30pm"
            className="input"
          />
        </div>
      </div>

      <div>
        <label htmlFor="location" className="label">
          Where
        </label>
        <input
          id="location"
          name="location"
          type="text"
          maxLength={200}
          defaultValue={initial?.location ?? ""}
          placeholder="e.g. Studio B, or a Zoom link"
          className="input"
        />
      </div>

      <div>
        <label htmlFor="capacity" className="label">
          Applicant limit <span className="text-red-500">*</span>
        </label>
        <input
          id="capacity"
          name="capacity"
          type="number"
          required
          min={1}
          max={10000}
          step={1}
          defaultValue={initial?.capacity ?? 20}
          className="input sm:w-40"
        />
        <p className="mt-1.5 text-xs text-muted">
          Applications stop automatically once this many students have applied.
          {initial && initial.applicantCount > 0 && (
            <> Currently {initial.applicantCount} applied.</>
          )}
        </p>
      </div>

      <label className="flex items-start gap-3 rounded-lg border border-border bg-surface-muted p-4">
        <input
          type="checkbox"
          name="isOpen"
          defaultChecked={initial?.isOpen ?? false}
          className="mt-0.5 h-4 w-4 accent-[var(--brand)]"
        />
        <span>
          <span className="block text-sm font-medium">Open for applications</span>
          <span className="block text-xs text-muted">
            When unchecked, students can see the class but cannot apply.
          </span>
        </span>
      </label>

      {state.status === "error" && (
        <p
          role="alert"
          className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-700 dark:text-red-300"
        >
          {state.message}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <SubmitButton pendingLabel="Saving…">
          {isEdit ? "Save changes" : "Create class"}
        </SubmitButton>
        <Link href="/admin" className="btn-secondary">
          Cancel
        </Link>
      </div>
    </form>
  );
}
