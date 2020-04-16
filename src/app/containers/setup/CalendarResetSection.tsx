import { Alert } from 'react-components';
import { c } from 'ttag';
import React from 'react';
import CalendarTableRows from './CalendarTableRows';
import { Calendar } from 'proton-shared/lib/interfaces/calendar';

interface Props {
    calendarsToReset: Calendar[];
}
const CalendarResetSection = ({ calendarsToReset = [] }: Props) => {
    return (
        <>
            <Alert type="warning">{c('Info')
                .t`You have reset your password and events linked to the following calendars couldn't be decrypted.`}</Alert>
            <CalendarTableRows calendars={calendarsToReset} />
        </>
    );
};

export default CalendarResetSection;