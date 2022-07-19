import React                   from 'react';
import parse                   from 'html-react-parser';
import { NSBlogArticles }      from 'aqlrc';
import { formatDate }          from 'lib/utils';

/**
 * NSBlogArticles - Affiche la liste des articles du blog
 * @return {React.Component}
 */
export default class BlogArticles extends NSBlogArticles {
    render() {
        const { gNext } = this.props;
        const { props } = this.context;
        const { lang, nsBlogArticles } = props;
        const Link = (gNext && gNext.Link) || undefined;

        return (
            <div className="blog-container">
                <div className="container-flex-2" style={{ flexWrap: 'wrap' }}>
                    {nsBlogArticles.map((article) => (
                        <div key={article._id} id={article._id} className="blog-card">
                            <img src={`/images/blog/578x266-80-crop-center/${article._id}/${article.slug[lang]}${article.extension}`} alt={article.title} className="blog-thumbnail" loading="lazy" />
                            <div style={{ height: '100%' }}>
                                <div className="blog-card-content">
                                    <div className="blog-title-wrap">
                                        <h6>{article.title}</h6>
                                    </div>
                                    <p className="blog-date" itemProp='datePublished'>{formatDate(article.createdAt, lang, { hour: '2-digit', minute: '2-digit', weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}</p>
                                    <p>{article.title.length > 25 ? parse(article.content.resume.slice(0, 45)) : parse(article.content.resume.slice(0, 80))}[...]</p>
                                
                                    <form>
                                        <Link href={`/blog/${article.slug[lang]}`}>
                                            <a>
                                                <button onClick={() =>
                                                    sessionStorage.setItem('articleID', article._id)} 
                                                type="submit" 
                                                className="btn btn--silver" 
                                                style={{ justifyContent: 'center' }}>
                                                        Lire plus
                                                </button>
                                            </a>
                                        </Link>
                                    </form>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
}
