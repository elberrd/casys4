import type { Id } from "@/convex/_generated/dataModel";

export interface RNMCalendarEvent {
  id: Id<"individualProcesses"> | string;
  title: string;
  start: Date;
  end: Date;
  resource: {
    processId: Id<"individualProcesses">;
    rnmNumber?: string;
    companyName?: string;
    groupedEvents?: RNMCalendarEvent[];
  };
}
