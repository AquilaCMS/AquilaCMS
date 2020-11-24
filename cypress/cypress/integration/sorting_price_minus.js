// name = nom du produit, prix = prix initial du produit, prixreduit = prix du produit avec les réductions
// Si il n'y a pas de prix avec réduction, donner le prix normal à la fonction dans la variable prixreduit
// id = l'id du produit ($prd[index du produit].id), i = index du produit + 1
function check_informations(name, prix, prixreduit, id, i) {
    const link2 = ('.content .products-grid > #' + id + ' > .product__content');
    cy.get(link2 + ' > .product__entry > a > h4').then(($name) => {
        if ($name[0].textContent != name) {
            throw ('Le Nom du produit ' + i + ' ne correspond pas à ' + name);
        }
    })
    cy.get(link2 + ' > .product__aside > .product-price').then(($price) => {
        console.log($price)
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

describe('Sorting by \'Price -\'', function() {
        it('Check Products after sorting by \'Price -\' ', function() {
            cy.viewport(1920, 969)
    
            cy.visit('http://localhost:3010/')
            
            // Aller dans la page 'mes produits'
            cy.get('[href="/c/mes-produits"]').click({force:true})
            cy.wait(1500)

            // Activer le tri
            cy.get('#field-sort-by').select('Prix -', {force:true})
            cy.wait(1500)

            const link = '.content .products-grid';

            // Récupérer la liste des produits affichés
            cy.get(link + ' .product--horizontal').then(($prd) => {
                for (var i = 0; i < $prd.length; i++) {
                    console.log($prd[i], $prd[i].id)
                }
                check_informations('T-shirt basique blanc', 17, 13, $prd[0].id, 1);
                check_informations('Tenue complète', 59.99, 30, $prd[1].id, 2);
                check_informations('Chaussettes noires', 8, 8, $prd[2].id, 3);
                check_informations('Chaussettes bleues', 8, 8, $prd[3].id, 4);
                check_informations('T-shirt basique noir', 17, 17, $prd[4].id, 5);
                check_informations('T-shirt basique bleu', 17, 17, $prd[5].id, 6);
                check_informations('T-shirt blanc/vert', 22, 22, $prd[6].id, 7);
                check_informations('T-shirt marinière rouge', 25, 25, $prd[7].id, 8);
                check_informations('Sweat noir', 28, 28, $prd[8].id, 9);
                check_informations('Sweat jaune', 29, 29, $prd[9].id, 10);
            })
        })
})


describe('Sorting by \'Price -\'', function() {
    it('Check Products after sorting by \'Price -\' in T-shirt category', function() {
        cy.viewport(1920, 969)
    
        cy.visit('http://localhost:3010/')
  
        // Aller dans la page 'T-shirts'
        cy.get('[href="/c/mes-produits"]').trigger('mouseover', {force:true})
        cy.get('[href="/c/mes-produits/t-shirt"]').click({force:true})
        cy.wait(1500)

        // Activer le tri
        cy.get('#field-sort-by').select('Prix -', {force:true})
        cy.wait(1500)

        const link = '.content .products-grid';

        // Récupérer la liste des produits affichés
        cy.get(link + ' .product--horizontal').then(($prd) => {
            for (var i = 0; i < $prd.length; i++) {
                console.log($prd[i], $prd[i].id)
            }
            check_informations('T-shirt basique blanc', 17, 13, $prd[0].id, 1);
            check_informations('T-shirt basique noir', 17, 17, $prd[1].id, 2);
            check_informations('T-shirt basique bleu', 17, 17, $prd[2].id, 3);
            check_informations('T-shirt blanc/vert', 22, 22, $prd[3].id, 4);
            check_informations('T-shirt marinière rouge', 25, 25, $prd[4].id, 5);
        })
    })
})

describe('Sorting by \'Price -\'', function() {
    it('Check Products after sorting by \'Price -\' in Sweat category', function() {
        cy.viewport(1920, 969)
    
        cy.visit('http://localhost:3010/')
  
        // Aller dans la page 'Sweats'
        cy.get('[href="/c/mes-produits"]').trigger('mouseover', {force:true})
        cy.get('[href="/c/mes-produits/sweat"]').click({force:true})
        cy.wait(1500)

        // Activer le tri
        cy.get('#field-sort-by').select('Prix -', {force:true})
        cy.wait(1500)

        const link = '.content .products-grid';

        // Récupérer la liste des produits affichés
        cy.get(link + ' .product--horizontal').then(($prd) => {
            for (var i = 0; i < $prd.length; i++) {
                console.log($prd[i], $prd[i].id)
            }

            check_informations('Sweat noir', 28, 28, $prd[0].id, 1);
            check_informations('Sweat jaune', 29, 29, $prd[1].id, 2);
        })
    })
})

describe('Sorting by \'Price -\'', function() {
    it('Check Products after sorting by \'Price -\' in Socks category', function() {
        cy.viewport(1920, 969)
    
        cy.visit('http://localhost:3010/')
  
        // Aller dans la page 'Chaussettes'
        cy.get('[href="/c/mes-produits"]').trigger('mouseover', {force:true})
        cy.get('[href="/c/mes-produits/chaussettes"]').click({force:true})
        cy.wait(1500)

        // Activer le tri
        cy.get('#field-sort-by').select('Prix -', {force:true})
        cy.wait(1500)

        const link = '.content .products-grid';

        // Récupérer la liste des produits affichés
        cy.get(link + ' .product--horizontal').then(($prd) => {
            for (var i = 0; i < $prd.length; i++) {
                console.log($prd[i], $prd[i].id)
            }

            check_informations('Chaussettes noires', 8, 8, $prd[0].id, 1);
            check_informations('Chaussettes bleues', 8, 8, $prd[1].id, 2);
        })
    })
})