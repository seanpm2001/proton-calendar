import { withPmAttendees } from 'proton-shared/lib/calendar/attendees';
import { ICAL_ATTENDEE_STATUS } from 'proton-shared/lib/calendar/constants';
import getMemberAndAddress from 'proton-shared/lib/calendar/integration/getMemberAndAddress';
import { WeekStartsOn } from 'proton-shared/lib/calendar/interface';
import { noop } from 'proton-shared/lib/helpers/function';
import isDeepEqual from 'proton-shared/lib/helpers/isDeepEqual';
import { omit } from 'proton-shared/lib/helpers/object';
import { Address, Api } from 'proton-shared/lib/interfaces';
import { CalendarBootstrap } from 'proton-shared/lib/interfaces/calendar';
import { VcalVeventComponent } from 'proton-shared/lib/interfaces/calendar/VcalModel';
import { getRecurringEventUpdatedText, getSingleEventText } from '../../../components/eventModal/eventForm/i18n';
import { modelToVeventComponent } from '../../../components/eventModal/eventForm/modelToProperties';
import getEditEventData from '../event/getEditEventData';
import getSingleEditRecurringData from '../event/getSingleEditRecurringData';
import { getIsCalendarEvent } from '../eventStore/cache/helper';
import { GetDecryptedEventCb } from '../eventStore/interface';
import getAllEventsByUID from '../getAllEventsByUID';
import { CalendarViewEventTemporaryEvent, OnSaveConfirmationCb } from '../interface';
import getRecurringSaveType from './getRecurringSaveType';
import getRecurringUpdateAllPossibilities from './getRecurringUpdateAllPossibilities';
import getSaveRecurringEventActions from './getSaveRecurringEventActions';
import getSaveSingleEventActions from './getSaveSingleEventActions';
import { INVITE_ACTION_TYPES, InviteActions } from './inviteActions';
import { getOriginalEvent } from './recurringHelper';
import withVeventRruleWkst from './rruleWkst';
import { withVeventSequence } from './sequence';

interface Arguments {
    temporaryEvent: CalendarViewEventTemporaryEvent;
    weekStartsOn: WeekStartsOn;
    addresses: Address[];
    inviteActions?: InviteActions;
    onSaveConfirmation: OnSaveConfirmationCb;
    api: Api;
    getEventDecrypted: GetDecryptedEventCb;
    getCalendarBootstrap: (CalendarID: string) => CalendarBootstrap;
    sendReplyIcs: (partstat: ICAL_ATTENDEE_STATUS, vevent?: VcalVeventComponent) => Promise<void>;
}

