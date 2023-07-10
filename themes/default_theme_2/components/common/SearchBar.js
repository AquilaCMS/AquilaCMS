'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import useTranslation                 from 'next-translate/useTranslation';
import BlockCMS                       from '@components/common/BlockCMS';
import { useSiteConfig }              from '@lib/hooks';

export default function SearchBar() {
    const router          = useRouter();
    const query           = useSearchParams();
    const { t }           = useTranslation();
    const { themeConfig } = useSiteConfig();

    // Getting boolean search bar display
    const searchBarDisplay = themeConfig?.values?.find(t => t.key === 'displaySearchBar')?.value !== undefined ? themeConfig?.values?.find(t => t.key === 'displaySearchBar')?.value : true;

    const handleSearch = async (e) => {
        e.preventDefault();
        const postForm = e.currentTarget;
        const search   = postForm.search.value.trim();
        
        // Min 2 caracters
        if (search?.length >= 2) {
            router.push(`/search/${encodeURIComponent(search)}`);
        }
    };

    const search = query.search;

    if (!searchBarDisplay) {
        return null;
    }

    return (
        <div className="container-newsletter" style={{ paddingBottom: '0px', marginTop: '10px' }}>
            <BlockCMS nsCode="top-banner" />
            <div>
                <form className="form-3" onSubmit={handleSearch}>
                    <input type="text" className="text-field-2 w-input" name="search" maxLength="256" defaultValue={search} />
                    <button type="submit" className="submit-button-newsletter w-button">{t('components/searchBar:submit')}</button>
                </form>
            </div>
        </div>
    );
}