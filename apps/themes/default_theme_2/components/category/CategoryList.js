import useTranslation from 'next-translate/useTranslation';
import CategoryCard   from '@components/category/CategoryCard';

export default function CategoryList({ categoryList }) {
    const { t } = useTranslation();

    if (!categoryList?.length) {
        return (
            <div className="w-dyn-empty">
                <div>{t('components/category:categoryList.noCategory')}</div>
            </div>
        );
    }

    return (
        <div role="list" className="order-collection w-dyn-items w-row">
            {categoryList.map((item) => (
                <CategoryCard key={item._id} item={item} />
            ))}
        </div>
    );
}