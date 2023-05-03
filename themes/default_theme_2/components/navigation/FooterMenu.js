import useTranslation    from 'next-translate/useTranslation';
import Link              from 'next/link';
import { useFooterMenu } from '@lib/hooks';

export default function FooterMenu() {
    const { lang }   = useTranslation();
    const footerMenu = useFooterMenu();
    const nbCol      = 5 - footerMenu?.children?.length;
    const nbColClass = `w-col w-col-${nbCol} w-col-medium-4`;

    if(footerMenu && footerMenu.children) {
        return (
            <>
                {footerMenu.children.map((item) => {
                    return (
                        <div className={nbColClass} key={item._id}>
                            <div className="footer-heading">{item.name}</div>
                            <p className="footer-paragraphe">
                                {item?.children?.map((itemChild) => {
                                    return (
                                        <Link href={itemChild.action === 'catalog' ? `/c/${itemChild.slug[lang]}` : `/${itemChild.pageSlug}`} key={itemChild._id} prefetch={false} className="link-footer">
                                            {itemChild.name}
                                        </Link>
                                    );
                                })}
                            </p>
                        </div>
                    );
                })}
            </>
        );
    }
    else return null;
}
