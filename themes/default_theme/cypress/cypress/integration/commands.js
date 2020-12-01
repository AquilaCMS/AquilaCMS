function makeid(length) {
    var result           = '';
    var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var charactersLength = characters.length;
    for ( var i = 0; i < length; i++ ) {
       result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
 }

const email = makeid(18) + '@yopmail.com';

describe ('Do a command with a new customer', function () {
    it ('Command of a product as a new customer', function () {
        cy.visit('');

        cy.get('[href="/login"] > span').click({force:true})
  
        // Create an account
        cy.get('.radio-group > .list-radios > li:nth-child(2) > .radio > label').click()
        cy.get('#tab2 #field-name').type('Nom')
        cy.get('#tab2 #field-name-last').type('Prénom')
        cy.get('#tab2 #field-address').type('Adresse')
        cy.get('#tab2 #field-zip').type('06000')
        cy.get('#tab2 #field-city').type('Ville')
        cy.get('#tab2 #field-phone').type('0000000000')
        cy.get('#tab2 #field-country').select('FR')
        cy.get('#tab2 #field-email3').type(email)
        cy.get('#tab2 #field-email-confirm').type(email)
        cy.get('#tab2 #field-password3').type('Test01')
        cy.get('#tab2 #field-password-confirm3').type('Test01')
        cy.get('#tab2 [type="submit"]').click({force:true});
        cy.wait(1500)
  
        // Check if account has been created or not
        try {
            cy.get('[href="/account"]');
        } catch (e) {
            throw ('Account has not been created')
        }
  
        // Do a Command
        // Access to "Socks" page
        cy.get('[href="/c/mes-produits"]').trigger('mouseover', {force:true})
        cy.get('[href="/c/mes-produits/chaussettes"]').click({force:true})
        cy.wait(1500)
   
        // Add socks to cart and continue shopping
        cy.get('#id5d3074d44aa9c1692db0534d .btn span').click({force:true})
        cy.wait(250)
        cy.get('.popup__body > .product-simple > .product__actions > .btn:nth-child(1)').click()
     
        // Add socks to cart and go to cart
        cy.get('#id5d3074d44aa9c1692db0534d .btn span').click({force:true})
        cy.wait(250)
        cy.get('.popup__body [href="/cart"]').click()
        cy.wait(1500)
     
        // /cart
        cy.get('.widget-form [type="submit"]').click()
        cy.wait(1500)
        // /cart/adress
        cy.get('.section__content [type="submit"]').click()
        cy.wait(1500)
        // /cart/delivery -> Select MyShipper
        cy.get('form > .form__body > .delivery-option > .radio > label').click()
        cy.get('.section__content [type="submit"]').click()
        cy.wait(1500)
        // /cart/payment -> Select a way to pay
        cy.get('form > .form__body > .payment-option:nth-child(1) > .radio > label').click()
        cy.get('.section__content > .form-payment > form > .form__actions > .form__btn').click()
        cy.wait(5000)

        // Check command informations
        cy.get('.jsx-3975637264 > .jsx-3975637264 > .jsx-3975637264:nth-child(5) > .jsx-3975637264').should(($p) => {
            expect($p).to.contain('Nom Prénom')
            expect($p).to.contain('Adresse')
            expect($p).to.contain('06000 Ville')
            expect($p).to.contain('FR')
        })

        // Checks if the items are only those ordered
        cy.get('.jsx-3975637264 .table-order > table > tbody').should(($tb) => {
            expect($tb).to.have.length(1)
        })
        cy.get('.jsx-3975637264 .table-order > table > tbody > tr > td:nth-child(1)').should('contain', 'Chaussettes noires')
        cy.get('.jsx-3975637264 .table-order > table > tbody > tr > td:nth-child(2)').should('contain', '2')
    })
})

describe ('Command with existing client but not logged in', function () {
    it ('Do a command of a product as an existing client but not logged in and with an edit of the delivery address', function () {
        cy.visit('');

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
        // Increment the number of sweats from cart
        cy.get('.product__actions .btn-increment').click()
        cy.wait(250)
        cy.get('.widget-form [type="submit"]').click()
        cy.wait(1500)

        // Login
        cy.get('input#email_login.field').type(email)
        cy.get('input#password_login.field').type('Test01')
        cy.get('button.form__btn.btn--red').eq(0).click({force:true})
        cy.wait(1500)

        // Change delivery adress
        cy.get('.addresses > .address:nth-child(1) button').click({force:true})
        cy.get('#form-address #field-name-last').clear().type('Prenom')
        cy.get('#form-address [type="submit"]').click()
        cy.wait(1500)

        // Continue command
        cy.get('.section__content [type="submit"]').click()
        cy.wait(1500)
        // /cart/delivery -> Select MyShipper
        cy.get('form > .form__body > .delivery-option > .radio > label').click()
        cy.get('.section__content [type="submit"]').click()
        cy.wait(1500)
        // /cart/payment -> Select a way to pay
        cy.get('form > .form__body > .payment-option:nth-child(1) > .radio > label').click()
        cy.get('.section__content > .form-payment > form > .form__actions > .form__btn').click()
        cy.wait(5000)

        // Check command informations
        cy.get('.jsx-3975637264 > .jsx-3975637264 > .jsx-3975637264:nth-child(5) > .jsx-3975637264').should(($p) => {
            expect($p).to.contain('Nom Prenom')
            expect($p).to.contain('Adresse')
            expect($p).to.contain('06000 Ville')
            expect($p).to.contain('FR')
        })

        // Checks if the items are only those ordered
        cy.get('.jsx-3975637264 .table-order > table > tbody').should(($tb) => {
            expect($tb).to.have.length(1)
        })
        cy.get('.jsx-3975637264 .table-order > table > tbody > tr > td:nth-child(1)').should('contain', 'Sweat noir')
        cy.get('.jsx-3975637264 .table-order > table > tbody > tr > td:nth-child(2)').should('contain', '3')
    })
})

describe ('Command as an existing client with promo code', function () {
    it ('Command of a product as an existing and connected client with a promotionnal code', function () {
        cy.visit('');

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
        cy.get('.widget-form #field-code').type('suricate')
        cy.get('.widget-form .form__body button').click()
        cy.wait(250)
        cy.get('.widget-form [type="submit"]').click()
        cy.wait(1500)

        // Login
        cy.get('input#email_login.field').type(email)
        cy.get('input#password_login.field').type('Test01')
        cy.get('button.form__btn.btn--red').eq(0).click({force:true})
        cy.wait(1500)

        // Change delivery adress
        cy.get('.addresses > .address:nth-child(1) button').click({force:true})
        cy.get('#form-address #field-name-last').clear().type('Prenom')
        cy.get('#form-address [type="submit"]').click()
        cy.wait(1500)

        // Continue command
        cy.get('.section__content [type="submit"]').click()
        cy.wait(1500)
        // /cart/delivery -> Select MyShipper
        cy.get('form > .form__body > .delivery-option > .radio > label').click()
        cy.get('.section__content [type="submit"]').click()
        cy.wait(1500)
        // /cart/payment -> Select a way to pay
        cy.get('form > .form__body > .payment-option:nth-child(1) > .radio > label').click()
        cy.get('.section__content > .form-payment > form > .form__actions > .form__btn').click()
        cy.wait(5000)

        // Check command informations
        cy.get('.jsx-3975637264 > .jsx-3975637264 > .jsx-3975637264:nth-child(5) > .jsx-3975637264').should(($p) => {
            expect($p).to.contain('Nom Prenom')
            expect($p).to.contain('Adresse')
            expect($p).to.contain('06000 Ville')
            expect($p).to.contain('FR')
        })

        // Checks if the items are only those ordered
        cy.get('.jsx-3975637264 .table-order > table > tbody').should(($tb) => {
            expect($tb).to.have.length(1)
        })
        cy.get('.jsx-3975637264 .table-order > table > tbody > tr > td:nth-child(1)').should('contain', 'T-shirt blanc/vert')
        cy.get('.jsx-3975637264 .table-order > table > tbody > tr > td:nth-child(2)').should('contain', '1')
    })
})