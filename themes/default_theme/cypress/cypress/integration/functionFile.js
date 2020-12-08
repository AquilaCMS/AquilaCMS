/* TO  use them, just add
```
import "./functionFile";
```
in your file

Them to use them, you just need to use the name of the function
*/

Cypress.Commands.add("clickCookieMessage", () => {
    cy.wait(200)
    cy.get('.cookie-message').get('.allow-button').click()
});


Cypress.Commands.add("logIn", (email, mdp) => {
    cy.log('-------------------------------');
    cy.get('[href="/login"]').click({force:true});
    cy.wait(1500)
    cy.get('input#email_login.field').type(email, {force:true});
    cy.get('input#password_login.field').type(mdp, {force:true});
    cy.get('button.form__btn.btn--red').eq(0).click({force:true});
    cy.wait(600);

    cy.get('.ns-toast').should('have.css', 'background-color').then((element) => {
        cy.log(element);
        if(element == 'rgb(201, 44, 44)'){
            return cy.wrap('false');
        }else{
            return cy.wrap('true');
        }
        
    });
});

Cypress.Commands.add("goTo", (href) => {
    cy.get('[href="'+href+'"]').then(value => {
        if(value.lenght > 1){
            value[0].click({force:true});
        }else{
            value.click({force:true});
        }
    });
});

Cypress.Commands.add("goToDirect", (href) => {
    cy.visit(href)
});

Cypress.Commands.add("subToNewsletter", (email) => {
    cy.get('.subscribe').get('#mail').type(email).then( () =>{
        cy.get('.subscribe').get('.subscribe__btn').click();
    });
});

Cypress.Commands.add("changeLang", (lang) => {
    cy.get('.nav-lang > ul > li > button').each( (val) => {
        let innerHTML = val.text();
        //cy.log(innerHTML)
        if(innerHTML == lang){
            val.click();
        }
    });
});

Cypress.Commands.add("SbutoNews", (href) => {
    cy.get('.widget-form')
});

