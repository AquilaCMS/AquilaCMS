function componentToHex(c) {
    var hex = c.toString(16);
    return hex.length == 1 ? "0" + hex : hex;
}

function rgbToHex(r, g, b) {
    return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}

export function reset_filter() {
    cy.get('.sidebar > .sidebar__actions > button').click({force:true});
}

// gd = 1 if you want tomove the 1st handle or 2 if you want to move the second
export function move_filter(gd, nvprix) {
    gd = gd.toString();
    cy.get('.sidebar > .form-filters > form > .form__body > .widget > .rc-slider > .rc-slider-handle-' + gd).then(($rc) => {
        cy.get('.form-filters > form > .form__body > .widget > span').then(($span) => {
            var cran;
            cran = (1 / (parseInt($span[1].textContent) - parseInt($span[0].textContent))) * 100;
            if (gd == 1) {
                // We are increasing price gradually to avoid bugs in filter
                for (var ii = (parseInt($rc[0].style.left) / cran); ii < (nvprix - parseInt($span[0].textContent)); ii++) {
                    cy.get('.sidebar > .form-filters > form > .form__body > .widget > .rc-slider > .rc-slider-handle-' + gd).then(($btn) => {
                        $rc[0].style.left = ((parseInt($rc[0].style.left, 10) + cran).toString() + '%');
                    }).click({force:true});
                    cy.wait(500);
                }
            } else if (gd == 2) {
                // We are decreasing price gradually to avoir bugs in filter
                for (var ii = 25 - (parseInt($span[0].textContent) + (parseInt($rc[0].style.left)) / cran); ii < (parseInt($span[1].textContent) - nvprix); ii++) {
                    cy.get('.sidebar > .form-filters > form > .form__body > .widget > .rc-slider > .rc-slider-handle-' + gd).then(($btn) => {
                        $rc[0].style.left = ((parseInt($rc[0].style.left, 10) - cran).toString() + '%');
                    }).click({force:true});
                    cy.wait(500);
                }
            } else {
                throw ('La variable gd doit être égale à 1 pour le slider-handle de gauche et 2 pour celui de droite')
            }
            // $rc[0].style.left = (cran * (nvprix - parseInt($span[0].textContent))).toString() + '%';
        })
    })
}

// This fonction will check materials and take only the one you want to check
export function check_material_filter(materialName) {
    // Add Material Filter
    // ID behind is category ID, you need to edit it if he changes
    try {
        cy.get('.sidebar #5d3967aa4aa9c1692db068ce_div').click({force:true});
    } catch (e) {
        throw ("Check if category ID is the same in the script and in your page")
    }
    cy.get('.sidebar input#5d3967aa4aa9c1692db068ce_' + materialName).check({force:true});
    cy.wait(1000);

    cy.get('.content .products-grid .product--horizontal').then(($prd) => {
        var arr = [];
        for (var i = 0; i < $prd.length; i++) {
            cy.get('#' + $prd[i].id + ' > .product__content > .product__entry > a').click({force:true});
            cy.wait(1000);
            // I want here to check if, in material attribute of product, there is the material we wanted to check
            // We check in a product page all attributes, and values on an attribute if it is "Matières"
            cy.get('.table-specs > table > tbody').then(($crc) => {
                for (var ii = 0; $crc[0].children[ii] ; ii++) {
                    // We get name of the attribute
                    arr[ii] = $crc[0].children[ii].children[0].outerText;
                    // We check if it is equal to "Matières"
                    if (arr[ii] == "Matières") {
                        // We get materials of the product in an array containing all products materials
                        arr[ii] = $crc[0].children[ii].children[1].outerText.split(", ");
                        // We check if the product we are in have material we want to check
                        for (var iii = 0; arr[ii][iii]; iii++) {
                            if (arr[ii][iii] == materialName) {
                                arr.material = true;
                            }
                        }
                    }
                }
                if (arr.material != true) {
                    throw('Le produit est filtré mais n\'a pas le material ' + materialName);
                }
            })

            // Go to 'T-shirt page
            cy.get('.nav [href="/c/mes-produits"]').trigger('mouseover', {force:true});
            cy.get('.nav [href="/c/mes-produits/t-shirt"]').click({force:true});
            cy.wait(1500);
        }
    })

    // Go to 'T-shirt' page
    cy.get('.nav [href="/c/mes-produits"]').trigger('mouseover', {force:true});
    cy.get('.nav [href="/c/mes-produits/t-shirt"]').click({force:true});
    cy.wait(1500);
}

