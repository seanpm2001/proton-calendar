import { parseWithErrors } from 'proton-shared/lib/calendar/vcal';
import {
    getDateProperty,
    getDateTimeProperty,
    getPropertyTzid,
    propertyToUTCDate,
} from 'proton-shared/lib/calendar/vcalConverter';
import {
    getIsIcalPropertyAllDay,
    getIsEventComponent,
    getIsFreebusyComponent,
    getIsJournalComponent,
    getIsTimezoneComponent,
    getIsTodoComponent,
} from 'proton-shared/lib/calendar/vcalHelper';
import { addDays } from 'proton-shared/lib/date-fns-utc';
import {
    convertUTCDateTimeToZone,
    fromUTCDate,
    getSupportedTimezone,
    toLocalDate,
} from 'proton-shared/lib/date/timezone';
import { readFileAsString } from 'proton-shared/lib/helpers/file';
import isTruthy from 'proton-shared/lib/helpers/isTruthy';
import { truncate } from 'proton-shared/lib/helpers/string';
import {
    VcalDateOrDateTimeProperty,
    VcalDateTimeProperty,
    VcalFloatingDateTimeProperty,
    VcalUidProperty,
    VcalValarmComponent,
    VcalVcalendar,
    VcalVeventComponent,
} from 'proton-shared/lib/interfaces/calendar/VcalModel';
import { c } from 'ttag';
import { IMPORT_EVENT_TYPE, ImportEventError } from '../components/import/ImportEventError';
import { IMPORT_ERROR_TYPE, ImportFileError } from '../components/import/ImportFileError';

import {
    MAX_IMPORT_EVENTS,
    MAX_LENGTHS,
    MAX_NOTIFICATIONS,
    MAX_UID_CHARS_DISPLAY,
    MAXIMUM_DATE_UTC,
    MINIMUM_DATE_UTC,
} from '../constants';
import { VcalCalendarComponentOrError } from '../interfaces/Import';
import { getSupportedAlarm } from './alarms';

import {} from './event';
import { getIsRruleConsistent, getIsRruleSupported } from './rrule';

const getParsedComponentHasError = (component: VcalCalendarComponentOrError): component is { error: Error } => {
    return !!(component as { error: Error }).error;
};

export const parseIcs = async (ics: File) => {
    const filename = ics.name;
    try {
        const icsAsString = await readFileAsString(ics);
        if (!icsAsString) {
            throw new ImportFileError(IMPORT_ERROR_TYPE.FILE_EMPTY, filename);
        }
        const parsedVcalendar = parseWithErrors(icsAsString) as VcalVcalendar;
        if (parsedVcalendar.component !== 'vcalendar') {
            throw new ImportFileError(IMPORT_ERROR_TYPE.INVALID_CALENDAR, filename);
        }
        const { components, calscale, 'x-wr-timezone': xWrTimezone } = parsedVcalendar;
        if (!components?.length) {
            throw new ImportFileError(IMPORT_ERROR_TYPE.NO_EVENTS, filename);
        }
        if (components.length > MAX_IMPORT_EVENTS) {
            throw new ImportFileError(IMPORT_ERROR_TYPE.TOO_MANY_EVENTS, filename);
        }
        return { components, calscale: calscale?.value, xWrTimezone: xWrTimezone?.value };
    } catch (e) {
        if (e instanceof ImportFileError) {
            throw e;
        }
        throw new ImportFileError(IMPORT_ERROR_TYPE.FILE_CORRUPTED, filename);
    }
};

/**
 * Get a string that can identify an imported component
 */
const getIdMessage = (vcalComponent: VcalCalendarComponentOrError) => {
    if (getParsedComponentHasError(vcalComponent)) {
        return c('Error importing event').t`Bad format. Component cannot be read`;
    }
    if (getIsTimezoneComponent(vcalComponent)) {
        const tzid = vcalComponent.tzid.value || '';
        return c('Error importing event').t`Timezone ${tzid}`;
    }
    const shortUID = truncate(vcalComponent.uid?.value, MAX_UID_CHARS_DISPLAY);
    if (getIsEventComponent(vcalComponent)) {
        if (shortUID) {
            return c('Error importing event').t`Event ${shortUID}`;
        }
        const { summary, dtstart } = vcalComponent;
        const shortTitle = truncate(summary?.value);
        if (shortTitle) {
            return c('Error importing event').t`Event ${shortTitle}`;
        }
        if (dtstart?.value) {
            const startDate = toLocalDate(dtstart.value);
            return c('Error importing event').t`Event starting on ${startDate}`;
        }
        return c('Error importing event').t`Event with no UID, title or start time`;
    }
    if (getIsTodoComponent(vcalComponent) && shortUID) {
        return c('Error importing event').t`Todo ${shortUID}`;
    }
    if (getIsJournalComponent(vcalComponent) && shortUID) {
        return c('Error importing event').t`Journal ${shortUID}`;
    }
    if (getIsFreebusyComponent(vcalComponent) && shortUID) {
        return c('Error importing event').t`Free-busy ${shortUID}`;
    }
    // give up
    return '';
};

