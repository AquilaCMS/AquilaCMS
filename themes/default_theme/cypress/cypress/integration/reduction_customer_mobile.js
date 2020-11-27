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
            console.log($prd)
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
    })
})