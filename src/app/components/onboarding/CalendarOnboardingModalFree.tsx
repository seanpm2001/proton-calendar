import React from 'react';
import { c } from 'ttag';
import { getAccountSettingsApp, getAppName } from 'proton-shared/lib/apps/helper';
import { OnboardingContent, OnboardingModal, OnboardingStep, useAppLink } from 'react-components';
import { APPS } from 'proton-shared/lib/constants';
import { getLightOrDark } from 'proton-shared/lib/themes/helpers';

import onboardingWelcome from 'design-system/assets/img/onboarding/onboarding-protoncalendar.svg';
import onboardingWelcomeDark from 'design-system/assets/img/onboarding/onboarding-protoncalendar-dark.svg';

const CalendarOnboardingModalFree = (props: any) => {
    const goToApp = useAppLink();

    const appName = getAppName(APPS.PROTONCALENDAR);
    const mailAppName = getAppName(APPS.PROTONMAIL);

    const handleSubmit = () => {
        goToApp('/subscription', getAccountSettingsApp());
    };

    const handleClose = () => {
        goToApp('/', getAccountSettingsApp());
    };

    return (
        <OnboardingModal setWelcomeFlags={false} {...props}>
            {() => (
                <OnboardingStep
                    title={c('Onboarding ProtonCalendar').t`A calendar for your eyes only`}
                    submit={c('Onboarding ProtonCalendar').t`Get ${appName}`}
                    onSubmit={handleSubmit}
                    close={c('Onboarding ProtonCalendar').t`Back to your Dashboard`}
                    onClose={handleClose}
                >
                    <OnboardingContent
                        description={c('Onboarding ProtonCalendar')
                            .t`${appName} is currently in beta and only available to paid users of ${mailAppName}.`}
                        img={<img src={getLightOrDark(onboardingWelcome, onboardingWelcomeDark)} alt={appName} />}
                        text={c('Onboarding ProtonCalendar')
                            .t`To access ${appName} Beta program today, consider upgrading to a paid plan. ${appName} will be available to Free plan users upon launch.`}
                    />
                </OnboardingStep>
            )}
        </OnboardingModal>
    );
};

export default CalendarOnboardingModalFree;