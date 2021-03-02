import { reset_filter } from "./utils.js";
import { move_filter } from "./utils.js";
import { check_material_filter } from "./utils.js";
import { check_color_filter } from "./utils.js";

describe ('Check filters', function () {
    it ('Check price, material and color filter', function () {
        cy.visit('');

        // There are variables for functions calls in the script
        const gd = 2;
        const newprice = 20;
        const material = 'Coton';
        const colorid = '#244161';

  
        // Go to 'T-shirt' page
        cy.get('.nav [href="/c/mes-produits"]').trigger('mouseover', {force:true});
        cy.get('.nav [href="/c/mes-produits/t-shirt"]').click({force:true});
        cy.wait(1500);

        move_filter(gd, newprice);
        
        // Check price values
        cy.get('.product__content > .product__aside > .product-price > strong > span').then(($p) => {
            var test = $p;
            var nb;

            for (var i = 0; i < test.length; i++) {
                nb = parseInt(test[i].textContent);
                // If we move left handle or right one, we don't have same price comparator
                if (gd == 1) {    
                    if (nb < newprice) {
                        throw('Le filtre prix ne fonctionne pas');
                    }
                } else if (gd == 2) {
                    if (nb > newprice) {
                        throw('Le filtre prix ne fonctionne pas');
                    }
                }
            }
        })
        reset_filter();

        // Just give as a parameter of this function material of the filter (Go to top of this script to change it)
        check_material_filter(material);
        reset_filter();

        // Just give as a parameter of this function color id (in hexadecimal, ex: #000000) of the filter (Go to top of this script to change it)
        check_color_filter(colorid);
    })
})