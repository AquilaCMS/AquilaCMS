describe ('Check des Filtres', function () {
    it ('Check des filtres prix, couleur et matière', function () {
        cy.visit('');

        // There are variables for functions calls in the script
        const gd = 2;
        const newprice = 20;
        const material = 'Coton';
        const colorid = '#244161';

  
        // Go to a category page
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

        // On donne à cette fonction gd (1 ou 2 si gauche ou droite) et le nouveau prix  => Elle marche à moitié mais selon moi ça vient du drag&drop inexistant
        function move_filter(gd, nvprix) {
            gd = gd.toString();
            cy.get('.sidebar > .form-filters > form > .form__body > .widget > .rc-slider > .rc-slider-handle-' + gd).then(($rc) => {
                cy.get('.form-filters > form > .form__body > .widget > span').then(($span) => {
                    var cran;
                    cran = (1 / (parseInt($span[1].textContent) - parseInt($span[0].textContent))) * 100;
                    if (gd == 1) {
                        // On augmente le prix petit à petit afin de ne pas faire bugger le filtre
                        for (var ii = (parseInt($rc[0].style.left) / cran); ii < (nvprix - parseInt($span[0].textContent)); ii++) {
                            cy.get('.sidebar > .form-filters > form > .form__body > .widget > .rc-slider > .rc-slider-handle-' + gd).then(($btn) => {
                                $rc[0].style.left = ((parseInt($rc[0].style.left, 10) + cran).toString() + '%');
                                console.log(((parseInt($rc[0].style.left, 10) + cran).toString() + '%'))
                            }).click({force:true});
                            cy.wait(500);
                        }
                    } else if (gd == 2) {
                        // On diminue le prix petit à petit afin de ne pas faire bugger le filtre
                        console.log('ttt ' + (parseInt($span[0].textContent)), 'uuu ' + (parseInt($rc[0].style.left)) / cran)
                        for (var ii = 25 - (parseInt($span[0].textContent) + (parseInt($rc[0].style.left)) / cran); ii < (parseInt($span[1].textContent) - nvprix); ii++) {
                            console.log(parseInt($span[1].textContent), (parseInt($span[1].textContent) - nvprix), ii)
                            cy.get('.sidebar > .form-filters > form > .form__body > .widget > .rc-slider > .rc-slider-handle-' + gd).then(($btn) => {
                                $rc[0].style.left = ((parseInt($rc[0].style.left, 10) - cran).toString() + '%');
                                console.log(((parseInt($rc[0].style.left, 10) - cran).toString() + '%'))
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

        // Cette fonction va check les materials et ne prend que le nom de celui à vérifier en paramètre
        function check_material_filter(materialName) {
            // Add Material Filter
            // L'ID dessous est l'ID des pages catégorie, le remplacer s'il est venu à changer
            cy.get('.sidebar #5d3967aa4aa9c1692db068ce_div').click();
            cy.get('.sidebar input#5d3967aa4aa9c1692db068ce_' + materialName).check({force:true});
            cy.wait(1000);

            cy.get('.content .products-grid .product--horizontal').then(($prd) => {
                var arr = [];
                for (var i = 0; i < $prd.length; i++) {
                    console.log($prd[i]);
                    cy.get('#' + $prd[i].id + ' > .product__content > .product__entry > a').click({force:true});
                    cy.wait(1000);
                    // Je veux ici vérifier si dans matières, il y a bien la matière que l'on à filtrée
                    // On vérifie dans une page produit tous les attributs, puis leur valeur si attribut == 'Matériel'
                    cy.get('.table-specs > table > tbody').then(($crc) => {
                        for (var ii = 0; $crc[0].children[ii] ; ii++) {
                            // On récupère le nom de l'attribut
                            arr[ii] = $crc[0].children[ii].children[0].outerText;
                            // On vérifie si il est égal ou non à 'Matières'
                            if (arr[ii] == "Matières") {
                                // On récupère les matières du produit sous forme de tableau contenant toutes les matières du produit
                                arr[ii] = $crc[0].children[ii].children[1].outerText.split(", ");
                                // On vérifie si le produit en question possède bien l'attribut recherché
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

                    // Go to a category page
                    cy.get('.nav [href="/c/mes-produits"]').trigger('mouseover', {force:true});
                    cy.get('.nav [href="/c/mes-produits/t-shirt"]').click({force:true});
                    cy.wait(1500);
                }
            })

            // Go to a category page
            cy.get('.nav [href="/c/mes-produits"]').trigger('mouseover', {force:true});
            cy.get('.nav [href="/c/mes-produits/t-shirt"]').click({force:true});
            cy.wait(1500);
        }

        function check_color_filter(colorid) {
            var i;
            cy.get('.sidebar #5da5765ede6bed65e1d2a6f8_div').click();
            cy.wait(750)
            cy.get('.sidebar #5da5765ede6bed65e1d2a6f8_div > .list-checkboxes > .checkbox').then(($ttt) => {
                console.log($ttt);
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
                        console.log($prd[i]);
                        cy.get('#' + $prd[i].id + ' > .product__content > .product__entry > a').click({force:true});
                        cy.wait(1000);
                        // Je veux ici vérifier si dans matières, il y a bien la matière que l'on à filtrée
                        // On vérifie dans une page produit tous les attributs, puis leur valeur si attribut == 'Matériel'
                        cy.get('.table-specs > table > tbody').then(($crc) => {
                            console.log($crc)
                            for (var ii = 0; $crc[0].children[ii] ; ii++) {
                                arr[ii] = $crc[0].children[ii].children[0].outerText;
                                if (arr[ii] == "Couleurs") {
                                    // Je souhaite ici récupérer la couleur en parsant l'html de l'objet
                                    color = $crc[0].children[ii].children[1].children[0].style.backgroundColor;
                                    // On parse ici la propriété color afin de récupérer un tableau contenant notre couleur en rgb
                                    color = color.slice(color.search(/[(]/) + 1, color.search(/[)]/)).split(', ');
                                    // On transforme color en hexadecimal pour pouvoir le comparer
                                    color = rgbToHex(parseInt(color[0], 10), parseInt(color[1], 10), parseInt(color[2], 10));
                                    if (color == colorid) {
                                        arr.color = true;
                                    }
                                }
                            }
                            if (arr.color != true) {
                                throw('Le produit est filtré mais n\'a pas la couleur ' + colorid);
                            }
                        })
    
                        // Go to a category page
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
                // Si on bouge le filtre de gauche ou de droite, on a pas le même comparateur de prix
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

        // Juste donner en paramètre le nom du filtre
        check_material_filter(material);
        reset_filter();

        // Check pour un filtre couleur 
        check_color_filter(colorid);


    })
})
