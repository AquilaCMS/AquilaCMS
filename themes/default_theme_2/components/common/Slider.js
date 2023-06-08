import Link                      from 'next/link';
import useTranslation            from 'next-translate/useTranslation';
import { Carousel }              from 'react-responsive-carousel';
import { generateURLImageCache } from '@aquilacms/aquila-connector/lib/utils';
import { useComponentData }      from '@lib/hooks';

import 'react-responsive-carousel/lib/styles/carousel.min.css';

export default function Slider({ 'ns-code': nsCode, sliderContent }) {
    const componentData = useComponentData();
    const { t }         = useTranslation();
    
    const slider = sliderContent || componentData[`nsSlider_${nsCode}`];
    
    if (!slider) {
        return <div className="w-dyn-empty">{t('components/slider:noSlider', { nsCode })}</div>;
    }
    if (!slider.items.length) {
        return <div className="w-dyn-empty">{t('components/slider:noItem', { nsCode })}</div>;
    }
    return (
        <Carousel
            autoPlay={slider.autoplay}
            emulateTouch={true}
            infiniteLoop={slider.infinite}
            interval={slider.autoplaySpeed || 5000}
            stopOnHover={slider.pauseOnHover}
            showStatus={false}
            showThumbs={false}
            renderArrowPrev={(onClickHandler, hasPrev, label) =>
                hasPrev && (
                    <div className="left-arrow w-slider-arrow-left" onClick={onClickHandler} title={label}>
                        <div className="w-icon-slider-left" />
                    </div>
                )
            }
            renderArrowNext={(onClickHandler, hasNext, label) =>
                hasNext && (
                    <div className="right-arrow w-slider-arrow-right" onClick={onClickHandler} title={label}>
                        <div className="w-icon-slider-right" />
                    </div>
                )
            }
        >
            {slider.items.map((item) => {
                const img = <img
                    src={generateURLImageCache('slider', 'max', item._id, item.name, item.extension)}
                    alt={item.name || ''}
                    title={item.name || ''}
                    loading="lazy"
                />;
                return (
                    <div key={item._id}>
                        {item.href ? (
                            item.href.startsWith('/') ? (
                                <Link href={item.href} style={{ display: 'block' }}>
                                    {img}
                                </Link>
                            ) : (
                                <a href={item.href} target="_blank" rel="noreferrer" style={{ display: 'block' }}>
                                    {img}
                                </a>
                            )
                        ) : img}
                    </div>
                );
            })}
        </Carousel>
    );
}
