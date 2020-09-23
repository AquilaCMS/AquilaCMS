// const NSErrors = require('../utils/errors/NSErrors');
const {Shortcodes} = require('../orm/models');

/*
 * Retourne les shortcodes
 */
exports.getShortcodes = async function () {
    return Shortcodes.find({});
};

/*
 * Instancie la collection au lancement du serveur
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
                            description : 'Container',
                            type        : 'text'
                        },
                        {
                            props       : 'section',
                            description : 'Section',
                            type        : 'text'
                        },
                        {
                            props       : 'head',
                            description : 'Head',
                            type        : 'text'
                        },
                        {
                            props       : 'classexpand',
                            description : 'classexpand',
                            type        : 'text'
                        },
                        {
                            props       : 'autoclose',
                            description : 'autoclose',
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
                            description : 'Ajuster automatiquement la hauteur du carousel aux blockcms',
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
                            description : 'adaptiveHeight',
                            type        : 'text'
                        },
                        {
                            props       : 'dots',
                            description : 'dots',
                            type        : 'text'
                        },
                        {
                            props       : 'draggable',
                            description : 'draggable',
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
                    description : 'Affiche le listing des articles/posts du blog', name : 'Listing d\'articles du blog'
                },
                en : {
                    description : 'description', name : 'Listing of articles'
                }
            }
        },
        {
            weight      : 30,
            tag         : 'ns-breadcrumb',
            translation : {
                fr : {
                    description : 'Affiche un fil d\'ariane sur le site (aide à la navigation)', name : 'Breadcrumb (fil d\'ariane)'
                },
                en : {
                    description : 'Display a breadcrumb', name : 'Breadcrumb'
                }
            }
        },
        {
            weight      : 2,
            tag         : 'ns-btn-login',
            translation : {
                fr : {
                    description : 'Affichage du bouton de Login / Mon Compte', name : 'Bouton'
                },
                en : {
                    description : 'description', name : 'Button'
                }
            }
        },
        {
            weight      : 26,
            tag         : 'ns-cart-count',
            translation : {
                fr : {
                    description : 'Affiche une image \'panier\' avec le nombre de produit affiché', name : 'Panier (avec compteur)'
                },
                en : {
                    description : 'Displays a \'cart\' logo with the number of products displayed', name : 'Cart count'
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
                    description : 'description',
                    name        : 'Block Slider',
                    properties  : [
                        {
                            props       : 'button-title',
                            description : 'button-title',
                            type        : 'text'
                        },
                        {
                            props       : 'mode',
                            description : 'mode',
                            type        : 'list',
                            attributs   : [
                                {
                                    description : 'send',
                                    value       : 'send'
                                }, {
                                    description : 'store',
                                    value       : 'store'
                                }, {
                                    description : 'store+send',
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
                    name        : 'Block Slider',
                    properties  : [
                        {
                            props       : 'value',
                            description : 'List of values ​​separated by commas',
                            type        : 'text'
                        },
                        {
                            props       : 'typenew',
                            description : 'typenew',
                            type        : 'text'
                        },
                        {
                            props       : 'type',
                            description : 'Type of value to enter in \'value\'',
                            type        : 'list',
                            attributs   : [
                                {
                                    description : 'id of one product',
                                    value       : 'product_id'
                                }, {
                                    description : 'Code of one product',
                                    value       : 'product_code'
                                }, {
                                    description : 'Code of one category',
                                    value       : 'category'
                                }, {
                                    description : 'List of product\'s id',
                                    value       : 'list_id'
                                }, {
                                    description : 'List of product\'s code',
                                    value       : 'list_code'
                                }
                            ]
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
                    description : 'Affiche un petit bouton pour rediriger vers le haut de la page', name : 'Top Button'
                },
                en : {
                    description : 'Displays a small button to redirect to the top of the page', name : 'Top Button'
                }
            }
        }, {
            weight      : 22,
            tag         : 'ns-lang',
            translation : {
                fr : {
                    description : 'Affiche un système de choix de langue', name : 'Langue'
                },
                en : {
                    description : 'Displays a language selection system', name : 'Langue'
                }
            }
        },
        {
            weight      : 12,
            tag         : 'ns-login',
            translation : {
                fr : {
                    description : 'Affiche un systeme complet d\'identification', name : 'Identification'
                },
                en : {
                    description : 'Displays a complete identification system', name : 'Login'
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
                            description : 'ns-code: Code of the parent category',
                            type        : 'text'
                        },
                        {
                            props       : 'classbtnmobile',
                            description : 'classbtnmobile',
                            type        : 'text'
                        },
                        {
                            props       : 'classbtnactivemobile',
                            description : 'classbtnactivemobile',
                            type        : 'text'
                        },
                        {
                            props       : 'classnav',
                            description : 'classnav',
                            type        : 'text'
                        },
                        {
                            props       : 'classnavactivemobile',
                            description : 'classnavactivemobile',
                            type        : 'text'
                        },
                        {
                            props       : 'classnavul',
                            description : 'classnavul',
                            type        : 'text'
                        },
                        {
                            props       : 'classnavulli',
                            description : 'classnavulli',
                            type        : 'text'
                        },
                        {
                            props       : 'classnavulliactive',
                            description : 'classnavulliactive',
                            type        : 'text'
                        },
                        {
                            props       : 'levelmax',
                            description : 'levelmax',
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
                            props       : 'gridDisplay',
                            description : 'gridDisplay',
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
                            props       : 'gridDisplay',
                            description : 'gridDisplay',
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
                    description : 'Carousel d\'image',
                    name        : 'Carousel',
                    properties  : [
                        {
                            props       : 'ns-code',
                            description : 'Code du carousel',
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