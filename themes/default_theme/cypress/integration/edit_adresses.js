describe('Edit addresses', function () {
    it('Edit delivery and facturation address', function () {
        cy.visit('');

        // Log in
        cy.get('[href="/login"').click({ force: true });
        cy.wait(1000);
        cy.get('input#email_login').clear().type('012test210@yopmail.com');
        cy.get('input#password_login').clear().type('Test01');
        cy.get('#tab1 [type="submit"]').click({ force: true });
        cy.wait(1000);

        // Go to addresses page
        cy.get('[href="/account/addresses"]').click({ force: true });
        cy.wait(1000);

        // Add another delivery address
        cy.get('.section__content > .form > form > div > .btn').click({ force: true });
        cy.wait(1000);
        // Complete fields for new address
        cy.get('input[type="checkbox"]#field-delivery-address').check({ force: true });
        cy.get('input[type="radio"]#field-monsieur').check({ force: true });
        cy.get('#form-address #field-name').type('Nom');
        cy.get('#form-address #field-name-last').type('Prenom');
        cy.get('#form-address #field-address-shiping').type('NewAddress');
        cy.get('#form-address #field-zip').type('11111');
        cy.get('#form-address #field-city').type('NewCity');
        cy.get('#form-address #field-country').select('GB');
        cy.get('#form-address #field-phone').type('1111111111');
        cy.get('#form-address .btn[type="submit"]').click({ force: true });

        // Check if delivery address is the new address
        cy.get('.section__content .addresses .address').then(($add) => {
            let i;
            for (i = 0; i < $add.length; i++) {
                if ($add[i].innerHTML.slice($add[i].innerHTML.search('<h3>') + 4, $add[i].innerHTML.search('</h3>')) == 'Adresse de livraison') {
                    break;
                }
            }
            cy.get(`.section__content .addresses .address:nth-child(${i + 1}) p`).should(($tmp) => {
                expect($tmp[0]).to.contain('Prenom Nom');
                expect($tmp[1]).to.contain('NewAddress');
                expect($tmp[3]).to.contain('11111 NewCity GB');
            });
        });

        // Change delivery address for the old address
        cy.get('.section__content .addresses .address').then(($add) => {
            let i;
            for (i = 0; i < $add.length; i++) {
                if ($add[i].innerHTML.slice($add[i].innerHTML.search('<h3>') + 4, $add[i].innerHTML.search('</h3>')) == 'Adresse') {
                    if ($add[i].children[4].innerText == '06000 Ville FR' && $add[i].outerHTML.search('hidden') == -1) {
                        cy.get(`.section__content .addresses .address:nth-child(${i + 1}) > div > p > span:nth-child(3)`).click({ force: true });
                    }
                }
            }
        });

        // Check if delivery address is the old address
        cy.get('.section__content .addresses .address').then(($add) => {
            let i;
            for (i = 0; i < $add.length; i++) {
                if ($add[i].innerHTML.slice($add[i].innerHTML.search('<h3>') + 4, $add[i].innerHTML.search('</h3>')) == 'Adresse de livraison') {
                    break;
                }
            }
            cy.get(`.section__content .addresses .address:nth-child(${i + 1}) p`).should(($tmp) => {
                expect($tmp[0]).to.contain('Prénom Nom');
                expect($tmp[1]).to.contain('Adresse');
                expect($tmp[3]).to.contain('06000 Ville FR');
            });
        });

        try {
            // Delete new address
            cy.get('.section__content .addresses .address').then(($add) => {
                console.log($add);
                let i;
                for (i = 0; i < $add.length; i++) {
                    if ($add[i].innerHTML.slice($add[i].innerHTML.search('<h3>') + 4, $add[i].innerHTML.search('</h3>')) == 'Adresse') {
                        if ($add[i].children[4].innerText == '11111 NewCity GB' && $add[i].outerHTML.search('hidden') == -1) {
                            cy.get(`.section__content .addresses .address:nth-child(${i + 1}) > div > div > .btn:nth-child(2)`).click({ force: true });
                        }
                    }
                }
            });
        } catch (e) { console.log(e); }
    });
});
