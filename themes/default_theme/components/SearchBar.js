import React from 'react';
import { NSSearchBar } from 'aqlrc';

/**
 * NSSearchBar - Affichage du champ de recherche
 * @return {React.Component}
 */
class SearchBar extends NSSearchBar {
    constructor(props, context) {
        super(props, context);
        this.state = {
            query : context.props && context.props.search ? context.props.search : '',
            mode: false
        };
        this.search = React.createRef();
    }

    render() {
        const { button, placeholder, t } = this.props;
        const { query, mode } = this.state;
        return (
            <> 
                {
                    !mode ? (
                        <span className="material-symbols-outlined search-icon" onBlur={() => this.setState({mode: false})} onClick={() => this.setState({mode: true})}>search</span>
                    ) : (
                        <div className="search">
                            <form onSubmit={((e) => this.searchProducts(e))}>
                                <div className="search__controls">
                                    <label htmlFor="search" className="hidden">{t('common:search')}</label>
                                    <input id="search" type="text" ref={this.search} name="search" placeholder={placeholder || t('common:search')} className="search__field" onChange={(e) => this.setState({ query: e.target.value })} value={query} />

                                    <button type="submit" name="submit" className="search__btn" aria-label={t('common:search')}>
                                        <span className="material-symbols-outlined" style={{color: '#424242'}}>search</span>
                                    </button>
                                </div>
                            </form>
                        </div>
                    )
                }
            </>
        );
    }
}

export default SearchBar;