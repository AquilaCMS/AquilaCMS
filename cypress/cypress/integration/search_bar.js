describe ('Search products with search bar and filters', function () {
    it ('Search products using search bar and filters', function () {
        cy.visit('');

        const gd = 1;
        const newprice = 15;
        const search = "T-shirt";

        // Search in the search bar
        cy.get('input#search').type(search, {force:true});
        cy.get('button[name="submit"]').click({force:true});

        // Get the list of visible products
        cy.get('.content .products-grid .product--horizontal').then(($prd) => {
            check_name('T-shirt basique blanc', $prd[0].id, 1);
            check_name('T-shirt blanc/vert', $prd[1].id, 2);
            check_name('T-shirt marinière rouge', $prd[2].id, 3);
            check_name('T-shirt basique noir', $prd[3].id, 4);
            check_name('T-shirt basique bleu', $prd[4].id, 5);
        })

        move_filter(gd, newprice);
        
        // Check prices with filter
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
    })
})

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

// name = name of the product
// id = id of the product (default: ($prd[index du produit].id)), i = index of the product + 1
function check_name(name, id, i) {
    const link2 = ('.content .products-grid > #' + id + ' > .product__content');
    cy.get(link2 + ' > .product__entry > a > h4').then(($name) => {
        if ($name[0].textContent != name) {
            throw ('Le Nom du produit ' + i + ' ne correspond pas à ' + name);
        }
    })
}