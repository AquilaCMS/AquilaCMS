/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const {Shortcodes} = require('../orm/models');

/*
 * Get shortcodes
 */
exports.getShortcodes = async function () {
    return Shortcodes.find({}).lean();
};

/*
 * Instantiates the collection when the server is started
 */
exports.initDBValues = async () => {
    const shortcodes = [
        {
            weight      : 6,
            tag         : 'ns-accordion',
            translation : {
                fr : {
                    description : 'Accordéon permet de définir des blocks qui s\'ouvrent et se ferment en cliquant dessus.',
                    name        : 'Accordéon',
                    properties  : [
                        {
                            props       : 'container',
                            description : 'Classe du contenant de l\'accordéon',
                            type        : 'text'
                        },
                        {
                            props       : 'section',
                            description : 'Classe des différentes sections',
                            type        : 'text'
                        },
                        {
                            props       : 'head',
                            description : 'Classe de l\'en-tête cliquable pour ouvrir une section',
                            type        : 'text'
                        },
                        {
                            props       : 'classexpand',
                            description : 'Classe utilisée pour dérouler le corps de la section',
                            type        : 'text'
                        },
                        {
                            props       : 'autoclose',
                            description : 'Si à "1" = ferme automatiquement les autres corps de section lorsqu\'un est ouvert ("0" par défaut)',
                            type        : 'list',
                            attributs   : [
                                {
                                    description : 'Ferme automatiquement',
                                    value       : '1'
                                }, {
                                    description : 'Laisse les autres ouvert',
                                    value       : '0'
                                }
                            ]
                        },
                        {
                            props       : 'body',
                            description : 'Classe du corps de la section',
                            type        : 'text'
                        }
                    ]
                },
                en : {
                    description : 'Accordion allows you to define blocks that open and close by clicking on them.',
                    name        : 'Accordion',
                    properties  : [
                        {
                            props       : 'container',
                            description : 'Accordion container class',
                            type        : 'text'
                        },
                        {
                            props       : 'section',
                            description : 'Class of different sections',
                            type        : 'text'
                        },
                        {
                            props       : 'head',
                            description : 'Clickable header class to open section',
                            type        : 'text'
                        },
                        {
                            props       : 'classexpand',
                            description : 'Class used to expand the body of the section',
                            type        : 'text'
                        },
                        {
                            props       : 'autoclose',
                            description : 'If at "1" = automatically closes the other section bodies when one is opened ("0" by default)',
                            type        : 'list',
                            attributs   : [
                                {
                                    description : 'Automatically closes',
                                    value       : '1'
                                }, {
                                    description : 'Leave the others open',
                                    value       : '0'
                                }
                            ]
                        },
                        {
                            props       : 'body',
                            description : 'Section body class',
                            type        : 'text'
                        }
                    ]
                }
            }
        },
        {
            weight      : 10,
            tag         : 'ns-block-slider',
            translation : {
                fr : {
                    description : 'Affiche un carrousel de Blocks-cms',
                    name        : 'Carrousel de Block-CMS',
                    properties  : [
                        {
                            props       : 'ns-code',
                            description : 'Liste des code de Block-CMS à utiliser, séparé par des virgules',
                            type        : 'text'
                        },
                        {
                            props       : 'autoplay',
                            description : 'Défile automatiquement le carrousel',
                            type        : 'list',
                            attributs   : [
                                {
                                    description : 'Défile automatiquement',
                                    value       : 'autoplay'
                                }, {
                                    description : 'Ne défile pas automatiquement',
                                    value       : 'none'
                                }
                            ]
                        },
                        {
                            props       : 'arrows',
                            description : 'Affiche des fleches de défilement',
                            type        : 'list',
                            attributs   : [
                                {
                                    description : 'Affiche les flèches',
                                    value       : 'true'
                                }, {
                                    description : 'N\'affiche pas les flèches',
                                    value       : 'false'
                                }
                            ]
                        },
                        {
                            props       : 'adaptiveHeight',
                            description : 'Ajuster automatiquement la hauteur du carrousel aux blockcms',
                            type        : 'text'
                        },
                        {
                            props       : 'dots',
                            description : 'Affichage des points de défilement',
                            type        : 'list',
                            attributs   : [
                                {
                                    description : 'Affiche les points',
                                    value       : 'true'
                                }, {
                                    description : 'N\'affiche pas les points',
                                    value       : 'false'
                                }
                            ]
                        },
                        {
                            props       : 'draggable',
                            description : 'Activer le défilement par cliquer-glisser',
                            type        : 'text'
                        }
                    ]
                },
                en : {
                    description : 'Create a carousel of cms blocks',
                    name        : 'Block Slider',
                    properties  : [
                        {
                            props       : 'ns-code',
                            description : 'List of Block-CMS codes to use, separated by commas',
                            type        : 'text'
                        },
                        {
                            props       : 'autoplay',
                            description : 'Automatically goes to the next CMS-Block',
                            type        : 'text'
                        },
                        {
                            props       : 'arrows',
                            description : 'Display or not the scrolling arrows',
                            type        : 'text'
                        },
                        {
                            props       : 'adaptiveHeight',
                            description : 'Automatically adjust carousel height to blockcms',
                            type        : 'text'
                        },
                        {
                            props       : 'dots',
                            description : 'Display of scroll points',
                            type        : 'text'
                        },
                        {
                            props       : 'draggable',
                            description : 'Enable click-drag scrolling',
                            type        : 'text'
                        }
                    ]
                }
            }
        },
        {
            weight      : 4,
            tag         : 'ns-blog-articles',
            translation : {
                fr : {
                    description : 'Affiche le listing des articles / posts du blog',
                    name        : 'Listing d\'articles du blog'
                },
                en : {
                    description : 'Displays the list of posts',
                    name        : 'Listing of articles'
                }
            }
        },
        {
            weight      : 30,
            tag         : 'ns-breadcrumb',
            translation : {
                fr : {
                    description : 'Affiche un fil d\'ariane sur le site (aide à la navigation)',
                    name        : 'Breadcrumb (fil d\'ariane)'
                },
                en : {
                    description : 'Display a breadcrumb',
                    name        : 'Breadcrumb'
                }
            }
        },
        {
            weight      : 2,
            tag         : 'ns-btn-login',
            translation : {
                fr : {
                    description : 'Affichage du bouton de Login / Mon Compte',
                    name        : 'Bouton'
                },
                en : {
                    description : 'Display of the Login / My Account button',
                    name        : 'Button'
                }
            }
        },
        {
            weight      : 26,
            tag         : 'ns-cart-count',
            translation : {
                fr : {
                    description : 'Affiche une image \'panier\' avec le nombre de produit affiché',
                    name        : 'Panier (avec compteur)'
                },
                en : {
                    description : 'Displays a \'cart\' logo with the number of products displayed',
                    name        : 'Cart count'
                }
            }
        },
        {
            weight      : 80,
            tag         : 'ns-cms',
            translation : {
                fr : {
                    description : 'Affiche un block-cms',
                    name        : 'Block-CMS',
                    properties  : [
                        {
                            props       : 'ns-code',
                            description : 'Code du Block-CMS',
                            type        : 'text'
                        },
                        {
                            props       : 'content',
                            description : 'Donnée (object) retourné par la route du blockcms',
                            type        : 'text'
                        },
                        {
                            props       : 'hide_error',
                            description : 'Affiche un message d\'erreur si le block-cms n\'existe pas',
                            type        : 'text'
                        }
                    ]
                },
                en : {
                    description : 'Display a block-cms',
                    name        : 'CMS-Block',
                    properties  : [
                        {
                            props       : 'ns-code',
                            description : 'Code of the CMS-Block',
                            type        : 'text'
                        },
                        {
                            props       : 'hide_error',
                            description : 'Display an error message if the CMS-Block does not exist',
                            type        : 'text'
                        }
                    ]
                }
            }
        },
        {

            weight      : 24,
            tag         : 'ns-contact',
            translation : {
                fr : {
                    description : 'Affiche le bouton de validation d\'un formulaire de contact (form)',
                    name        : 'Validateur de formulaire',
                    properties  : [
                        {
                            props       : 'button-title',
                            description : 'Texte du bouton de validation',
                            type        : 'text'
                        },
                        {
                            props       : 'classdiv',
                            description : 'Classe du div conteneur',
                            type        : 'text'
                        },
                        {
                            props       : 'classinput',
                            description : 'Classe du bouton',
                            type        : 'text'
                        },
                        {
                            props       : 'mode',
                            description : 'Mode d\'envoi ("send" / "store+send" / "store")',
                            type        : 'list',
                            attributs   : [
                                {
                                    description : 'Envoi un email',
                                    value       : 'send'
                                }, {
                                    description : 'Enregistre en base',
                                    value       : 'store'
                                }, {
                                    description : 'Enregistre en base et envoi un email',
                                    value       : 'store+send'
                                }
                            ]
                        }
                    ]
                },
                en : {
                    description : 'Displays the validation button of a contact form (form)',
                    name        : 'Form Validator',
                    properties  : [
                        {
                            props       : 'button-title',
                            description : 'Text of the validation button',
                            type        : 'text'
                        },
                        {
                            props       : 'classdiv',
                            description : 'Class of the container div',
                            type        : 'text'
                        },
                        {
                            props       : 'classinput',
                            description : 'Button class',
                            type        : 'text'
                        },
                        {
                            props       : 'mode',
                            description : 'Send mode ("send" / "store + send" / "store")',
                            type        : 'list',
                            attributs   : [
                                {
                                    description : 'Send an email',
                                    value       : 'send'
                                }, {
                                    description : 'Save to base',
                                    value       : 'store'
                                }, {
                                    description : 'Register in database and send an email',
                                    value       : 'store+send'
                                }
                            ]
                        }
                    ]
                }
            }
        },
        {
            weight      : 36,
            tag         : 'ns-product-card-list',
            translation : {
                fr : {
                    description : 'Affiche une liste de vignette produit',
                    name        : 'Liste de vignettes produits',
                    properties  : [
                        {
                            props       : 'value',
                            description : 'Liste des valeurs séparé par des virgules',
                            type        : 'text'
                        },
                        {
                            props       : 'type',
                            description : 'Type de valeur à saisir dans \'value\'',
                            type        : 'list',
                            attributs   : [
                                {
                                    description : 'id d\'un produit',
                                    value       : 'product_id'
                                }, {
                                    description : 'Code d\'un produit',
                                    value       : 'product_code'
                                }, {
                                    description : 'Code d\'une catégorie',
                                    value       : 'category'
                                }, {
                                    description : 'Liste d\'id de produits',
                                    value       : 'list_id'
                                }, {
                                    description : 'Liste de code produit',
                                    value       : 'list_code'
                                }, {
                                    description : 'Produits nouveaux (aucune "value" necessaire)',
                                    value       : 'new'
                                }, {
                                    description : 'Tableau d\'objets produits',
                                    value       : 'data'
                                }
                            ]
                        },
                        {
                            props       : 'itemsperslides',
                            description : 'Nombre de produit affiché',
                            type        : 'text'
                        }
                    ]
                },
                en : {
                    description : 'Listing of thumbnails products',
                    name        : 'List of product labels',
                    properties  : [
                        {
                            props       : 'value',
                            description : 'List of values ​​separated by commas',
                            type        : 'text'
                        },
                        {
                            props       : 'type',
                            description : 'Type of value to enter in \'value\'',
                            type        : 'list',
                            attributs   : [
                                {
                                    description : 'Product id',
                                    value       : 'product_id'
                                }, {
                                    description : 'Product code',
                                    value       : 'product_code'
                                }, {
                                    description : 'Category code',
                                    value       : 'category'
                                }, {
                                    description : 'Product id List',
                                    value       : 'list_id'
                                }, {
                                    description : 'Product code list',
                                    value       : 'list_code'
                                }, {
                                    description : 'New products (no "value" required)',
                                    value       : 'new'
                                }, {
                                    description : 'Objects array product',
                                    value       : 'data'
                                }
                            ]
                        },
                        {
                            props       : 'itemsperslides',
                            description : 'Number of products displayed',
                            type        : 'text'
                        }
                    ]
                }
            }
        }, {
            weight      : 80,
            tag         : 'ns-gallery',
            translation : {
                fr : {
                    description : 'Affiche une liste d\'images définie dans "gallerie"',
                    name        : 'Gallerie',
                    properties  : [
                        {
                            props       : 'ns-code',
                            description : 'Code de la gallerie',
                            type        : 'text'
                        }
                    ]
                },
                en : {
                    description : 'Display a list of images defined in "gallery"',
                    name        : 'Gallery',
                    properties  : [
                        {
                            props       : 'ns-code',
                            description : 'Code of the gallery',
                            type        : 'text'
                        }
                    ]
                }
            }
        }, {
            weight      : 20,
            tag         : 'ns-top-button',
            translation : {
                fr : {
                    description : 'Affiche un petit bouton pour rediriger vers le haut de la page',
                    name        : 'Top Button'
                },
                en : {
                    description : 'Displays a small button to redirect to the top of the page',
                    name        : 'Top Button'
                }
            }
        }, {
            weight      : 22,
            tag         : 'ns-lang',
            translation : {
                fr : {
                    description : 'Affiche un système de choix de langue',
                    name        : 'Langue'
                },
                en : {
                    description : 'Displays a language selection system',
                    name        : 'Langue'
                }
            }
        },
        {
            weight      : 12,
            tag         : 'ns-login',
            translation : {
                fr : {
                    description : 'Affiche un systeme complet d\'identification',
                    name        : 'Identification'
                },
                en : {
                    description : 'Displays a complete identification system',
                    name        : 'Login'
                }
            }
        }, {
            weight      : 32,
            tag         : 'ns-newsletter',
            translation : {
                fr : {
                    description : 'Affiche une zone d\'inscription à la newsletter',
                    name        : 'newsletter',
                    properties  : [
                        {
                            props       : 'button',
                            description : ' Texte à afficher du bouton',
                            type        : 'text'
                        },
                        {
                            props       : 'placeholder',
                            description : 'Texte à afficher dans la zone de saisie',
                            type        : 'text'
                        }
                    ]
                },
                en : {
                    description : 'Displays a newsletter sign-up area',
                    name        : 'newsletter',
                    properties  : [
                        {
                            props       : 'button',
                            description : 'Text to display for the button',
                            type        : 'text'
                        },
                        {
                            props       : 'placeholder',
                            description : 'Text to display in the input',
                            type        : 'text'
                        }
                    ]
                }
            }
        }, {

            weight      : 34,
            tag         : 'ns-menu',
            translation : {
                fr : {
                    description : 'Affiche un menu simple',
                    name        : 'Menu1',
                    properties  : [
                        {
                            props       : 'ns-code',
                            description : 'ns-code : Code de la catégorie parent',
                            type        : 'text'
                        },
                        {
                            props       : 'classnav',
                            description : 'Classe CSS balise <nav>',
                            type        : 'text'
                        },
                        {
                            props       : 'classnavul',
                            description : 'Classe CSS balise <ul>',
                            type        : 'text'
                        },
                        {
                            props       : 'classnavulli',
                            description : 'Classe CSS balise <li>',
                            type        : 'text'
                        },
                        {
                            props       : 'classnavulliactive',
                            description : 'Classe CSS balise <li> active',
                            type        : 'text'
                        },
                        {
                            props       : 'classnavullia',
                            description : 'Classe CSS balise <a>',
                            type        : 'text'
                        },
                        {
                            props       : 'classnavulliaactive',
                            description : 'Classe CSS balise <a> active',
                            type        : 'text'
                        },
                        {
                            props       : 'classbtnmobile',
                            description : 'Classe CSS du burger en mobile',
                            type        : 'text'
                        },
                        {
                            props       : 'classbtnactivemobile',
                            description : 'Classe CSS du burger actif en mobile',
                            type        : 'text'
                        },
                        {
                            props       : 'classnavactivemobile',
                            description : 'Classe CSS du balise <nav> active en mobile',
                            type        : 'text'
                        },
                        {
                            props       : 'levelmax',
                            description : 'Niveau max de récursivité du menu',
                            type        : 'text'
                        },
                        {
                            props       : 'css',
                            description : 'CSS par défaut ("0" = non)',
                            type        : 'text'
                        }
                    ]
                },
                en : {
                    description : 'Displays a simple menu',
                    name        : 'Menu1',
                    properties  : [
                        {
                            props       : 'ns-code',
                            description : 'ns-code : Parent category code',
                            type        : 'text'
                        },
                        {
                            props       : 'classnav',
                            description : 'CSS class <nav> tag',
                            type        : 'text'
                        },
                        {
                            props       : 'classnavul',
                            description : 'CSS class <ul> tag',
                            type        : 'text'
                        },
                        {
                            props       : 'classnavulli',
                            description : 'CSS class <li> tag',
                            type        : 'text'
                        },
                        {
                            props       : 'classnavulliactive',
                            description : 'CSS class active <li> tag',
                            type        : 'text'
                        },
                        {
                            props       : 'classnavullia',
                            description : 'CSS class <a> tag',
                            type        : 'text'
                        },
                        {
                            props       : 'classnavulliaactive',
                            description : 'CSS class active <a> tag',
                            type        : 'text'
                        },
                        {
                            props       : 'classbtnmobile',
                            description : 'CSS class of the burger on mobile',
                            type        : 'text'
                        },
                        {
                            props       : 'classbtnactivemobile',
                            description : 'CSS class of the burger active in mobile',
                            type        : 'text'
                        },
                        {
                            props       : 'classnavactivemobile',
                            description : 'CSS class of the <nav> tag active in mobile',
                            type        : 'text'
                        },
                        {
                            props       : 'levelmax',
                            description : 'Maximum menu recursion level',
                            type        : 'text'
                        },
                        {
                            props       : 'css',
                            description : 'Default CSS ("0" = no)',
                            type        : 'text'
                        }
                    ]
                }
            }
        }, {
            weight      : 8,
            tag         : 'ns-productcard',
            translation : {
                fr : {
                    description : 'Affiche la vignette d\'un produit',
                    name        : 'Vignette produit',
                    properties  : [
                        {
                            props       : 'value',
                            description : 'Valeur du type choisi',
                            type        : 'text'
                        },
                        {
                            props       : 'includeCss',
                            description : 'Inclusion de la balise css (1 seule fois)',
                            type        : 'list',
                            attributs   : [
                                {
                                    description : 'Inclu la balise de style du css',
                                    value       : 'true'
                                },
                                {
                                    description : 'N\'inclu pas la balise de style',
                                    value       : 'false'
                                }
                            ]
                        },
                        {
                            props       : 'gridDisplay',
                            description : 'Mode d\'affichage',
                            type        : 'list',
                            attributs   : [
                                {
                                    description : 'Rendu en grille',
                                    value       : 'true'
                                },
                                {
                                    description : 'Rendu en liste',
                                    value       : 'false'
                                }
                            ]
                        },
                        {
                            props       : 'col',
                            description : 'Largeur (valeur de 1 à 12)',
                            type        : 'text'
                        },
                        {
                            props       : 'type',
                            description : 'Type de valeur à saisir',
                            type        : 'list',
                            attributs   : [
                                {
                                    description : 'Id du produit',
                                    value       : 'id'
                                },
                                {
                                    description : 'Code du produit',
                                    value       : 'code'
                                },
                                {
                                    description : 'Donnée brut du produit sous forme de JSON',
                                    value       : 'data'
                                }
                            ]
                        }
                    ]
                },
                en : {
                    description : 'Displays a product thumbnail',
                    name        : 'Thumbnail product',
                    properties  : [
                        {
                            props       : 'value',
                            description : 'Value of the chosen type',
                            type        : 'text'
                        },
                        {
                            props       : 'includeCss',
                            description : 'Inclusion of the css tag (1 time only)',
                            type        : 'list',
                            attributs   : [
                                {
                                    description : 'Include the css style tag',
                                    value       : 'true'
                                },
                                {
                                    description : 'Does not include the style tag',
                                    value       : 'false'
                                }
                            ]
                        },
                        {
                            props       : 'gridDisplay',
                            description : 'Display mode',
                            type        : 'list',
                            attributs   : [
                                {
                                    description : 'Grid rendering',
                                    value       : 'true'
                                },
                                {
                                    description : 'List rendering',
                                    value       : 'false'
                                }
                            ]
                        },
                        {
                            props       : 'col',
                            description : 'Width (value from 1 to 12)',
                            type        : 'text'
                        },
                        {
                            props       : 'type',
                            description : 'Type of value to enter',
                            type        : 'list',
                            attributs   : [
                                {
                                    description : 'Product id',
                                    value       : 'id'
                                },
                                {
                                    description : 'Product code',
                                    value       : 'code'
                                },
                                {
                                    description : 'Raw product data in JSON form',
                                    value       : 'data'
                                }
                            ]
                        }
                    ]
                }
            }
        }, {
            weight      : 28,
            tag         : 'ns-search',
            translation : {
                fr : {
                    description : 'Zone de recherche',
                    name        : 'Recherche',
                    properties  : [
                        {
                            props       : 'placeholder',
                            description : 'Texte affiché dans la zone de saisie',
                            type        : 'text'
                        }
                    ]
                },
                en : {
                    description : 'Search area',
                    name        : 'Search',
                    properties  : [
                        {
                            props       : 'placeholder',
                            description : 'Text displayed in the input',
                            type        : 'text'
                        }
                    ]
                }
            }
        }, {
            weight      : 82,
            tag         : 'ns-slider',
            translation : {
                fr : {
                    description : 'Carrousel d\'image',
                    name        : 'Carrousel',
                    properties  : [
                        {
                            props       : 'ns-code',
                            description : 'Code du carrousel',
                            type        : 'text'
                        }
                    ]
                },
                en : {
                    description : 'Slider of images',
                    name        : 'slider',
                    properties  : [
                        {
                            props       : 'ns-code',
                            description : 'Code of slider',
                            type        : 'text'
                        }
                    ]
                }
            }
        }
    ];

    for (const element of shortcodes) {
        try {
            await Shortcodes.findOneAndUpdate({tag: element.tag}, element, {new: true, upsert: true});
        } catch (ee) {
            console.error(ee);
        }
    }
};