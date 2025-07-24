export const isRTCSubscriber = () => {
    const osType = getOSType()
    return ['iOS', 'macOS'].includes(osType) && getDeviceType() === 'Tablet'
}

export const getOSType = () => {
    const ua = navigator.userAgent;
    if (/Windows NT 10/.test(ua)) return 'Windows 10';
    if (/Windows NT 6.3/.test(ua)) return 'Windows 8.1';
    if (/Windows NT 6.1/.test(ua)) return 'Windows 7';
    if (/Mac OS X/.test(ua)) return 'macOS';
    if (/Android/.test(ua)) return 'Android';
    if (/iPhone|iPad|iPod/.test(ua)) return 'iOS';
    if (/Linux/.test(ua)) return 'Linux';

    return 'Unknown';
}

export const getDeviceType = ()=>  {
    const ua = navigator.userAgent;
    if (/Tablet|iPad/i.test(ua)) return 'Tablet';
    if (/Mobi|Android/i.test(ua)) return 'Mobile';
    return 'Desktop';
}