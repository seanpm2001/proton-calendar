import React from 'react';
import { StandardPrivateApp, ErrorBoundary, LoaderPage, useApi, useCache, useAppTitle } from 'react-components';
import {
    UserModel,
    UserSettingsModel,
    CalendarsModel,
    CalendarUserSettingsModel,
    AddressesModel,
    MailSettingsModel,
} from 'proton-shared/lib/models';
import { loadModels } from 'proton-shared/lib/models/helper';
import { TtagLocaleMap } from 'proton-shared/lib/interfaces/Locale';

import MainContainer from '../containers/calendar/MainContainer';

const EVENT_MODELS = [
    UserModel,
    UserSettingsModel,
    MailSettingsModel,
    CalendarsModel,
    CalendarUserSettingsModel,
    AddressesModel,
];

const PRELOAD_MODELS = [UserModel, UserSettingsModel, AddressesModel];

interface Props {
    onLogout: () => void;
    locales: TtagLocaleMap;
}
const PrivateApp = ({ onLogout, locales }: Props) => {
    const api = useApi();
    const cache = useCache();

    useAppTitle('');

    return (
        <StandardPrivateApp
            onLogout={onLogout}
            locales={locales}
            onInit={async () => {
                const [calendars] = await loadModels([CalendarsModel], { api, cache });
                if (calendars?.length) {
                    await loadModels([CalendarUserSettingsModel], { api, cache });
                }
            }}
            preloadModels={PRELOAD_MODELS}
            eventModels={EVENT_MODELS}
            fallback={<LoaderPage />}
            hasPrivateMemberKeyGeneration
            hasReadableMemberKeyActivation
        >
            <ErrorBoundary>
                <MainContainer />
            </ErrorBoundary>
        </StandardPrivateApp>
    );
};

export default PrivateApp;
