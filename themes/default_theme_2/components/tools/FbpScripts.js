import { FB_PIXEL_ID } from '@lib/common/fb-pixel/fpixel';

export default function FbpScripts({ cookieNotice }) {
    if (!FB_PIXEL_ID || cookieNotice !== 'true') return null;
    return (
        <noscript>
            <img
                height="1"
                width="1"
                style={{ display: 'none' }}
                src={`https://www.facebook.com/tr?id=${FB_PIXEL_ID}&ev=PageView&noscript=1`}
                alt=""
            />
        </noscript>
    );
}