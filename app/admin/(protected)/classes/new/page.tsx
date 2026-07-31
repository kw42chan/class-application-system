import Link from "next/link";
import { ClassForm } from "@/components/class-form";

export default function NewClassPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/admin"
        className="text-sm text-muted underline-offset-4 hover:underline"
      >
        &larr; All classes
      </Link>
      <h1 className="mt-4 mb-6 text-2xl font-bold tracking-tight">New class</h1>
      <ClassForm />
    </div>
  );
}
