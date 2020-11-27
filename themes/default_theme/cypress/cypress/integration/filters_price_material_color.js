describe ('Check filters', function () {
    it ('Check price, material and color filter', function () {
        cy.visit('');

        // There are variables for functions calls in the script
        const gd = 2;
        const newprice = 20;
        const material = 'Coton';
        const colorid = '#244161';

  
        // Go to 'T-shirt' page
        cy.get('.nav [href="/c/mes-produits"]').trigger('mouseover', {force:true});
        cy.get('.nav [href="/c/mes-produits/t-shirt"]').click({force:true});
        cy.wait(1500);

        function componentToHex(c) {
            var hex = c.toString(16);
            return hex.length == 1 ? "0" + hex : hex;
        }
        
        function rgbToHex(r, g, b) {
            return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
        }

        function reset_filter() {
            cy.get('.sidebar > .sidebar__actions > button').click({force:true});
        }

        // gd = 1 if you want tomove the 1st handle or 2 if you want to move the second
        function move_filter(gd, nvprix) {
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
        function check_material_filter(materialName) {
            // Add Material Filter
            // ID behind is category ID, you need to edit it if he changes
            try {
                cy.get('.sidebar #5d3967aa4aa9c1692db068ce_div').click();
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

        function check_color_filter(colorid) {
            cy.get('.sidebar #5da5765ede6bed65e1d2a6f8_div').click();
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

        move_filter(gd, newprice);
        
        // Check price values
        cy.get('.product__content > .product__aside > .product-price > strong > span').then(($p) => {
            var test = $p;
            var nb;

            for (var i = 0; i < test.length; i++) {
                nb = parseInt(test[i].textContent);
                // If we move left handle or right one, we don't have same price comparator
                if (gd == 1) {    
                    if (nb < newprice) {
                        throw('Le filtre prix ne fonctionne pas');
                    }
                } else if (gd == 2) {
                    if (nb > newprice) {
                        throw('Le filtre prix ne fonctionne pas');
                    }
                }
            }
        })
        reset_filter();

        // Just give as a parameter of this function material of the filter (Go to top of this script to change it)
        check_material_filter(material);
        reset_filter();

        // Just give as a parameter of this function color id (in hexadecimal, ex: #000000) of the filter (Go to top of this script to change it)
        check_color_filter(colorid);
    })
})