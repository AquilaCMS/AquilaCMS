describe ('Command  /!\\ Mobile View', function () {
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

        // Go to a category page
        cy.get('[href="/c/mes-produits"]').trigger('mouseover', {force:true});
        cy.get('[href="/c/mes-produits/chaussettes"]').click({force:true});
        cy.wait(1500);

        var i = 0;
        // Check if price is reduced or not
        cy.get('.product--horizontal > .product__content > .product__entry > a > h4').then(($prd) => {
            for (i = 0; i < $prd.length; i++) {
                if ($prd[i].innerText == "Chaussettes noires") {
                    cy.get('.product--horizontal > .product__content > .product__aside > .product-price').should(($pri) => {
                        expect($pri[i]).to.contain("8.00€");
                        expect($pri[i]).to.contain("5.00€");
                    })
                    break;
                }
            }
        })

        cy.get('#id5d3074d44aa9c1692db0534d [class="ico-shopping-cart-white"]').click({force:true});
        cy.get('[href="/cart"]').click({force:true});
        cy.wait(1500);

        cy.get('.products__body').should(($tb) => {
            expect($tb).to.have.length(1);
        })

        cy.get('.products__body .product-price').should(($prd) => {
            expect($prd[0]).to.contain("8.00€");
            expect($prd[1]).to.contain("5.00€");
        })
    })
})