describe ('Commande Nouveau Client', function () {
    it ('Commande d\'un produit en tant que nouveau client', function () {
        cy.viewport(1920, 969)
    
        cy.visit('http://localhost:3010/')
     
        cy.get('[href="/login"] > span').click({force:true})
  
        // Créer un compte
        cy.get('.radio-group > .list-radios > li:nth-child(2) > .radio > label').click()
        cy.get('#tab2 #field-name').type('Nom')
        cy.get('#tab2 #field-name-last').type('Prénom')
        cy.get('#tab2 #field-address').type('Adresse')
        cy.get('#tab2 #field-zip').type('06000')
        cy.get('#tab2 #field-city').type('Ville')
        cy.get('#tab2 #field-phone').type('0000000000')
        cy.get('#tab2 #field-country').select('FR')
        cy.get('#tab2 #field-email3').type('test@test.com')
        cy.get('#tab2 #field-email-confirm').type('test@test.com')
        cy.get('#tab2 #field-password3').type('Test01')
        cy.get('#tab2 #field-password-confirm3').type('Test01')
        cy.get('#tab2 [type="submit"]').click({force:true});
        cy.wait(1500)
  
        // Check if account has been created or not
        cy.get('[href="/account"]');
  
        // Do a Command
        cy.get('[href="/c/mes-produits"]').trigger('mouseover', {force:true})
        cy.get('[href="/c/mes-produits/chaussettes"]').click({force:true})
        cy.wait(1500)
   
        cy.get('#id5d3074d44aa9c1692db0534d .btn span').click({force:true})
        cy.wait(250)
        cy.get('.popup__body > .product-simple > .product__actions > .btn:nth-child(1)').click()
     
        cy.get('#id5d3074d44aa9c1692db0534d .btn span').click({force:true})
        cy.wait(250)
        cy.get('.popup__body [href="/cart"]').click()
        cy.wait(1500)
     
        cy.get('.widget-form [type="submit"]').click()
        cy.wait(1500)
        cy.get('.section__content [type="submit"]').click()
        cy.wait(1500)
        cy.get('form > .form__body > .delivery-option > .radio > label').click()
        cy.get('.section__content [type="submit"]').click()
        cy.wait(1500)
        cy.get('form > .form__body > .payment-option:nth-child(2) > .radio > label').click()
        cy.get('.section__content > .form-payment > form > .form__actions > .form__btn').click()
        cy.wait(5000)

        // Check informations
        cy.get('.jsx-3975637264 > .jsx-3975637264 > .jsx-3975637264:nth-child(5) > .jsx-3975637264').should(($p) => {
            expect($p).to.contain('Nom Prénom')
            expect($p).to.contain('Adresse')
            expect($p).to.contain('06000 Ville')
            expect($p).to.contain('FR')
        })

        cy.get('.jsx-3975637264 .table-order > table > tbody').should(($tb) => {
            expect($tb).to.have.length(1)
        })
        cy.get('.jsx-3975637264 .table-order > table > tbody > tr > td:nth-child(1)').should('contain', 'Chaussettes noires')
        cy.get('.jsx-3975637264 .table-order > table > tbody > tr > td:nth-child(2)').should('contain', '2')
    })
})

