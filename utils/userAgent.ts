import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

export const getUserAgent = () => {
  const appName = Constants.expoConfig?.name ?? 'UnknownApp';
  const appVersion = Constants.expoConfig?.version ?? '0.0.0';

  const osName = capitalize(Platform.OS); // 'Android' or 'Ios'
  const osVersion = Device.osVersion ?? 'unknown';
  const modelName = Device.modelName ?? 'unknown';
  const deviceType = getDeviceType(Device.deviceType ?? undefined);
  const isEmulator = Device.isDevice ? 'Device' : 'Emulator';

  // Full User-Agent format
  const userAgent = `${appName}/${appVersion} (${osName} ${osVersion}; ${modelName}; ${deviceType}; ${isEmulator})`;

  return userAgent;
};

const getDeviceType = (type: Device.DeviceType | undefined) => {
  switch (type) {
    case Device.DeviceType.PHONE:
      return 'Phone';
    case Device.DeviceType.TABLET:
      return 'Tablet';
    case Device.DeviceType.DESKTOP:
      return 'Desktop';
    case Device.DeviceType.TV:
      return 'TV';
    default:
      return 'Unknown';
  }
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
