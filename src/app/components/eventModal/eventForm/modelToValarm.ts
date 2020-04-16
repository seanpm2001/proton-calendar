import { SETTINGS_NOTIFICATION_TYPE } from 'proton-shared/lib/interfaces/calendar';
import { getValarmTrigger } from './getValarmTrigger';
import { NotificationModel } from '../../../interfaces/NotificationModel';
import { VcalValarmComponent } from '../../../interfaces/VcalModel';

export const modelToValarmComponent = (notificationModel: NotificationModel): VcalValarmComponent => {
    return {
        component: 'valarm',
        trigger: {
            value: getValarmTrigger(notificationModel)
        },
        action: {
            value: notificationModel.type === SETTINGS_NOTIFICATION_TYPE.EMAIL ? 'EMAIL' : 'DISPLAY'
        }
    };
};