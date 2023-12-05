import Link                      from 'next/link';
import { useRouter }             from 'next/router';
import useTranslation            from 'next-translate/useTranslation';
import { generateURLImageCache } from '@aquilacms/aquila-connector/lib/utils';

export default function CategoryCard({ item }) {
    const { asPath }  = useRouter();
    const { lang, t } = useTranslation();

    if (!item) {
        return <div className="w-dyn-empty">{t('components/category:categoryCard.noCategory')}</div>;
    }

    return (
        <div role="listitem" className="menu-item w-dyn-item w-col w-col-2">
            <div>
                <Link href={`${asPath}/${item.slug[lang]}`} className="food-image-square w-inline-block">
                    <img src={generateURLImageCache('category', '145x145', item._id, item.code, item.img)} alt={item.name} className="food-image" loading="lazy" />
                </Link>
                <div className="food-card-content">
                    <Link href={`${asPath}/${item.slug[lang]}`}>
                        {item.name}
                    </Link>
                </div>
            </div>
        </div>
    );
}