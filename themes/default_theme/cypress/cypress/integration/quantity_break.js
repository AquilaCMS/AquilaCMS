describe ('Check quantity break system /!\\ Mobile View', function () {
    it ('Command of 3 products and add another one: A promotion should be triggger if we are an existing customer', function () {
        cy.visit('');
        cy.viewport(480, 720);

        // Login
        cy.get('[href="/login"]').click({force:true});
        cy.wait(1500)
        cy.get('input#email_login.field').type('012test210@yopmail.com', {force:true});
        cy.get('input#password_login.field').type('Test01', {force:true});
        cy.get('button.form__btn.btn--red').eq(0).click({force:true});
        cy.wait(1500);

        // Do a Command
        // Go to a category page
        cy.get('[href="/c/mes-produits"]').trigger('mouseover', {force:true});
        cy.get('[href="/c/mes-produits/sweat"]').click({force:true});
        cy.wait(1500);

        // Add a sweat to cart
        cy.get('#id5d3079de4aa9c1692db0549d .btn span').click({force:true});
        cy.wait(250);
        cy.get('.popup__body [href="/cart"]').click();
        cy.wait(1500);
        
        // Increment the number of sweats from cart
        for (var i = 0;  i < 3; i++) {
            cy.get('.product__actions .btn-increment').click({force:true});
            cy.wait(500)
        }
        // Check prices with qty break system
        cy.get('.product__actions').should(($pri) => {
            expect($pri[0].children[1].innerText).to.contain("28.00€");
            expect($pri[0].children[1].innerText).to.contain("23.00€");
            expect($pri[0].children[2].innerText).to.contain("112.00€");
            expect($pri[0].children[2].innerText).to.contain("92.00€");
        })

        cy.get('.widget-form [type="submit"]').click();
        cy.wait(1500);

        // Change delivery adress
        cy.get('.addresses > .address:nth-child(1) button').click({force:true});
        cy.get('#form-address #field-name-last').clear({force:true}).type('Prenom');
        cy.get('#form-address [type="submit"]').click();
        cy.wait(1500);

        // Continue command
        cy.get('.section__content [type="submit"]').click();
        cy.wait(1500);
        // /cart/delivery -> Select MyShipper
        cy.get('form > .form__body > .delivery-option > .radio > label').click();
        cy.get('.section__content [type="submit"]').click();
        cy.wait(1500);
        // /cart/payment -> Select a way to pay
        cy.get('form > .form__body > .payment-option:nth-child(1) > .radio > label').click();
        cy.get('.section__content > .form-payment > form > .form__actions > .form__btn').click();
        cy.wait(5000);

        // Check command informations
        cy.get('.jsx-3975637264 > .jsx-3975637264 > .jsx-3975637264:nth-child(5) > .jsx-3975637264').should(($p) => {
            expect($p).to.contain('Nom Prenom');
            expect($p).to.contain('Adresse');
            expect($p).to.contain('06000 Ville');
            expect($p).to.contain('FR');
        })

        // Checks if the items are only those ordered
        cy.get('.jsx-3975637264 .table-order > table > tbody').should(($tb) => {
            expect($tb).to.have.length(1);
        })
        cy.get('.jsx-3975637264 .table-order > table > tbody > tr > td:nth-child(1)').should('contain', 'Sweat noir');
        cy.get('.jsx-3975637264 .table-order > table > tbody > tr > td:nth-child(2)').should('contain', '4');
    })
})