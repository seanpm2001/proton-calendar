import React, { useEffect, useState, useMemo } from 'react';
import PropTypes from 'prop-types';
import {
    FormModal,
    Loader,
    useGetCalendarKeys,
    useGetCalendarBootstrap,
    useGetAddresses,
    useGetAddressKeys,
    useApi,
    useEventManager,
    useLoading,
    useNotifications,
    PrimaryButton,
    Button
} from 'react-components';
import { c } from 'ttag';
import { noop } from 'proton-shared/lib/helpers/function';

import { validateDateTimeProperties } from './validator';
import { getI18N } from './eventForm/i18n';
import { modelToDateProperty, modelToVeventComponent } from './eventForm/modelToProperties';
import { getState, getEmptyModel, getExistingEvent, getStartAndEnd } from './eventForm/state';
import MainForm from './MainForm';
import useGetCalendarEventRaw from '../../containers/calendar/useGetCalendarEventRaw';
import useGetCalendarEventPersonal from '../../containers/calendar/useGetCalendarEventPersonal';
import createOrUpdateEvent from 'proton-shared/lib/calendar/integration/createOrUpdateEvent';
import { deleteEvent } from 'proton-shared/lib/api/calendars';

const CreateEventModal = ({
    start,
    end,
    isAllDay,
    displayWeekNumbers,
    weekStartsOn,
    calendars,
    tzid,
    type = 'event',
    title,
    Event,
    ...rest
}) => {
    const api = useApi();
    const { call } = useEventManager();
    const { createNotification } = useNotifications();
    const [model, setModel] = useState(() => {
        return getState({
            ...getStartAndEnd({
                defaultDuration: 30,
                start,
                end
            }),
            isAllDay,
            type,
            defaultTzid: tzid
        });
    });
    const [loadingEvent, withLoadingEvent] = useLoading(true);
    const [loadingAction, withLoadingAction] = useLoading();
    const getCalendarKeys = useGetCalendarKeys();
    const getAddresses = useGetAddresses();
    const getCalendarBootstrap = useGetCalendarBootstrap();
    const getAddressKeys = useGetAddressKeys();
    const getEventRaw = useGetCalendarEventRaw();
    const getEventPersonal = useGetCalendarEventPersonal();
    const i18n = getI18N(model.type);

    const errors = useMemo(() => {
        const { start, end, isAllDay } = model;
        if (!start) {
            return;
        }
        const dtStartProperty = modelToDateProperty({ ...start, isAllDay }, tzid);
        const dtEndProperty = modelToDateProperty({ ...end, isAllDay }, tzid);
        const dateTimesError = validateDateTimeProperties(dtStartProperty, dtEndProperty);
        return {
            end: dateTimesError
        };
    }, [model.start, model.end, model.isAllDay]);

    useEffect(() => {}, [model.memberID]);

    useEffect(() => {
        const initalize = async () => {
            const actualCalendarID = Event ? Event.CalendarID : calendars[0].ID;

            const [CalendarBootstrap, Addresses, [veventComponent, personalMap]] = await Promise.all([
                getCalendarBootstrap(actualCalendarID),
                getAddresses(),
                Event ? Promise.all([getEventRaw(Event), getEventPersonal(Event)]) : []
            ]);

            const { Color: color = '' } = calendars.find(({ ID }) => ID === actualCalendarID);
            const emptyModel = getEmptyModel({
                calendarID: actualCalendarID,
                CalendarBootstrap,
                Addresses,
                color,
                title,
                start,
                end
            });

            const eventModel = veventComponent
                ? getExistingEvent({
                      veventComponent,
                      veventValarmComponent: personalMap[emptyModel.memberID],
                      tzid,
                      start,
                      end
                  })
                : {};

            setModel((prev) => ({
                ...prev,
                ...emptyModel,
                ...eventModel
            }));
        };
        withLoadingEvent(
            initalize().catch((e) => {
                console.log(e);
                // Just close if it failed to load.
                rest.onClose();
            })
        );
    }, []);

    const handleSubmit = async () => {
        for (const errorKey of Object.keys(errors)) {
            if (errors[errorKey]) {
                return createNotification({ text: errors[errorKey], type: 'error' });
            }
        }

        const veventComponent = modelToVeventComponent(model, tzid);
        const { calendarID, addressID, memberID } = model;
        const [addressKeys, calendarKeys] = await Promise.all([getAddressKeys(addressID), getCalendarKeys(calendarID)]);
        await createOrUpdateEvent({
            Event,
            veventComponent,
            memberID,
            calendarID,
            addressKeys,
            calendarKeys,
            api
        });
        await call();

        createNotification({ text: Event ? i18n.updated : i18n.created });
        rest.onClose();
    };

    const handleDelete = async () => {
        await api(deleteEvent(Event.CalendarID, Event.ID));
        await call();
        createNotification({ text: i18n.deleted });
        return rest.onClose();
    };

    const submit = Event ? (
        <div>
            <Button
                onClick={loadingAction ? noop : () => withLoadingAction(handleDelete())}
                loading={loadingAction}
                className="mr1"
            >{c('Action').t`Delete`}</Button>
            <PrimaryButton loading={loadingAction} type="submit">{c('Action').t`Save`}</PrimaryButton>
        </div>
    ) : (
        c('Action').t`Save`
    );

    return (
        <FormModal
            className="pm-modal--shorterLabels"
            title={Event ? i18n.update : i18n.create}
            loading={loadingAction || loadingEvent}
            onSubmit={loadingAction || loadingEvent ? noop : () => withLoadingAction(handleSubmit())}
            submit={submit}
            {...rest}
        >
            {loadingEvent ? (
                <Loader />
            ) : (
                <MainForm
                    displayWeekNumbers={displayWeekNumbers}
                    weekStartsOn={weekStartsOn}
                    errors={errors}
                    model={model}
                    setModel={setModel}
                    calendars={calendars}
                />
            )}
        </FormModal>
    );
};

CreateEventModal.propTypes = {
    calendars: PropTypes.array.isRequired,
    type: PropTypes.oneOf(['event', 'alarm', 'task']),
    start: PropTypes.instanceOf(Date),
    end: PropTypes.instanceOf(Date),
    isAllDay: PropTypes.bool,
    displayWeekNumbers: PropTypes.bool,
    weekStartsOn: PropTypes.number,
    title: PropTypes.string,
    tzid: PropTypes.string.isRequired,
    Event: PropTypes.object
};

export default CreateEventModal;