const getSupportedUID = (uid: VcalUidProperty) => {
    // The API does not accept UIDs longer than 191 characters
    const uidLength = uid.value.length;
    const croppedUID = uid.value.substring(uidLength - MAX_LENGTHS.UID, uidLength);
    return { value: croppedUID };
};

interface GetSupportedDateOrDateTimePropertyArgs {
    property: VcalDateOrDateTimeProperty | VcalFloatingDateTimeProperty;
    component: string;
    idMessage: string;
    hasXWrTimezone: boolean;
    calendarTzid?: string;
}
const getSupportedDateOrDateTimeProperty = ({
    property,
    component,
    idMessage,
    hasXWrTimezone,
    calendarTzid,
}: GetSupportedDateOrDateTimePropertyArgs) => {
    if (getIsIcalPropertyAllDay(property)) {
        return getDateProperty(property.value);
    }

    const partDayProperty = property;

    // account for non-standard Google Calendar exports
    // namely localize UTC date-times with x-wr-timezone if present and accepted by us
    if (partDayProperty.value.isUTC && hasXWrTimezone && calendarTzid) {
        const localizedDateTime = convertUTCDateTimeToZone(partDayProperty.value, calendarTzid);
        return getDateTimeProperty(localizedDateTime, calendarTzid);
    }
    const partDayPropertyTzid = getPropertyTzid(partDayProperty);

    // A floating date-time property
    if (!partDayPropertyTzid) {
        if (!hasXWrTimezone) {
            throw new ImportEventError(IMPORT_EVENT_TYPE.FLOATING_TIME, 'vevent', idMessage);
        }
        if (hasXWrTimezone && !calendarTzid) {
            throw new ImportEventError(IMPORT_EVENT_TYPE.X_WR_TIMEZONE_UNSUPPORTED, 'vevent', idMessage);
        }
        return getDateTimeProperty(partDayProperty.value, calendarTzid);
    }

    const supportedTzid = getSupportedTimezone(partDayPropertyTzid);
    if (!supportedTzid) {
        throw new ImportEventError(IMPORT_EVENT_TYPE.TZID_UNSUPPORTED, component, idMessage);
    }
    return getDateTimeProperty(partDayProperty.value, supportedTzid);
};

const getIsWellFormedDateTime = (property: VcalDateTimeProperty) => {
    return property.value.isUTC || !!property.parameters!.tzid;
};

const getIsWellFormedDateOrDateTime = (property: VcalDateOrDateTimeProperty) => {
    return getIsIcalPropertyAllDay(property) || getIsWellFormedDateTime(property);
};

const getIsDateOutOfBounds = (property: VcalDateOrDateTimeProperty) => {
    const dateUTC: Date = propertyToUTCDate(property);
    return +dateUTC < +MINIMUM_DATE_UTC || +dateUTC > +MAXIMUM_DATE_UTC;
};

const getHasUid = (
    vevent: VcalVeventComponent
): vevent is VcalVeventComponent & Required<Pick<VcalVeventComponent, 'uid'>> => {
    return !!vevent.uid?.value;
};

const getHasDtStart = (
    vevent: VcalVeventComponent
): vevent is VcalVeventComponent & Required<Pick<VcalVeventComponent, 'dtstart'>> => {
    return !!vevent.dtstart?.value;
};

const getHasDtEnd = (
    vevent: VcalVeventComponent
): vevent is VcalVeventComponent & Required<Pick<VcalVeventComponent, 'dtend'>> => {
    return !!vevent.dtend?.value;
};

