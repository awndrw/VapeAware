import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Storage from './storage';
import { LOCATIONS } from './constants';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: true
    })
});

/**
 * Sends a push notification to the user if they are 
 * @param {string} title Push notification title
 * @param {string} body Push notification body
 * @param {{}} [data={}] Data to pass to the app when opening the push notification
 */
export async function send(title, body, data = {}) {
    let expoPushToken = await Storage.local.read(LOCATIONS.PUSHTOKEN) || await register();

    const message = {
        to: expoPushToken,
        sound: 'default',
        title: title,
        body: body,
        data: data
    };

    await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
            Accept: 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
    });
}

/**
 * Gets the participant's permission to send push notifications
 * and stores the participant's push notification token in local storage
 */
export async function register() {
    let token;
    if (Constants.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }
        if (finalStatus !== 'granted') {
            console.log('Failed to get push token for push notification!');
            return;
        }
        token = (await Notifications.getExpoPushTokenAsync()).data;
        Storage.local.write(LOCATIONS.PUSHTOKEN, token);
    } else {
        console.log('Must use physical device for Push Notifications');
    }

    if (Platform.OS === 'android') {
        Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
        });
    }

    return token;
}

export function addListener(cb) {
    Notifications.addNotificationResponseReceivedListener(cb);
}

export function removeListener(listener) {
    Notifications.removeNotificationSubscription(listener);
}

export function scheduleDailySurvey(time) {
    const dateTime = new Date(time);
    Notifications.scheduleNotificationAsync({
        content: {
            title: 'VapeAware Optional Survey',
            body: 'Its time to fill our your daily survey!'
        },
        trigger: {
            hour: dateTime.getHours(),
            minute: dateTime.getMinutes(),
            repeats: true
        }
    });

    const threeHoursLater = new Date(time);
    threeHoursLater.setTime(time + (3*60*60*1000));
    Notifications.scheduleNotificationAsync({
        content: {
            title: 'VapeAware Optional Survey',
            body: 'Your daily survey will expire in 1 hour!'
        },
        trigger: {
            hour: threeHoursLater.getHours(),
            minute: threeHoursLater.getMinutes(),
            repeats: true
        }
    });
}

export function cancelScheduledSurvey() {
    return Notifications.cancelAllScheduledNotificationsAsync();
}

export function getNextOccurrance(date) {
    const now = new Date();
    while (now - date > 0)
        date.setDate(date.getDate() + 1);
    return date;
}

export default { register, send, addListener, removeListener, scheduleDailySurvey, cancelScheduledSurvey, getNextOccurrance };