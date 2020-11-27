// name = name of the product, prix = initial price of the product, prixreduit = price of the product with reductions
// If there is no reduced price, give as a parameter initial price of the product for the variable prixreduit
// id = id of the product (default: ($prd[index du produit].id)), i = index of the product + 1
function check_informations(name, prix, prixreduit, id, i) {
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

describe('Sorting by \'Price +\'', function() {
        it('Check Products after sorting by \'Price +\' ', function() {
            cy.visit('')
            
            // Go to "my-products" page
            cy.get('[href="/c/mes-produits"]').click({force:true})
            cy.wait(1500)

            // Activate sorting
            cy.get('#field-sort-by').select('Prix +', {force:true})
            cy.wait(1500)

            const link = '.content .products-grid';

            // Get the list of visible products
            cy.get(link + ' .product--horizontal').then(($prd) => {
                check_informations('Sweat jaune', 29, 5, $prd[0].id, 1);
                check_informations('Sweat noir', 28, 5, $prd[1].id, 2);
                check_informations('T-shirt marinière rouge', 25, 5, $prd[2].id, 3);
                check_informations('T-shirt blanc/vert', 22, 5, $prd[3].id, 4);
                check_informations('T-shirt basique bleu', 17, 5, $prd[4].id, 5);
                check_informations('T-shirt basique noir', 17, 5, $prd[5].id, 6);
                check_informations('T-shirt basique blanc', 17, 5, $prd[6].id, 7);
                check_informations('Chaussettes bleues', 8, 5, $prd[7].id, 8);
                check_informations('Chaussettes noires', 8, 5, $prd[8].id, 9);
            })
        })
})


describe('Sorting by \'Price +\'', function() {
    it('Check Products after sorting by \'Price +\' in T-shirt category', function() {
        cy.visit('')
  
        // Go to "T-shirts" page
        cy.get('[href="/c/mes-produits"]').trigger('mouseover', {force:true})
        cy.get('[href="/c/mes-produits/t-shirt"]').click({force:true})
        cy.wait(1500)

        // Activate sorting
        cy.get('#field-sort-by').select('Prix +', {force:true})
        cy.wait(1500)

        const link = '.content .products-grid';

        // Get the list of visible products
        cy.get(link + ' .product--horizontal').then(($prd) => {
            check_informations('T-shirt marinière rouge', 25, 5, $prd[0].id, 1);
            check_informations('T-shirt blanc/vert', 22, 5, $prd[1].id, 2);
            check_informations('T-shirt basique bleu', 17, 5, $prd[2].id, 3);
            check_informations('T-shirt basique noir', 17, 5, $prd[3].id, 4);
            check_informations('T-shirt basique blanc', 17, 5, $prd[4].id, 5);
        })
    })
})

describe('Sorting by \'Price +\'', function() {
    it('Check Products after sorting by \'Price +\' in Sweat category', function() {
        cy.visit('')
  
        // Go to "Sweats" page
        cy.get('[href="/c/mes-produits"]').trigger('mouseover', {force:true})
        cy.get('[href="/c/mes-produits/sweat"]').click({force:true})
        cy.wait(1500)

        // Activate sorting
        cy.get('#field-sort-by').select('Prix +', {force:true})
        cy.wait(1500)

        const link = '.content .products-grid';

        // Get the list of visible products
        cy.get(link + ' .product--horizontal').then(($prd) => {
            check_informations('Sweat jaune', 29, 5, $prd[0].id, 1);
            check_informations('Sweat noir', 28, 5, $prd[1].id, 2);
        })
    })
})

describe('Sorting by \'Price +\'', function() {
    it('Check Products after sorting by \'Price +\' in Socks category', function() {
        cy.visit('')
  
        // Go to "Socks" page
        cy.get('[href="/c/mes-produits"]').trigger('mouseover', {force:true})
        cy.get('[href="/c/mes-produits/chaussettes"]').click({force:true})
        cy.wait(1500)

        // Activate sorting 
        cy.get('#field-sort-by').select('Prix +', {force:true})
        cy.wait(1500)

        const link = '.content .products-grid';

        // Get the list of visible products
        cy.get(link + ' .product--horizontal').then(($prd) => {
            check_informations('Chaussettes bleues', 8, 5, $prd[0].id, 1);
            check_informations('Chaussettes noires', 8, 5, $prd[1].id, 2);
        })
    })
})