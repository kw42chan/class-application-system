// Client-safe class utilities and type definitions
// These have no dependencies on server-side modules

export type ClassRecord = {
  id: number;
  title: string;
  description: string;
  instructor: string;
  location: string;
  schedule: string;
  capacity: number;
  isOpen: boolean;
  waitlistEnabled: boolean;
  createdAt: string;
  /** Confirmed applicants only. */
  applicantCount: number;
  waitlistCount: number;
};

export function seatsLeft(cls: ClassRecord): number {
  return Math.max(0, cls.capacity - cls.applicantCount);
}

export function isAcceptingApplications(cls: ClassRecord): boolean {
  return cls.isOpen && seatsLeft(cls) > 0;
}

export function isAcceptingWaitlist(cls: ClassRecord): boolean {
  return cls.isOpen && seatsLeft(cls) === 0 && cls.waitlistEnabled;
}

export function isAcceptingAnything(cls: ClassRecord): boolean {
  return isAcceptingApplications(cls) || isAcceptingWaitlist(cls);
}
