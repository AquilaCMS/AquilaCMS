import Head                            from 'next/head';
import Link                            from 'next/link';
import parse                           from 'html-react-parser';
import { useCmsBlocks, useSiteConfig } from '@lib/hooks';

export default function LightLayout({ children }) {
    const { environment } = useSiteConfig();
    const cmsBlocks       = useCmsBlocks();
    const cmsBlockHead    = cmsBlocks.find((b) => b.code === 'head'); // Getting CMS block "Head"

    return (
        <>
            <Head>
                {cmsBlockHead?.content ? parse(cmsBlockHead.content) : null}
            </Head>

            <div id="Navigation" data-collapse="medium" role="banner" className="navbar w-nav">
                <div className="navigation-container">
                    <div className="navigation-left">
                        <Link href="/" aria-current="page" className="brand w-nav-brand w--current">
                            <img src="/images/medias/max-100/605363104b9ac91f54fcabac/Logo.jpg" alt={environment?.siteName} />
                        </Link>
                    </div>
                </div>
            </div>

            <main>{children}</main>

            <div className="footer">
                <div className="section-footer">
                    <div className="columns-3 w-row">
                        <div className="w-col w-col-2 w-col-medium-4">
                            <img src="/images/medias/max-100/605363104b9ac91f54fcabac/Logo.jpg" loading="lazy" alt={environment?.siteName} />
                        </div>
                        <div className="w-col w-col-2 w-col-medium-8" />
                    </div>
                </div>
                <div className="footer-legal">
                    <p className="paragraph-2">Powered by <a href="https://www.aquila-cms.com/" target="_blank" rel="noreferrer">AquilaCMS</a></p>
                </div>
            </div>
        </>
    );
}
