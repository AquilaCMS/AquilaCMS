import { Fragment, useEffect, useState } from 'react';
import { getMainImage }                  from '@aquilacms/aquila-connector/api/product/helpersProduct';
import { useProduct, useSiteConfig }     from '@lib/hooks';
import { cloneObj }                      from '@lib/utils';

export default function ProductVariants() {
    const [ selectedVariant, setSelectedVariant ] = useState([]);
    const { product, setProduct }                 = useProduct();
    const { themeConfig }                         = useSiteConfig();

    // Getting boolean dynamic variants display
    const unclickableVariants = themeConfig?.values?.find(t => t.key === 'unclickableVariants')?.value !== undefined ? themeConfig?.values?.find(t => t.key === 'unclickableVariants')?.value : false;

    let selected = [ ...selectedVariant ];
    if (!selected.length) {
        for (let i = 0; i < product.variants.length; i++) {
            selected.push({ code: product.variants[i].code, value: product.variants_values.find(item => item.default).variant_codes.split('--')[i] }); 
        }
    }

    useEffect(() => {
        if (unclickableVariants) {
            let found = false;
            for (let i = 0; i < selected.length; i++) {
                let disabled = isDisabledVariant(selected[i].code, selected[i].value);
                if (disabled === 2) {
                    selectVariant(selected[i].code, selected[i].value);
                    found = true;
                    break;
                } else if (!disabled) {
                    found = true;
                    break;
                }
            }
            if (!found) {
                for (let i = 0; i < product.variants_values.length; i++) {
                    if (product.variants_values[i].active && product.variants_values[i].stock.status !== 'epu' && product.variants_values[i].stock.orderable) {
                        const vc               = product.variants_values[i].variant_codes.split('--');
                        let newSelectedVariant = [...selected];
                        for (let j = 0; j < newSelectedVariant.length; j++) {
                            newSelectedVariant[j].value = vc[j];
                        }
                        setSelectedVariant(newSelectedVariant);
                        affectVariantValueToProduct(vc);
                        break;
                    }
                }
            }
        }
    }, []);

    const isSelectedVariant = (code, value) => {
        if (selected.find(item => item.code === code && item.value === value.toLowerCase())) {
            return true;
        }
        return false;
    };

    const isSelectedVariantValue = (variant_codes) => {
        const vc             = variant_codes.split('--');
        let selectedVariants = true;
        for (let i = 0; i < selected.length; i++) {
            if (selected[i].value !== vc[i]) {
                selectedVariants = false;
            }
        }
        return selectedVariants;
    };

    const isDisabledVariant = (code, value) => {
        value = value.toLowerCase();

        const variant_codes = [];
        for (let i = 0; i < selected.length; i++) {
            if (selected[i].code === code) {
                variant_codes.push(value);
            } else {
                variant_codes.push(selected[i].value);
            }
        }

        let selectedVariantIsDisabled = false;
        let othersVariantIsAvailable  = false;
        for (let i = 0; i < product.variants_values.length; i++) {
            const vc    = product.variants_values[i].variant_codes.split('--');
            const index = selected.findIndex(item => item.code === code);
            if (vc[index] === value) {
                if (!product.variants_values[i].active || product.variants_values[i].stock.status === 'epu' || !product.variants_values[i].stock.orderable) {
                    if (vc.join('--') === variant_codes.join('--')) {
                        selectedVariantIsDisabled = true;
                    }
                } else {
                    if (vc.join('--') !== variant_codes.join('--')) {
                        othersVariantIsAvailable = true;
                    }
                }
            }
        }
        if (selectedVariantIsDisabled) {
            if (othersVariantIsAvailable) {
                return 2;
            }
            return 1;
        }
        return 0;
    };

    const selectVariant = (code, value) => {
        value             = value.toLowerCase();
        let variant_codes = [];
        if (unclickableVariants && isDisabledVariant(code, value)) {
            // Search nearest variant
            for (let i = 0; i < product.variants_values.length; i++) {
                const vc    = product.variants_values[i].variant_codes.split('--');
                const index = selected.findIndex(item => item.code === code);
                if (vc[index] === value) {
                    if (product.variants_values[i].active && product.variants_values[i].stock.status !== 'epu' && product.variants_values[i].stock.orderable) {
                        let newSelectedVariant = [...selected];
                        for (let j = 0; j < newSelectedVariant.length; j++) {
                            newSelectedVariant[j].value = vc[j];
                        }
                        setSelectedVariant(newSelectedVariant);
                        variant_codes = vc;
                        break;
                    }
                }
            }
            if (!variant_codes.length) {
                return;
            }
        } else {
            for (let i = 0; i < product.variants.length; i++) {
                if (product.variants[i].code === code) {
                    let newSelectedVariant = [...selected];
                    newSelectedVariant[i]  = { code, value };
                    setSelectedVariant(newSelectedVariant);
                    for (let i = 0; i < newSelectedVariant.length; i++) {
                        variant_codes.push(newSelectedVariant[i].value);
                    }
                    break;
                }
            }
        }
        affectVariantValueToProduct(variant_codes);
    };

    const selectVariantValue = (variant_codes) => {
        const vc               = variant_codes.split('--');
        let newSelectedVariant = [...selected];
        for (let i = 0; i < newSelectedVariant.length; i++) {
            newSelectedVariant[i].value = vc[i];
        }
        setSelectedVariant(newSelectedVariant);
        affectVariantValueToProduct(vc);
    };

    const affectVariantValueToProduct = (variant_codes) => {
        const p            = cloneObj(product);
        const sv           = p.variants_values.find(item => item.variant_codes === variant_codes.join('--'));
        p.active           = sv.active;
        p.images           = sv.images;
        p.name             = sv.name;
        p.stock            = sv.stock;
        p.price            = sv.price;
        p.selected_variant = sv;
        setProduct(p);
    };

    if (!product.variants_values?.length) {
        return null;
    }

    return (
        <>
            {   
                product.variants[0].type === 'list2' ? (
                    <div className="product-variants-listing">
                        {
                            product.variants_values.map((variant) => {
                                const disabled = !variant.active || variant.stock.status === 'epu' || !variant.stock.orderable;
                                return (
                                    <Fragment key={variant._id}>
                                        <input type="radio" id={variant._id} name="variants" className="variant-radio" onChange={() => {selectVariantValue(variant.variant_codes);}} checked={isSelectedVariantValue(variant.variant_codes)} disabled={unclickableVariants && disabled} />
                                        <label className={`variant-label${disabled ? ` disabled-all${!unclickableVariants ? ' clickable' : ''}` : ''}`} htmlFor={variant._id}>{variant.name}</label>
                                    </Fragment>
                                );
                            })
                        }
                    </div>
                ) : (
                    <>
                        {
                            product.variants.map((variants, index) => (
                                <div key={variants._id} className="product-variants">
                                    <span style={{ minWidth: '80px' }}>{variants.name}</span>
                                    <div className="product-variants-listing">
                                        {
                                            variants.type === 'radio' && (
                                                variants.values.map((value) => {
                                                    const disabled = isDisabledVariant(variants.code, value);
                                                    return (
                                                        <Fragment key={`${variants._id}_${value}`}>
                                                            <input type="radio" id={`${variants._id}_${value}`} name={variants._id} className="variant-radio" onChange={() => {selectVariant(variants.code, value);}} checked={isSelectedVariant(variants.code, value)} disabled={unclickableVariants && disabled === 1} />
                                                            {
                                                                product.attributes.find(a => a.code === variants.code).type !== 'listcolor' ? (
                                                                    <label className={`variant-label${disabled ? (disabled === 2 ? ' disabled' : ` disabled-all${!unclickableVariants ? ' clickable' : ''}`) : ''}`} htmlFor={`${variants._id}_${value}`}>{value}</label>
                                                                ) : (
                                                                    <label className={`variant-label-color${disabled ? (disabled === 2 ? ' disabled' : ` disabled-all${!unclickableVariants ? ' clickable' : ''}`) : ''}`} htmlFor={`${variants._id}_${value}`}><span style={{ backgroundColor: value }}>&nbsp;</span></label>
                                                                )
                                                            }
                                                        </Fragment>
                                                    );
                                                })
                                            )
                                        }
                                        {                                                                    
                                            variants.type === 'list' && (
                                                <select value={selected.find(item => item.code === variants.code).value} className="variant-select" onChange={(e) => selectVariant(variants.code, e.target.value)}>
                                                    {
                                                        variants.values.map((value) => {
                                                            const disabled = isDisabledVariant(variants.code, value);
                                                            return (
                                                                <option key={`${variants._id}_${value}`} value={value.toLowerCase()} disabled={disabled === 1}>{value}</option>
                                                            );
                                                        })
                                                    }
                                                </select>
                                            )
                                        }
                                        {
                                            variants.type === 'image' && (
                                                variants.values.map((value) => {
                                                    const disabled      = isDisabledVariant(variants.code, value);
                                                    const variant_codes = [];
                                                    for (let i = 0; i < selected.length; i++) {
                                                        if (index === i) {
                                                            variant_codes.push(value.toLowerCase());
                                                        } else {
                                                            variant_codes.push(selected[i].value);
                                                        }
                                                    }
                                                    const pv        = product.variants_values.find(item => item.variant_codes === variant_codes.join('--'));
                                                    const mainImage = getMainImage(pv.images.filter((i) => !i.content), '50x50', true);
                                                    return (
                                                        <Fragment key={`${variants._id}_${value}`}>
                                                            <input type="radio" id={`${variants._id}_${value}`} name={variants._id} className="variant-radio" onChange={() => {selectVariant(variants.code, value);}} checked={isSelectedVariant(variants.code, value)} disabled={unclickableVariants && disabled === 1} />
                                                            {
                                                                <label className={`variant-label-image${disabled ? (disabled === 2 ? ' disabled' : ` disabled-all${!unclickableVariants ? ' clickable' : ''}`) : ''}`} htmlFor={`${variants._id}_${value}`}>
                                                                    <img src={mainImage.url} alt={mainImage.alt} />
                                                                </label>
                                                            }
                                                        </Fragment>
                                                    );
                                                })
                                            )
                                        }
                                    </div>
                                </div>
                            ))
                        }
                    </>
                )
            }
        </>
    );
}