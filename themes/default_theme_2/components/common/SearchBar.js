import { useRouter }  from 'next/router';
import useTranslation from 'next-translate/useTranslation';

export default function SearchBar() {
    const router = useRouter();
    const { t }  = useTranslation();

    const handleSearch = async (e) => {
        e.preventDefault();
        const postForm = e.currentTarget;
        const search   = postForm.search.value.trim();
        
        // Min 2 caracters
        if (search?.length >= 2) {
            router.push(`/search/${encodeURIComponent(search)}`);
        }
    };

    const search = router.query.search;

    return (
        <div className="container-newsletter" style={{ paddingBottom: '0px', marginTop: '10px' }}>
            <div>
                <form className="form-3" onSubmit={handleSearch}>
                    <input type="text" className="text-field-2 w-input" name="search" maxLength="256" defaultValue={search} />
                    <button type="submit" className="submit-button-newsletter w-button">{t('components/searchBar:submit')}</button>
                </form>
            </div>
        </div>
    );
}