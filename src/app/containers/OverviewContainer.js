import React, { useRef, useState } from 'react';
import { Group, Select, Icon, Button, ButtonGroup, useModals } from 'react-components';
import { c } from 'ttag';
import Calendar from '@toast-ui/react-calendar';
import 'tui-calendar/dist/tui-calendar.css';

// If you use the default popups, use this.
import 'tui-date-picker/dist/tui-date-picker.css';
import 'tui-time-picker/dist/tui-time-picker.css';

import Main from '../components/Main';
import EventModal from '../components/modals/EventModal';

const today = new Date();
const DEFAULT_VIEW = 'week';
const VIEWS_HANDLED_BY_CALENDAR = ['day', 'week', 'month'];

const getDate = (type, start, value, operator) => {
    start = new Date(start);
    type = type.charAt(0).toUpperCase() + type.slice(1);

    if (operator === '+') {
        start[`set${type}`](start[`get${type}`]() + value);
    } else {
        start[`set${type}`](start[`get${type}`]() - value);
    }

    return start;
};

const OverviewContainer = () => {
    const calendarRef = useRef();
    const [view, setView] = useState(DEFAULT_VIEW);
    const { createModal } = useModals();

    const handlePrev = () => calendarRef.current.getInstance().prev();
    const handleNext = () => calendarRef.current.getInstance().next();
    const handleToday = () => calendarRef.current.getInstance().today();

    const handleChangeView = ({ target }) => {
        const newView = target.value;
        VIEWS_HANDLED_BY_CALENDAR.includes(newView) && calendarRef.current.getInstance().changeView(newView, true);
        setView(newView);
    };

    // when click a schedule.
    const handleSchedule = (event) => {
        console.log(event);
    };

    // when click a schedule.
    const handleMore = (event) => {
        console.log(event);
    };

    // when select time period in daily, weekly, monthly.
    const handleBeforeCreateSchedulecalendar = (event) => {
        console.log(event);
    };

    // when drag a schedule to change time in daily, weekly, monthly.
    const handleBeforeUpdateSchedule = () => {
        console.log(event);
    };

    const views = [
        { text: c('Calendar view').t`Day`, value: 'day' },
        { text: c('Calendar view').t`Week`, value: 'week' },
        { text: c('Calendar view').t`Month`, value: 'month' },
        { text: c('Calendar view').t`Year`, value: 'year' },
        { text: c('Calendar view').t`Planning`, value: 'planning' }
    ];

    return (
        <Main>
            <div className="flex flex-nowrap">
                <Button className="mr1" onClick={handleToday}>{c('Action').t`Today`}</Button>
                <Group className="mr1">
                    <ButtonGroup onClick={handlePrev}>
                        <Icon name="arrow-left" />
                    </ButtonGroup>
                    <ButtonGroup onClick={handleNext}>{<Icon name="arrow-right" />}</ButtonGroup>
                </Group>
                <div>
                    <Select options={views} value={view} onChange={handleChangeView} />
                </div>
            </div>
            <div hidden={!VIEWS_HANDLED_BY_CALENDAR.includes(view)}>
                <Calendar
                    onBeforeCreateSchedulecalendar={handleBeforeCreateSchedulecalendar}
                    onBeforeUpdateSchedule={handleBeforeUpdateSchedule}
                    onClickSchedule={handleSchedule}
                    onClickMore={handleMore}
                    usageStatistics={false}
                    ref={calendarRef}
                    height="800px"
                    className="flex"
                    calendars={[
                        {
                            id: '0',
                            name: 'Private',
                            bgColor: '#9e5fff',
                            borderColor: '#9e5fff'
                        },
                        {
                            id: '1',
                            name: 'Company',
                            bgColor: '#00a9ff',
                            borderColor: '#00a9ff'
                        }
                    ]}
                    defaultView={DEFAULT_VIEW}
                    disableDblClick={true}
                    isReadOnly={false}
                    month={{
                        startDayOfWeek: 0
                    }}
                    schedules={[
                        {
                            id: '1',
                            calendarId: '0',
                            title: 'TOAST UI Calendar Study',
                            category: 'time',
                            dueDateClass: '',
                            start: today.toISOString(),
                            end: getDate('hours', today, 3, '+').toISOString()
                        },
                        {
                            id: '2',
                            calendarId: '0',
                            title: 'Practice',
                            category: 'milestone',
                            dueDateClass: '',
                            start: getDate('date', today, 1, '+').toISOString(),
                            end: getDate('date', today, 1, '+').toISOString(),
                            isReadOnly: true
                        },
                        {
                            id: '3',
                            calendarId: '0',
                            title: 'FE Workshop',
                            category: 'allday',
                            dueDateClass: '',
                            start: getDate('date', today, 2, '-').toISOString(),
                            end: getDate('date', today, 1, '-').toISOString(),
                            isReadOnly: true
                        },
                        {
                            id: '4',
                            calendarId: '0',
                            title: 'Report',
                            category: 'time',
                            dueDateClass: '',
                            start: today.toISOString(),
                            end: getDate('hours', today, 1, '+').toISOString()
                        }
                    ]}
                    scheduleView
                    taskView
                    template={{
                        milestone(schedule) {
                            return `<span style="color:#fff;background-color: ${schedule.bgColor};">${schedule.title}</span>`;
                        },
                        milestoneTitle() {
                            return 'Milestone';
                        },
                        allday(schedule) {
                            return `${schedule.title}<i class="fa fa-refresh"></i>`;
                        },
                        alldayTitle() {
                            return 'All Day';
                        }
                    }}
                    timezones={[
                        {
                            timezoneOffset: 120,
                            displayLabel: 'GMT+02:00',
                            tooltip: 'Seoul'
                        }
                    ]}
                    useDetailPopup
                    useCreationPopup
                    week={{
                        showTimezoneCollapseButton: true,
                        timezonesCollapsed: true
                    }}
                />
            </div>
            {view === 'year' ? 'TODO' : null}
            {view === 'planning' ? 'TODO' : null}
        </Main>
    );
};

export default OverviewContainer;