export function check_color_filter(colorid) {
    cy.get('.sidebar #5da5765ede6bed65e1d2a6f8_div').click({force:true});
    cy.wait(750)
    cy.get('.sidebar #5da5765ede6bed65e1d2a6f8_div > .list-checkboxes > .checkbox').then(($ttt) => {
        for (var i = 0; $ttt[i]; i++) {
            if ($ttt[i].id == ('5da5765ede6bed65e1d2a6f8_' + colorid + '_div')) {
                i++;
                break;
            }
        }
        cy.get('.sidebar #5da5765ede6bed65e1d2a6f8_div > .list-checkboxes > .checkbox:nth-child(' + i + ') > [type="checkbox"]').check({force:true});
        cy.wait(1500);

        cy.get('.content .products-grid .product--horizontal').then(($prd) => {
            var arr = [];
            var color;
            for (var i = 0; i < $prd.length; i++) {
                cy.get('#' + $prd[i].id + ' > .product__content > .product__entry > a').click({force:true});
                cy.wait(1000);
                // I want here to check if, in color attribute of product, there is the color we wanted to check
                // We check in a product page all attributes, and values on an attribute if it is "Couleurs"
                cy.get('.table-specs > table > tbody').then(($crc) => {
                    for (var ii = 0; $crc[0].children[ii] ; ii++) {
                        arr[ii] = $crc[0].children[ii].children[0].outerText;
                        if (arr[ii] == "Couleurs") {
                            // I want here to get color of the product by parsing html of the object 'color'
                            color = $crc[0].children[ii].children[1].children[0].style.backgroundColor;
                            // We are parsing color property to get an array containing the color in rgb format
                            color = color.slice(color.search(/[(]/) + 1, color.search(/[)]/)).split(', ');
                            // We are changing rg color in hexadecimal color to compre it at colorID we wanted to check
                            color = rgbToHex(parseInt(color[0], 10), parseInt(color[1], 10), parseInt(color[2], 10));
                            if (color.toLowerCase() == colorid.toLowerCase()) {
                                arr.color = true;
                            }
                        }
                    }
                    if (arr.color != true) {
                        throw('Le produit est filtré mais n\'a pas la couleur ' + colorid);
                    }
                })

                // Go to 'T-shirt' page
                cy.get('.nav [href="/c/mes-produits"]').trigger('mouseover', {force:true});
                cy.get('.nav [href="/c/mes-produits/t-shirt"]').click({force:true});
                cy.wait(1500);
            }
        })
    })
    

}

// name = name of the product, prix = initial price of the product, prixreduit = price of the product with reductions
// If there is no reduced price, give as a parameter initial price of the product for the variable prixreduit
// id = id of the product (default: ($prd[index du produit].id)), i = index of the product + 1
export function check_informations(name, prix, prixreduit, id, i) {
    const link2 = ('.content .products-grid > #' + id + ' > .product__content');
    cy.get(link2 + ' > .product__entry > a > h4').then(($name) => {
        if ($name[0].textContent != name) {
            throw ('Le Nom du produit ' + i + ' ne correspond pas à ' + name);
        }
    })
    cy.get(link2 + ' > .product__aside > .product-price').then(($price) => {
        if ($price[0].children.length == 1) {
            if (parseFloat($price[0].children[0].innerText, 10) != prix) {
                throw('Le Prix du Produit ' + i + ' ne correspond pas à ' + prix + '€ : ' + parseFloat($price[0].children[0].innerText, 10))
            }
        } else if ($price[0].children.length == 2) {
            if (parseFloat($price[0].children[0].innerText, 10) != prix) {
                throw('Le Prix Initial du Produit ' + i + ' ne correspond pas à ' + prix + '€ : ' + parseFloat($price[0].children[0].innerText, 10))
            }
            if (parseFloat($price[0].children[1].innerText, 10) != prixreduit) {
                throw('Le Prix Réduit du Produit ' + i + ' ne correspond pas à ' + prixreduit + '€ : ' + parseFloat($price[0].children[1].innerText, 10))
            }
        } else {
            throw('Le Produit ' + i + ' à plus de deux prix')
        }
    })
}
