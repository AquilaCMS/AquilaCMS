import React from 'react';

/**
 * CMS - Affichage d'un bloc CMS
 * @return {React.Component}
 */

class ProductVariants extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        const {product, hasVariants, selectVariant} = this.props

        if(hasVariants(product)) {
            if(product.variants[0].type === 'image') {
                return (
                    <div className="variants__container variants__image">
                        <ul className="variants-values__list">
                        {
                            product.variants_values.filter(vv => vv.active).map((variant) => {
                                const vImage = variant.images.find(img => img.default) || {}
                                return (
                                    <li key={variant._id} className={"variant-value " + ((product.selected_variant._id === variant._id) ? "selected" : "")} onClick={() => selectVariant(product, variant)}>
                                        <img src={'/images/productsVariant/50x50-50/' + vImage._id + '/' + vImage.name} alt={variant.name}/>
                                    </li>
                                )
                            })
                        }
                        </ul>
                    </div>
                )
            } else if (product.variants[0].type === 'radio') {
                return (
                    <div className="variants__container variants_radio">
                        <div className="variants-values__list">
                            {
                                product.variants_values.filter(vv => vv.active).map((variant) => {
                                    return (
                                            <div className={product.selected_variant._id === variant._id ? 'selected variant-value' : 'variant-value'} onClick={() => selectVariant(product, variant)}>
                                                <span>{variant.name}</span>
                                            </div>   
                                    )
                                })
                            }
                        </div>
                    </div>
                )
            }
        }
        return null
    }

}

export default ProductVariants;
