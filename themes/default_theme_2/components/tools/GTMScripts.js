import { GTM_ID } from '@lib/common/google-tag-manager/gtm';

export default function GTMScripts({ cookieNotice }) {
    if (!GTM_ID || !cookieNotice || cookieNotice === 'deny') return null;

    return (
        <noscript>
            <iframe
                src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
                height="0"
                width="0"
                style={{ display: 'none', visibility: 'hidden' }}
            />
        </noscript>
    );
}