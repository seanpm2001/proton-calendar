import {
    getDateProperty,
    getDateTimeProperty,
    getPropertyTzid,
    isIcalAllDay,
    propertyToUTCDate
} from 'proton-shared/lib/calendar/vcalConverter';
import { toUTCDate } from 'proton-shared/lib/date/timezone';
import { DateTimeValue } from '../../../interfaces/DateTime';
import {
    VcalDateOrDateTimeProperty,
    VcalDateProperty,
    VcalDateTimeProperty,
    VcalRruleProperty,
    VcalVeventComponent
} from '../../../interfaces/VcalModel';
import { getUntilProperty } from '../../../components/eventModal/eventForm/modelToFrequencyProperties';

export const toExdate = (dateObject: DateTimeValue, isAllDay: boolean, tzid = 'UTC'): VcalDateOrDateTimeProperty => {
    if (isAllDay) {
        return getDateProperty(dateObject) as VcalDateProperty;
    }
    return getDateTimeProperty(dateObject, tzid) as VcalDateTimeProperty;
};

export const getSafeRruleCount = (rrule: VcalRruleProperty, newCount: number) => {
    if (newCount <= 1) {
        return;
    }

    return {
        ...rrule,
        value: {
            ...rrule.value,
            count: newCount
        }
    };
};

export const getSafeRruleUntil = (rrule: VcalRruleProperty, component: VcalVeventComponent) => {
    const { dtstart } = component;

    const originalUntilDateTime = toUTCDate(rrule.value.until);
    const newStartTime = propertyToUTCDate(dtstart);

    // If the event was moved after the until date, fixup the until
    if (newStartTime > originalUntilDateTime) {
        const until = getUntilProperty(dtstart.value, isIcalAllDay(component), getPropertyTzid(dtstart));
        return {
            ...rrule,
            value: {
                ...rrule.value,
                until
            }
        };
    }

    return rrule;
};