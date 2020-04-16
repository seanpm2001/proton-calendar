export const DEFAULT_CALENDAR = {
    name: 'My calendar',
    color: '#657ee4',
    description: ''
};

export enum VIEWS {
    DAY = 1,
    WEEK,
    MONTH,
    YEAR,
    AGENDA,
    CUSTOM
}

export enum DAY_TO_NUMBER {
    SU = 0,
    MO,
    TU,
    WE,
    TH,
    FR,
    SA
}
export type DAY_TO_NUMBER_KEYS = keyof typeof DAY_TO_NUMBER;

export const NUMBER_TO_DAY = {
    0: 'SU',
    1: 'MO',
    2: 'TU',
    3: 'WE',
    4: 'TH',
    5: 'FR',
    6: 'SA'
} as { [key: number]: string };

export const MINUTE = 60;
export const HOUR = MINUTE * 60;
export const DAY = HOUR * 24;
export const WEEK = DAY * 7;

export enum NOTIFICATION_WHEN {
    BEFORE = '-',
    AFTER = ''
}

export enum NOTIFICATION_UNITS {
    WEEK = 1,
    DAY = 2,
    HOURS = 3,
    MINUTES = 4
}

export const NOTIFICATION_UNITS_MAX = {
    [NOTIFICATION_UNITS.WEEK]: 1000,
    [NOTIFICATION_UNITS.DAY]: 7000,
    [NOTIFICATION_UNITS.HOURS]: 1000,
    [NOTIFICATION_UNITS.MINUTES]: 10000
};

export enum FREQUENCY {
    ONCE = 'ONCE',
    DAILY = 'DAILY',
    WEEKLY = 'WEEKLY',
    MONTHLY = 'MONTHLY',
    YEARLY = 'YEARLY',
    CUSTOM = 'CUSTOM'
}

export const FREQUENCY_INTERVALS_MAX = {
    [FREQUENCY.ONCE]: 1000,
    [FREQUENCY.DAILY]: 1000,
    [FREQUENCY.WEEKLY]: 5000,
    [FREQUENCY.MONTHLY]: 1000,
    [FREQUENCY.YEARLY]: 100,
    [FREQUENCY.CUSTOM]: 1000
};

export const FREQUENCY_COUNT_MAX = 50;

export const MAX_CALENDARS_PER_USER = 10;

export enum DAILY_TYPE {
    ALL_DAYS = 0
}

export enum WEEKLY_TYPE {
    ON_DAYS = 0
}

export enum MONTHLY_TYPE {
    ON_MONTH_DAY = 0,
    ON_NTH_DAY = 1,
    ON_MINUS_NTH_DAY = -1
}

export enum YEARLY_TYPE {
    BY_MONTH_ON_MONTH_DAY = 0
}

export enum END_TYPE {
    NEVER = 'NEVER',
    AFTER_N_TIMES = 'COUNT',
    UNTIL = 'UNTIL'
}

export const DEFAULT_EVENT_DURATION = 30;

export const COLORS = {
    BLACK: '#000',
    WHITE: '#FFF'
};

export const MAX_LENGTHS = {
    CALENDAR_NAME: 100,
    CALENDAR_DESCRIPTION: 255,
    TITLE: 255,
    EVENT_DESCRIPTION: 3000,
    LOCATION: 255
};

export const MAX_DEFAULT_NOTIFICATIONS = 5;

export enum SAVE_CONFIRMATION_TYPES {
    SINGLE = 1,
    RECURRING
}

export enum DELETE_CONFIRMATION_TYPES {
    SINGLE = 1,
    RECURRING,
    ALL_RECURRING
}

export enum RECURRING_TYPES {
    ALL = 1,
    FUTURE,
    SINGLE
}

export const MINIMUM_DATE = new Date(1970, 0, 1);
export const MINIMUM_DATE_UTC = new Date(
    Date.UTC(MINIMUM_DATE.getFullYear(), MINIMUM_DATE.getMonth(), MINIMUM_DATE.getDate())
);

export const MAXIMUM_DATE = new Date(2037, 11, 31);
export const MAXIMUM_DATE_UTC = new Date(
    Date.UTC(MAXIMUM_DATE.getFullYear(), MAXIMUM_DATE.getMonth(), MAXIMUM_DATE.getDate())
);