const getEventWithRequiredProperties = (veventComponent: VcalVeventComponent, idMessage: string) => {
    if (!getHasUid(veventComponent)) {
        throw new ImportEventError(IMPORT_EVENT_TYPE.UID_MISSING, 'vevent', idMessage);
    }
    if (!getHasDtStart(veventComponent)) {
        throw new ImportEventError(IMPORT_EVENT_TYPE.DTSTART_MISSING, 'vevent', idMessage);
    }
    if (!getHasDtEnd(veventComponent)) {
        throw new ImportEventError(IMPORT_EVENT_TYPE.DTEND_MISSING, 'vevent', idMessage);
    }
    const { dtstamp } = veventComponent;
    return {
        ...veventComponent,
        dtstamp: dtstamp?.value ? { ...dtstamp } : { value: { ...fromUTCDate(new Date(Date.now())), isUTC: true } },
    };
};

const getSupportedAlarms = (valarms: VcalValarmComponent[], dtstart: VcalDateOrDateTimeProperty) => {
    return valarms
        .map((alarm) => getSupportedAlarm(alarm, dtstart))
        .filter(isTruthy)
        .slice(0, MAX_NOTIFICATIONS);
};

interface GetSupportedEventArgs {
    vcalComponent: VcalCalendarComponentOrError;
    hasXWrTimezone: boolean;
    calendarTzid?: string;
}
export const getSupportedEvent = ({ vcalComponent, hasXWrTimezone, calendarTzid }: GetSupportedEventArgs) => {
    const idMessage = getIdMessage(vcalComponent);
    if (getParsedComponentHasError(vcalComponent)) {
        throw new ImportEventError(IMPORT_EVENT_TYPE.EXTERNAL_ERROR, '', idMessage, vcalComponent.error);
    }
    if (getIsTodoComponent(vcalComponent)) {
        throw new ImportEventError(IMPORT_EVENT_TYPE.TODO_FORMAT, 'vtodo', idMessage);
    }
    if (getIsJournalComponent(vcalComponent)) {
        throw new ImportEventError(IMPORT_EVENT_TYPE.JOURNAL_FORMAT, 'vjournal', idMessage);
    }
    if (getIsFreebusyComponent(vcalComponent)) {
        throw new ImportEventError(IMPORT_EVENT_TYPE.FREEBUSY_FORMAT, 'vfreebusy', idMessage);
    }
    if (getIsTimezoneComponent(vcalComponent)) {
        if (!getSupportedTimezone(vcalComponent.tzid.value)) {
            throw new ImportEventError(IMPORT_EVENT_TYPE.TIMEZONE_FORMAT, 'vtimezone', idMessage);
        }
        throw new ImportEventError(IMPORT_EVENT_TYPE.TIMEZONE_IGNORE, 'vtimezone', idMessage);
    }
    const vevent = getEventWithRequiredProperties(vcalComponent, idMessage);
    try {
        const {
            component,
            components,
            uid,
            dtstamp,
            dtstart,
            dtend,
            rrule,
            exdate,
            description,
            summary,
            location,
            'recurrence-id': recurrenceId,
        } = vevent;
        const trimmedSummaryValue = summary?.value.trim();
        const trimmedDescriptionValue = description?.value.trim();
        const trimmedLocationValue = location?.value.trim();

        const validated: VcalVeventComponent &
            Required<Pick<VcalVeventComponent, 'uid' | 'dtstamp' | 'dtstart' | 'dtend'>> = {
            component,
            uid: getSupportedUID(uid),
            dtstamp: { ...dtstamp },
            dtstart: { ...dtstart },
            dtend: { ...dtend },
        };

        if (exdate) {
            validated.exdate = [...exdate];
        }
        if (recurrenceId) {
            validated['recurrence-id'] = recurrenceId;
        }
        if (trimmedSummaryValue) {
            validated.summary = {
                ...summary,
                value: truncate(trimmedSummaryValue, MAX_LENGTHS.TITLE),
            };
        }
        if (trimmedDescriptionValue) {
            validated.description = {
                ...description,
                value: truncate(trimmedDescriptionValue, MAX_LENGTHS.EVENT_DESCRIPTION),
            };
        }
        if (trimmedLocationValue) {
            validated.location = {
                ...location,
                value: truncate(trimmedLocationValue, MAX_LENGTHS.LOCATION),
            };
        }

        const isAllDayStart = getIsIcalPropertyAllDay(validated.dtstart);
        const isAllDayEnd = getIsIcalPropertyAllDay(validated.dtend);
        if (+isAllDayStart ^ +isAllDayEnd) {
            throw new ImportEventError(IMPORT_EVENT_TYPE.ALLDAY_INCONSISTENCY, 'vevent', idMessage);
        }
        validated.dtstart = getSupportedDateOrDateTimeProperty({
            property: validated.dtstart,
            component: 'vevent',
            idMessage,
            hasXWrTimezone,
            calendarTzid,
        });
        if (!getIsWellFormedDateOrDateTime(validated.dtstart)) {
            throw new ImportEventError(IMPORT_EVENT_TYPE.DTSTART_MALFORMED, 'vevent', idMessage);
        }
        if (getIsDateOutOfBounds(validated.dtstart)) {
            throw new ImportEventError(IMPORT_EVENT_TYPE.DTSTART_OUT_OF_BOUNDS, 'vevent', idMessage);
        }
        validated.dtend = getSupportedDateOrDateTimeProperty({
            property: validated.dtend,
            component: 'vevent',
            idMessage,
            hasXWrTimezone,
            calendarTzid,
        });
        if (!getIsWellFormedDateOrDateTime(validated.dtend)) {
            throw new ImportEventError(IMPORT_EVENT_TYPE.DTEND_MALFORMED, 'vevent', idMessage);
        }
        if (getIsDateOutOfBounds(validated.dtend)) {
            throw new ImportEventError(IMPORT_EVENT_TYPE.DTEND_OUT_OF_BOUNDS, 'vevent', idMessage);
        }
        const startDateUTC = propertyToUTCDate(validated.dtstart);
        const endDateUTC = propertyToUTCDate(validated.dtend);
        const modifiedEndDateUTC = isAllDayEnd ? addDays(endDateUTC, -1) : endDateUTC;
        if (+startDateUTC > +modifiedEndDateUTC) {
            throw new ImportEventError(IMPORT_EVENT_TYPE.NEGATIVE_DURATION, 'vevent', idMessage);
        }

        if (rrule) {
            validated.rrule = rrule;
            if (dtend && !getIsRruleConsistent(validated)) {
                throw new ImportEventError(IMPORT_EVENT_TYPE.RRULE_INCONSISTENT, 'vevent', idMessage);
            }
            if (!getIsRruleSupported(rrule.value)) {
                throw new ImportEventError(IMPORT_EVENT_TYPE.RRULE_UNSUPPORTED, 'vevent', idMessage);
            }
        }

        const alarms = components?.filter(({ component }) => component === 'valarm') || [];
        const supportedAlarms = getSupportedAlarms(alarms, dtstart);

        if (supportedAlarms.length) {
            validated.components = supportedAlarms;
        }

        return validated;
    } catch (e) {
        if (e instanceof ImportEventError) {
            throw e;
        }
        throw new ImportEventError(IMPORT_EVENT_TYPE.VALIDATION_ERROR, 'vevent', idMessage);
    }
};

