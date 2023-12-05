import Newsletter        from '@components/common/Newsletter';
import FooterMenu        from '@components/navigation/FooterMenu';
import { useSiteConfig } from '@lib/hooks';

export default function Footer() {
    const { environment } = useSiteConfig();

    return (

        <div className="footer">
            <Newsletter />

            <div className="section-footer">
                <div className="columns-3 w-row">
                    <div className="w-col w-col-2 w-col-medium-4">
                        <img src="/images/medias/max-100/605363104b9ac91f54fcabac/Logo.jpg" loading="lazy" alt={environment?.siteName} style={{ maxHeight: '150px' }} />
                    </div>
                    <div className="w-col w-col-2 w-col-medium-4" />

                    <FooterMenu />

                    <div className="w-col w-col-2 w-col-medium-4">
                        <div className="social-icon-wrap">
                            <a href="https://www.instagram.com" className="social-link w-inline-block" target="_blank" rel="noreferrer" ><img src="/images/social-instagram.svg" alt="Instagram" className="social-icon" /></a>
                            <a href="https://fr-fr.facebook.com" className="social-link w-inline-block" target="_blank" rel="noreferrer"><img src="/images/social-twitter.svg" alt="Twitter" className="social-icon" /></a>
                            <a href="https://www.youtube.com" className="social-link w-inline-block" target="_blank" rel="noreferrer"><img src="/images/social-youtube.svg" alt="Youtube" className="social-icon" /></a>
                        </div>
                    </div>

                </div>
            </div>

            <div className="footer-legal">
                <p className="paragraph-2">Powered by <a href="https://www.aquila-cms.com/" target="_blank" rel="noreferrer">AquilaCMS</a></p>
            </div>
        </div>

    );
}