describe ('Commande Client Existant Non Connecté', function () {
    it ('Commande d\'un produit en tant que client existant non connecté avec changement d\'adresse de livraison', function () {
        cy.viewport(1920, 969)
    
        cy.visit('http://localhost:3010/')
  
        // Do a Command
        // Go to a category page
        cy.get('[href="/c/mes-produits"]').trigger('mouseover', {force:true})
        cy.get('[href="/c/mes-produits/sweat"]').click({force:true})
        cy.wait(1500)

        // Add a sweat to cart
        cy.get('#id5d3079de4aa9c1692db0549d .btn-increment').click({force:true})
        cy.get('#id5d3079de4aa9c1692db0549d .btn span').click({force:true})
        cy.wait(250)
        cy.get('.popup__body [href="/cart"]').click()
        cy.wait(1500)
        cy.get('.product__actions .btn-increment').click()
        cy.wait(250)
        cy.get('.widget-form [type="submit"]').click()
        cy.wait(1500)

        // Login
        cy.get('input#email_login.field').type('test@test.com')
        cy.get('input#password_login.field').type('Test01')
        cy.get('button.form__btn.btn--red').eq(0).click({force:true})
        cy.wait(1500)

        // Change delivery adress
        cy.get('.addresses > .address:nth-child(1) button').click({force:true})
        cy.get('#form-address #field-name-last').clear().type('Prenom')
        cy.get('#form-address [type="submit"]').click()

        // Continue command
        cy.get('.section__content [type="submit"]').click()
        cy.wait(1500)
        cy.get('form > .form__body > .delivery-option > .radio > label').click()
        cy.get('.section__content [type="submit"]').click()
        cy.wait(1500)
        cy.get('form > .form__body > .payment-option:nth-child(2) > .radio > label').click()
        cy.get('.section__content > .form-payment > form > .form__actions > .form__btn').click()
        cy.wait(5000)

        // Check informations
        cy.get('.jsx-3975637264 > .jsx-3975637264 > .jsx-3975637264:nth-child(5) > .jsx-3975637264').should(($p) => {
            expect($p).to.contain('Nom Prenom')
            expect($p).to.contain('Adresse')
            expect($p).to.contain('06000 Ville')
            expect($p).to.contain('FR')
        })

        cy.get('.jsx-3975637264 .table-order > table > tbody').should(($tb) => {
            expect($tb).to.have.length(1)
        })
        cy.get('.jsx-3975637264 .table-order > table > tbody > tr > td:nth-child(1)').should('contain', 'Sweat noir')
        cy.get('.jsx-3975637264 .table-order > table > tbody > tr > td:nth-child(2)').should('contain', '3')
    })
})

describe ('Commande Client Existant Identifié avec Code Promo', function () {
    it ('Commande d\'un produit en en tant que client connecté avec un code promotionnel', function () {
        cy.viewport(1920, 969)
    
        cy.visit('http://localhost:3010/')
  
        // Do a Command
        // Go to a category page
        cy.get('[href="/c/mes-produits"]').trigger('mouseover', {force:true})
        cy.get('[href="/c/mes-produits/t-shirt"]').click({force:true})
        cy.wait(1500)

        // Add a sweat to cart
        cy.get('#id5c667ff128a49c049c5863c9 .btn span').click({force:true})
        cy.wait(250)
        cy.get('.popup__body [href="/cart"]').click()
        cy.wait(1500)
        
        // Add promo code
        cy.get('.widget-form #field-code').type('ayaya')
        cy.get('.widget-form .form__body button').click()
        cy.wait(250)
        cy.get('.widget-form [type="submit"]').click()
        cy.wait(1500)

        // Login
        cy.get('input#email_login.field').type('test@test.com')
        cy.get('input#password_login.field').type('Test01')
        cy.get('button.form__btn.btn--red').eq(0).click({force:true})
        cy.wait(1500)

        // Change delivery adress
        cy.get('.addresses > .address:nth-child(1) button').click({force:true})
        cy.get('#form-address #field-name-last').clear().type('Prenom')
        cy.get('#form-address [type="submit"]').click()

        // Continue command
        cy.get('.section__content [type="submit"]').click()
        cy.wait(1500)
        cy.get('form > .form__body > .delivery-option > .radio > label').click()
        cy.get('.section__content [type="submit"]').click()
        cy.wait(1500)
        cy.get('form > .form__body > .payment-option:nth-child(2) > .radio > label').click()
        cy.get('.section__content > .form-payment > form > .form__actions > .form__btn').click()
        cy.wait(5000)

        // Check informations
        cy.get('.jsx-3975637264 > .jsx-3975637264 > .jsx-3975637264:nth-child(5) > .jsx-3975637264').should(($p) => {
            expect($p).to.contain('Nom Prenom')
            expect($p).to.contain('Adresse')
            expect($p).to.contain('06000 Ville')
            expect($p).to.contain('FR')
        })

        cy.get('.jsx-3975637264 .table-order > table > tbody').should(($tb) => {
            expect($tb).to.have.length(1)
        })
        cy.get('.jsx-3975637264 .table-order > table > tbody > tr > td:nth-child(1)').should('contain', 'T-shirt blanc/vert')
        cy.get('.jsx-3975637264 .table-order > table > tbody > tr > td:nth-child(2)').should('contain', '1')
    })
})