const getSaveEventActions = async ({
    temporaryEvent,
    weekStartsOn,
    addresses,
    inviteActions = { type: INVITE_ACTION_TYPES.NONE },
    onSaveConfirmation,
    api,
    getEventDecrypted,
    getCalendarBootstrap,
    sendReplyIcs,
}: Arguments) => {
    const {
        tmpOriginalTarget: { data: { eventData: oldEventData, eventRecurrence, eventReadResult } } = { data: {} },
        tmpData,
        tmpData: {
            calendar: { id: newCalendarID },
            member: { memberID: newMemberID, addressID: newAddressID },
        },
    } = temporaryEvent;
    const { type: inviteType, partstat: invitePartstat } = inviteActions;
    const { isOrganizer } = tmpData;
    const isInvitation = !isOrganizer;

    // All updates will remove any existing exdates since they would be more complicated to normalize
    const modelVeventComponent = modelToVeventComponent(tmpData) as VcalVeventComponent;
    const newVeventComponent = await withPmAttendees(
        withVeventRruleWkst(omit(modelVeventComponent, ['exdate']), weekStartsOn),
        api
    );

    const newEditEventData = {
        veventComponent: newVeventComponent,
        calendarID: newCalendarID,
        memberID: newMemberID,
        addressID: newAddressID,
    };

    // Creation
    if (!oldEventData) {
        const newVeventWithSequence = {
            ...newEditEventData.veventComponent,
            sequence: { value: 0 },
        };
        const multiActions = getSaveSingleEventActions({
            newEditEventData: {
                ...newEditEventData,
                veventComponent: newVeventWithSequence,
            },
        });
        const successText = getSingleEventText(undefined, newEditEventData, { type: INVITE_ACTION_TYPES.NONE });
        return {
            actions: multiActions,
            texts: {
                success: successText,
            },
        };
    }

    const calendarBootstrap = getCalendarBootstrap(oldEventData.CalendarID);
    if (!calendarBootstrap) {
        throw new Error('Trying to update event without a calendar');
    }
    if (!getIsCalendarEvent(oldEventData) || !eventReadResult?.result) {
        throw new Error('Trying to edit event without event information');
    }

    const oldEditEventData = getEditEventData({
        eventData: oldEventData,
        eventResult: eventReadResult.result,
        memberResult: getMemberAndAddress(addresses, calendarBootstrap.Members, oldEventData.Author),
    });

    // If it's not an occurrence of a recurring event, or a single edit of a recurring event
    const isSingleEdit = !eventRecurrence && !!oldEditEventData.recurrenceID;
    if (!eventRecurrence && !oldEditEventData.recurrenceID) {
        const newVeventWithSequence = withVeventSequence(
            newEditEventData.veventComponent,
            oldEditEventData.mainVeventComponent
        );
        if (inviteType === INVITE_ACTION_TYPES.CHANGE_PARTSTAT) {
            if (!invitePartstat) {
                throw new Error('Cannot update participation status without new answer');
            }
            await sendReplyIcs(invitePartstat, newEditEventData.veventComponent);
        }
        const multiActions = getSaveSingleEventActions({
            newEditEventData: { ...newEditEventData, veventComponent: newVeventWithSequence },
            oldEditEventData,
        });
        const successText = getSingleEventText(oldEditEventData, newEditEventData, inviteActions);
        return {
            actions: multiActions,
            texts: {
                success: successText,
            },
        };
    }

    const recurrences = await getAllEventsByUID(api, oldEditEventData.uid, oldEditEventData.calendarID);

    const originalEventData = getOriginalEvent(recurrences);
    const originalEventResult = originalEventData ? await getEventDecrypted(originalEventData).catch(noop) : undefined;
    if (!originalEventData || !originalEventResult?.[0]) {
        throw new Error('Original event not found');
    }

    const originalEditEventData = getEditEventData({
        eventData: originalEventData,
        eventResult: originalEventResult,
        memberResult: getMemberAndAddress(addresses, calendarBootstrap.Members, originalEventData.Author),
    });

    const actualEventRecurrence =
        eventRecurrence ||
        getSingleEditRecurringData(originalEditEventData.mainVeventComponent, oldEditEventData.mainVeventComponent);

    const updateAllPossibilities = getRecurringUpdateAllPossibilities(
        originalEditEventData.mainVeventComponent,
        oldEditEventData.mainVeventComponent,
        newEditEventData.veventComponent,
        actualEventRecurrence
    );

    const hasModifiedCalendar = originalEditEventData.calendarID !== newEditEventData.calendarID;
    const hasModifiedRrule =
        tmpData.hasTouchedRrule &&
        !isDeepEqual(originalEditEventData.mainVeventComponent.rrule, newEditEventData.veventComponent.rrule);

    const saveType = await getRecurringSaveType({
        originalEditEventData,
        oldEditEventData,
        canOnlySaveAll:
            actualEventRecurrence.isSingleOccurrence || hasModifiedCalendar || (isInvitation && !isSingleEdit),
        canOnlySaveThis: isInvitation && isSingleEdit,
        hasModifiedRrule,
        hasModifiedCalendar,
        inviteActions,
        onSaveConfirmation,
        recurrence: actualEventRecurrence,
        recurrences,
        isInvitation,
    });
    if (inviteType === INVITE_ACTION_TYPES.CHANGE_PARTSTAT) {
        if (!invitePartstat) {
            throw new Error('Cannot update participation status without new answer');
        }
        await sendReplyIcs(invitePartstat, newEditEventData.veventComponent);
    }
    const multiActions = getSaveRecurringEventActions({
        type: saveType,
        recurrences,
        recurrence: actualEventRecurrence,
        updateAllPossibilities,
        newEditEventData,
        oldEditEventData,
        originalEditEventData,
        hasModifiedRrule,
        isInvitation,
    });
    const successText = getRecurringEventUpdatedText(saveType, inviteActions);
    return {
        actions: multiActions,
        texts: {
            success: successText,
        },
    };
};

export default getSaveEventActions;
