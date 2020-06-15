import createIntervalTree from 'interval-tree';
import { CalendarEvent, CalendarEventSharedData } from 'proton-shared/lib/interfaces/calendar';
import { VcalVeventComponent } from 'proton-shared/lib/interfaces/calendar/VcalModel';
import { OccurrenceIterationCache } from 'proton-shared/lib/calendar/recurring';
import { EventPersonalMap } from '../../../interfaces/EventPersonalMap';

export type IntervalTree = ReturnType<typeof createIntervalTree>;

export interface RecurringCache {
    parentEventID?: string;
    cache?: Partial<OccurrenceIterationCache>;
    recurrenceInstances?: { [key: number]: string };
}

export type DecryptedEventPersonalMap = EventPersonalMap;
export type DecryptedEventTupleResult = [VcalVeventComponent, DecryptedEventPersonalMap];
export type EventReadResult = {
    result?: DecryptedEventTupleResult;
    error?: Error;
};

export interface CalendarEventStoreRecord {
    utcStart: Date;
    utcEnd: Date;

    isAllDay: boolean;
    isAllPartDay: boolean;

    eventData?: CalendarEvent | CalendarEventSharedData;
    eventComponent: VcalVeventComponent;
    eventReadResult?: EventReadResult;
    eventPromise?: Promise<void>;
}

export type RecurringEventsCache = Map<string, RecurringCache>;
export type EventsCache = Map<string, CalendarEventStoreRecord>;
export type FetchCache = Map<string, { promise?: Promise<void>; dateRange: [Date, Date] }>;
export type FetchUidCache = Map<string, { promise?: Promise<void> }>;
export interface CalendarEventCache {
    events: EventsCache;
    recurringEvents: RecurringEventsCache;
    tree: IntervalTree;
    fetchTree: IntervalTree;
    fetchCache: FetchCache;
    fetchUidCache: FetchUidCache;
}

export interface CalendarsEventsCache {
    ref: number;
    isUnmounted: boolean;
    calendars: {
        [key: string]: CalendarEventCache;
    };
    getCachedEvent: (calendarID: string, eventID: string) => CalendarEvent | undefined;
    getCachedRecurringEvent: (calendarID: string, uid: string) => RecurringCache | undefined;
    rerender?: () => void;
}

export type GetDecryptedEventCb = (Event: CalendarEvent) => Promise<DecryptedEventTupleResult>;
