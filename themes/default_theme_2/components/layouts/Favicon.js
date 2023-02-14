
export default function Favicon() {
    return (
        <>
            <link
                rel="apple-touch-icon"
                sizes="180x180"
                href="/favicon/apple-icon-180x180.png"
            />
            <link
                rel="icon"
                type="image/png"
                sizes="32x32"
                href="/favicon/favicon-32x32.png"
            />
            <link
                rel="icon"
                type="image/png"
                sizes="16x16"
                href="/favicon/favicon-16x16.png"
            />
            <link rel="manifest" href="/favicon/manifest.json" />
            <link rel="shortcut icon" href="/favicon/favicon.ico" />
            <meta name="msapplication-TileColor" content="#000000" />
            <meta name="msapplication-config" content="/favicon/browserconfig.xml" />
            {/* <meta property="og:image" content={TODO} /> */}
        </>
    );
}