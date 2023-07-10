'use client';

import { useState }                           from 'react';
import useTranslation                         from 'next-translate/useTranslation';
import { getCategoryProducts }                from '@aquilacms/aquila-connector/api/category';
import Filters                                from '@components/category/Filters';
import Pagination                             from '@components/category/Pagination';
import ProductList                            from '@components/product/ProductList';
import { useCategoryProducts, useSiteConfig } from '@lib/hooks';

export default function CategoryBody({ category }) {
    const [message, setMessage] = useState();
    const { categoryProducts }  = useCategoryProducts();
    const { themeConfig }       = useSiteConfig();
    const { lang, t }           = useTranslation();

    const getProductsList = async (postBody) => {
        setMessage();
        try {
            const products = await getCategoryProducts('', category._id, lang, postBody);
            return products;
        } catch (err) {
            setMessage({ type: 'error', message: err.message || t('common:message.unknownError') });
            throw new Error('Error getProductsList');
        }
    };

    return (
        <div className="tabs w-tabs">
            <div id="tabs_content" className="tabs-content w-tab-content">
                {
                    themeConfig?.values?.find(v => v.key === 'filters')?.value === 'top' && (
                        <div className="div-block-allergenes">
                            <Filters filtersData={category.filters} getProductsList={getProductsList} />
                        </div>
                    )
                }
            
                <Pagination getProductsList={getProductsList}>
                    <ProductList type="data" value={categoryProducts.datas} />
                </Pagination>
                {
                    message && (
                        <div className={`w-commerce-commerce${message.type}`}>
                            <div>
                                {message.message}
                            </div>
                        </div>
                    )
                }
            </div>
        </div>
    );
}