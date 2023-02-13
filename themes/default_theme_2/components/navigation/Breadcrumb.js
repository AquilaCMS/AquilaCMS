import Link                 from 'next/link';
import { useRouter }        from 'next/router';
import useTranslation       from 'next-translate/useTranslation';
import { BreadcrumbJsonLd } from 'next-seo';

export default function Breadcrumb({ items, origin }) {
    const router   = useRouter();
    const { lang } = useTranslation();

    if (items?.length > 0) {
        const breadcrumbForJsonLd = [];
        for (let index in items) {
            let url = items[index].link;
            if (router.defaultLocale !== lang) {
                if (url === '/') {
                    url = `/${lang}`;
                } else {
                    url = `/${lang}${url}`;
                }
            }
            breadcrumbForJsonLd.push({
                position: Number(index) + 1,
                name    : items[index].text,
                item    : `${origin}${url}`
            });
        }

        return (
            <div className="container-ariane w-container">
                {items.map((item, index) => {
                    return (
                        <Link href={item.link} className="link-ariane-2" key={index}>
                            &gt; {item.text}
                        </Link>
                    );
                })}
                <BreadcrumbJsonLd itemListElements={breadcrumbForJsonLd} />
            </div>
        );
    }
    else return null;
}