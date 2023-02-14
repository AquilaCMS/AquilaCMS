
import { useState, useEffect }   from 'react';
import parse                     from 'html-react-parser';
import Link                      from 'next/link';
import useTranslation            from 'next-translate/useTranslation';
import { generateURLImageCache } from '@aquilacms/aquila-connector/lib/utils';
import { useComponentData }      from '@lib/hooks';
import { formatDate }            from '@lib/utils';



export default function BlogList({ list = [] }) {
    const [limitOfArticles, setLimitOfArticles] = useState(6);
    const componentData                         = useComponentData();
    const { lang, t }                           = useTranslation();

    useEffect(() => {
        setLimitOfArticles(sessionStorage.getItem('max_articles') ? sessionStorage.getItem('max_articles') : 6);
    }, []);

    useEffect(() => {
        if (blogList.length > 0) {
            const articleID = sessionStorage.getItem('articleID');
            if (articleID) {
                const articleOnPage = document.getElementById(articleID);
                if (articleOnPage){
                    const articlePosition = articleOnPage.getBoundingClientRect().top - 120;
                    window.scrollTo(0, articlePosition);
                    articleOnPage.classList.add('blog-card-return-animation');
                    sessionStorage.removeItem('articleID');
                    sessionStorage.removeItem('max_articles');
                }
            }   
        }
    }, [limitOfArticles]);

    // Get data in redux store or prop list 
    let blogList = componentData['nsBlogList'] || list;
    if (!blogList?.length) {
        return <div className="w-dyn-empty">
            <div>{t('components/blogList:noArticle')}</div>
        </div>;  
    }
    
    function displayMoreArticles() {
        const newLimitOfArticles = parseInt(limitOfArticles) + 6; // 6 articles per click
        setLimitOfArticles(newLimitOfArticles); // Set the new limit
        sessionStorage.setItem('max_articles', newLimitOfArticles ); // Save the new limit in sessionStorage
    } 

    let blogListDisplayed = blogList.slice(0, limitOfArticles);

    return (
        <div className="content-section">
            <div className="container-flex-2" style={{ flexWrap: 'wrap' }}>
                {
                    blogListDisplayed.map((article) => {
                        return (
                            <div key={article._id} id={article._id} className="food-card blog-card">
                                <img src={generateURLImageCache('blog', '578x266-80-crop-center', article._id, article.slug[lang], article.img)} alt={article.title} className="food-image blog-thumbnail" loading="lazy" />
                                <div style={{ height: '100%' }}>
                                    <div className="food-card-content blog-card-content">
                                        <div className="food-title-wrap blog-title-wrap">
                                            <h6 className="heading-9">{article.title}</h6>
                                        </div>
                                        <p className="blog-date">{formatDate(article.createdAt, lang, { hour: '2-digit', minute: '2-digit', weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}</p>
                                        <p className="paragraph">{article.title.length > 25 ? parse(article.content.resume.slice(0, 45)) : parse(article.content.resume.slice(0, 80))}[...]</p>
                            
                                        <form className="w-commerce-commerceaddtocartform default-state">
                                            <Link href={`/blog/${article.slug[lang]}`}>
                                                <button 
                                                    onClick={() => sessionStorage.setItem('articleID', article._id)} 
                                                    type="submit" 
                                                    className="w-commerce-commerceaddtocartbutton order-button" 
                                                    style={{ justifyContent: 'center' }}
                                                >
                                                    {t('components/blogList:readMore')}
                                                </button>
                                            </Link>
                                        </form>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                }
            </div>
            {limitOfArticles < blogList.length ? <div style={{ display: 'flex', justifyContent: 'center', marginTop: '10px' }}><button className="tab-link-round w-inline-block w-tab-link" onClick={displayMoreArticles}>Afficher plus d&apos;articles...</button></div> : null}
        </div>
    );
}