interface FilterArgs {
    components: VcalCalendarComponentOrError[];
    calscale?: string;
    xWrTimezone?: string;
}
export const filterNonSupported = ({ components, calscale, xWrTimezone }: FilterArgs) => {
    if (calscale && calscale.toLowerCase() !== 'gregorian') {
        return {
            events: [],
            discarded: [new ImportEventError(IMPORT_EVENT_TYPE.NON_GREGORIAN, '', '')],
        };
    }
    const hasXWrTimezone = !!xWrTimezone;
    const calendarTzid = xWrTimezone ? getSupportedTimezone(xWrTimezone) : undefined;
    return components.reduce<{
        events: VcalVeventComponent[];
        discarded: ImportEventError[];
    }>(
        (acc, vcalComponent) => {
            try {
                acc.events.push(getSupportedEvent({ vcalComponent, calendarTzid, hasXWrTimezone }));
            } catch (e) {
                if (e instanceof ImportEventError && e.type === IMPORT_EVENT_TYPE.TIMEZONE_IGNORE) {
                    return acc;
                }
                acc.discarded.push(e);
            }
            return acc;
        },
        { events: [], discarded: [] }
    );
};

/**
 * Split an array of events into those which have a recurrence id and those which don't
 */
export const splitByRecurrenceId = (events: VcalVeventComponent[]) => {
    return events.reduce<{ withoutRecurrenceID: VcalVeventComponent[]; withRecurrenceID: VcalVeventComponent[] }>(
        (acc, event) => {
            if (event['recurrence-id']) {
                acc.withRecurrenceID.push(event);
            } else {
                acc.withoutRecurrenceID.push(event);
            }
            return acc;
        },
        { withoutRecurrenceID: [], withRecurrenceID: [] }
    );
};
