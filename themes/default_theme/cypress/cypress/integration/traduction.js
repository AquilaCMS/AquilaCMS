describe ('Check quantity break system', function () {
    it ('Command of 3 products and add another one: A promotion should be triggger if we are an existing customer', function () {
        cy.visit('');

        // This changes the language of the site
        cy.get('#nav-lang button').then(($lg) => {
            console.log($lg);
            for (var i = 0; i < $lg.length; i++) {
                if ($lg[i].innerText == 'EN') {
                    cy.get('#nav-lang li:nth-child(' + (i + 1) + ') > button').click({force:true});
                    break;
                }
            }
        })

        // This check if the site changed his language or not
        cy.get('.nav [href="/en/c/my-products"]').should("contain", "MY PRODUCTS");
        cy.get('.nav [href="/en/gallery"]').should("contain", "GALLERY");
        cy.get('.header [href="/en/login"]').should("contain", "Login");
        cy.get('.header button.hidden-xs').should("contain", "search");
    })
})