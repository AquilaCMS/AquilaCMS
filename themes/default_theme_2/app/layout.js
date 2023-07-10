import useTranslation from 'next-translate/useTranslation';

import '@styles/normalize.css';
import '@styles/webflow.css';
import '@styles/styles.webflow.css';
import '@styles/globals.css';
import '@styles/animations.css';
import '@styles/custom.css';

export default async function RootLayout({ children }) {
    const { lang } = useTranslation();

    return (
        <html lang={lang}>
            <body>
                {children}
            </body>
        </html>
    );
}