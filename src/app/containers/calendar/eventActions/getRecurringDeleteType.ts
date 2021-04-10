import { ICAL_ATTENDEE_STATUS, DELETE_CONFIRMATION_TYPES, RECURRING_TYPES } from 'proton-shared/lib/calendar/constants';
import { getHasNonCancelledSingleEdits, getMustResetPartstat } from 'proton-shared/lib/calendar/integration/invite';
import { CalendarEvent } from 'proton-shared/lib/interfaces/calendar';
import { VcalVeventComponent } from 'proton-shared/lib/interfaces/calendar/VcalModel';

import { getHasFutureOption, getRecurrenceEvents } from './recurringHelper';
import { InviteActions } from '../../../interfaces/Invite';

import { OnDeleteConfirmationCb } from '../interface';
import { EventOldData } from '../../../interfaces/EventData';
import { CalendarEventRecurring } from '../../../interfaces/CalendarEvents';

interface Arguments {
    originalEditEventData: EventOldData;
    recurrences: CalendarEvent[];
    recurrence: CalendarEventRecurring;
    inviteActions: InviteActions;
    veventComponent?: VcalVeventComponent;
    canOnlyDeleteAll: boolean;
    canOnlyDeleteThis: boolean;
    isInvitation: boolean;
    onDeleteConfirmation: OnDeleteConfirmationCb;
    selfAttendeeToken?: string;
}
const getRecurringDeleteType = ({
    originalEditEventData,
    recurrences,
    recurrence,
    canOnlyDeleteAll,
    canOnlyDeleteThis,
    isInvitation,
    onDeleteConfirmation,
    inviteActions,
    selfAttendeeToken,
}: Arguments) => {
    let deleteTypes;
    if (canOnlyDeleteAll || !originalEditEventData.veventComponent) {
        deleteTypes = [RECURRING_TYPES.ALL];
    } else if (canOnlyDeleteThis) {
        deleteTypes = [RECURRING_TYPES.SINGLE];
    } else if (getHasFutureOption(originalEditEventData.veventComponent, recurrence)) {
        deleteTypes = [RECURRING_TYPES.SINGLE, RECURRING_TYPES.FUTURE, RECURRING_TYPES.ALL];
    } else {
        deleteTypes = [RECURRING_TYPES.SINGLE, RECURRING_TYPES.ALL];
    }
    const singleEditRecurrences = getRecurrenceEvents(recurrences, originalEditEventData.eventData);
    const singleEditRecurrencesWithoutSelf = singleEditRecurrences.filter((event) => {
        return event.ID !== originalEditEventData.eventData.ID;
    });
    const mustResetPartstat = getMustResetPartstat(
        singleEditRecurrencesWithoutSelf,
        selfAttendeeToken,
        ICAL_ATTENDEE_STATUS.DECLINED
    );
    const updatedInviteActions = {
        ...inviteActions,
        resetSingleEditsPartstat:
            deleteTypes.length === 1 && deleteTypes[0] === RECURRING_TYPES.ALL && mustResetPartstat,
    };
    const hasNonCancelledSingleEdits = getHasNonCancelledSingleEdits(singleEditRecurrencesWithoutSelf);
    return onDeleteConfirmation({
        type: DELETE_CONFIRMATION_TYPES.RECURRING,
        data: { types: deleteTypes, hasNonCancelledSingleEdits },
        inviteActions: updatedInviteActions,
        isInvitation,
    });
};

export default getRecurringDeleteType;
