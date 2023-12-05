import { useEffect, useRef, useState } from 'react';
import crypto                          from 'crypto';
import useTranslation                  from 'next-translate/useTranslation';
import ProductCard                     from '@components/product/ProductCard';
import { useComponentData }            from '@lib/hooks';
import { isMobile }                    from '@lib/utils';

export default function ProductList({ type, value, max = undefined, autoplay = true, delayAutoplay = 5000 }) {
    const interval                        = useRef();
    const [currentIndex, setCurrentIndex] = useState(1);
    const [maxItems, setMaxItems]         = useState(max);
    const componentData                   = useComponentData();
    const { t }                           = useTranslation();

    useEffect(() => {
        if (max && isMobile()) {
            setMaxItems(1);
        }
    }, []);

    // 2 options :
    // Live use in code (data in "value" prop => type = "data")
    // Use in CMS block (data in redux store => SET_COMPONENT_DATA => type = "category|new|product_id|product_code|list_id|list_code")
    let productList = [];
    if (type === 'data') {
        productList = value;
    } else {
        const hash = crypto.createHash('md5').update(`${type}_${value}`).digest('hex');
        if (componentData[`nsProductList_${hash}`]) {
            productList = componentData[`nsProductList_${hash}`];
        }
    }

    useEffect(() => {
        if (maxItems && (productList.length > maxItems || maxItems === 99) && autoplay) {
            interval.current = setInterval(slideNext, delayAutoplay);
            return () => clearInterval(interval.current);
        }
    }, []);

    if (!productList?.length) {
        return (
            <div className="w-dyn-empty">
                <div>{t('components/product:productList.noProduct')}</div>
            </div>
        );
    }

    const productListStopAutoplay = () => {
        if (interval.current) {
            clearInterval(interval.current);
        }
    };

    const productListAutoplay = () => {
        if (autoplay) {
            interval.current = setInterval(slideNext, delayAutoplay);
        }
    };

    const slidePrev = () => {
        setCurrentIndex(prevCurrentIndex => prevCurrentIndex - 1 > 0 ? prevCurrentIndex - 1 : Math.ceil(productList.length / maxItems));
    };

    const slideNext = () => {
        setCurrentIndex(prevCurrentIndex => prevCurrentIndex + 1 <= Math.ceil(productList.length / maxItems) ? prevCurrentIndex + 1 : 1);
    };

    // If maxItems is defined and the size of the product list is larger than maxItems => slider mode
    if (maxItems && productList.length > maxItems) {
        // Products displayed
        const productsDisplayed = [];
        [...Array(Number(maxItems))].map((el, index) => {
            if (productList[maxItems * (currentIndex - 1) + index]) {
                const item = productList[maxItems * (currentIndex - 1) + index];
                productsDisplayed.push(item);
            }
        });

        // Hidden products (included in HTML for SEO)
        const hiddenProducts = [];
        productList.map((item) => {
            if (!productsDisplayed.find(p => p._id === item._id)) {
                hiddenProducts.push(item);
            }
        });

        return (
            <>
                <div role="list" className="order-collection w-dyn-items w-row" style={{ paddingLeft: '60px', paddingRight: '60px' }} onMouseEnter={productListStopAutoplay} onMouseLeave={productListAutoplay}>
                    {
                        productsDisplayed.map((item) => (
                            <ProductCard key={item._id} type="data" value={item} />
                        ))
                    }
                    {
                        hiddenProducts.map((item) => (
                            <ProductCard key={item._id} type="data" value={item} hidden={true} />
                        ))
                    }
                </div>
                <div className="left-arrow w-slider-arrow-left" role="button" onClick={slidePrev}><div className="w-icon-slider-left" style={{ background: 'black', opacity: 0.3 }}></div></div>
                <div className="right-arrow w-slider-arrow-right" role="button" onClick={slideNext}><div className="w-icon-slider-right" style={{ background: 'black', opacity: 0.3 }}></div></div>
            </>
        );
    }

    return (
        <div role="list" className="order-collection w-dyn-items w-row">
            {productList.map((item) => (
                <ProductCard key={item._id} type="data" value={item} />
            ))}
        </div>
    );
}