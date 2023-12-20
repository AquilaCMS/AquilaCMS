import { useEffect, useRef, useState } from 'react';
import useTranslation                  from 'next-translate/useTranslation';
import Lightbox                        from 'lightbox-react';
import { getItemsGallery }             from '@aquilacms/aquila-connector/api/gallery';
import { generateURLImageCache }       from '@aquilacms/aquila-connector/lib/utils';
import { useComponentData }            from '@lib/hooks';

import 'lightbox-react/style.css';

const Video = ({ content }) => (
    <iframe
        width="560"
        height="315"
        src={`https://www.youtube.com/embed/${content}`}
        style={{
            maxWidth : '100%',
            position : 'absolute',
            left     : 0,
            right    : 0,
            margin   : 'auto',
            top      : '50%',
            transform: 'translateY(-50%)',
        }}
        title={content}
    />
);

export default function Gallery({ 'ns-code': nsCode, galleryContent }) {
    const componentData               = useComponentData();
    const [gallery, setGallery]       = useState(galleryContent || componentData[`nsGallery_${nsCode}`]);
    const [photoIndex, setPhotoIndex] = useState(0);
    const [isOpen, setIsOpen]         = useState(false);
    const [message, setMessage]       = useState();
    const timer                       = useRef();
    const { t }                       = useTranslation();

    useEffect(() => {
        return () => clearTimeout(timer.current);
    }, []);

    const openLightBox = (i) => {
        setPhotoIndex(i);
        setIsOpen(true);
    };

    const loadMoreData = async () => {
        try {
            const galleryItems = await getItemsGallery(nsCode);
            setGallery(galleryItems);
        } catch (err) {
            setMessage({ type: 'error', message: err.message || t('common:message.unknownError') });
            const st      = setTimeout(() => { setMessage(); }, 3000);
            timer.current = st;
        }
    };

    if (!gallery) {
        return <div className="w-dyn-empty">{t('components/gallery:noGallery', { nsCode })}</div>;
    }
    if (!gallery.datas.length) {
        return <div className="w-dyn-empty">{t('components/gallery:noItem', { nsCode })}</div>;
    }
    
    const array = gallery.datas.map((item, index) => {
        if (item.content) return { content: <Video content={item.content} />, alt: item.alt };
        return { content: generateURLImageCache('gallery', 'max', item._id, item.alt || index, item.src), alt: item.alt };
    });

    return (
        <div className="gallery">
            {
                isOpen && (
                    <Lightbox
                        mainSrc={array[photoIndex].content}
                        nextSrc={array[(photoIndex + 1) % array.length].content}
                        prevSrc={array[(photoIndex + array.length - 1) % array.length].content}
                        imageTitle={array[photoIndex].alt}
                        onCloseRequest={() => setIsOpen(false)}
                        onMovePrevRequest={() => setPhotoIndex((photoIndex + array.length - 1) % array.length)}
                        onMoveNextRequest={() => setPhotoIndex((photoIndex + 1) % array.length)}
                    />
                )
            }
            <div className="gallery-grid">
                {
                    gallery.datas.map((item, index) => {
                        return (
                            <div key={item._id} className="grid-item" onClick={() => openLightBox(index)}>
                                <div className="overlay">
                                    <div className="text">{item.alt}</div>
                                </div>
                                {
                                    item.content ? 
                                        <img src={`https://img.youtube.com/vi/${item.content}/0.jpg`} height="200" alt={item.alt} />
                                        : <img src={generateURLImageCache('gallery', '200x200', item._id, item.alt || index, item.src)} alt={item.alt} />
                                }
                            </div>
                        );
                    })
                }
            </div>
            {
                gallery.datas.length !== gallery.count && (
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <button type="button" className="log-button-03 w-button" onClick={loadMoreData}>{t('components/gallery:loadMore')}</button>
                    </div>
                )
            }
            {
                message && (
                    <div className={`w-commerce-commerce${message.type}`}>
                        <div>
                            {message.message}
                        </div>
                    </div>
                )
            }
            <style jsx>
                {`
                    .gallery .gallery-grid {
                        display: grid;
                        grid-gap: 36px;
                        grid-template-columns: repeat(${gallery.maxColumnNumber}, minmax(100px,1fr));
                        justify-items: center;
                        position: relative;
                    }

                    .gallery .grid-item {
                        display: grid;
                        cursor: pointer;
                        transition: 0.4s;
                        position: relative;
                    }

                    .gallery .overlay {
                        position: absolute;
                        top: 0;
                        bottom: 0;
                        left: 0;
                        right: 0;
                        height: 100%;
                        width: 100%;
                        opacity: 0;
                        transition: .5s ease;
                        background-color: #000000;
                        z-index: 100;
                        font-size: 20px;
                        color: #FFFFFF;
                    }

                    .gallery .overlay:hover {
                        opacity: 0.8;
                    }
                    
                    .gallery .text {
                        color: white;
                        font-size: 20px;
                        position: absolute;
                        padding-bottom: 20px;
                        padding-top: 20px;
                        top: 50%;
                        left: 50%;
                        display: flex;
                        width: 33%;
                        justify-content: center;
                        transform: translate(-50%,-50%);
                        border-bottom: 1px solid white;
                        border-top: 1px solid white;
                    }

                    @media screen and (max-width:479px) {
                        .gallery .gallery-grid {
                            display: grid;
                            grid-gap: 36px;
                            grid-template-columns: repeat(auto-fill, minmax(354px,1fr));
                            position: relative;
                        }
                    }
                `}
            </style>
        </div>
    );
}