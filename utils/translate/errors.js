/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2022 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

module.exports = {
    InvalidRequest : {
        fr : 'Requête invalide',
        en : 'InvalidRequest'
    },
    Unauthorized : {
        fr : 'Non autorisé',
        en : 'Unauthorized'
    },
    DeactivateAccount : {
        fr : 'Compte désactivé',
        en : 'Desactivate account'
    },
    BadLogin : {
        fr : 'Votre identifiant ou mot de passe est incorrect',
        en : 'Your username or password is incorrect'
    },
    MissingHeaderAuthorize : {
        fr : 'En-tête Authorize manquante',
        en : 'MissingHeaderAuthorize'
    },
    UserNotLogin : {
        fr : 'Utilisateur non connecté',
        en : 'User not logged in'
    },
    Forbidden : {
        fr : 'Interdit',
        en : 'Forbidden'
    },
    DemoModeActivate : {
        fr : 'Mode démo Activé',
        en : 'Demo mode activate'
    },
    NotFound : {
        fr : 'Item non trouvé',
        en : 'Item not found'
    },
    MediaNotFound : {
        fr : 'Média introuvable',
        en : 'Media not found'
    },
    UserNotFound : {
        fr : 'Utilisateur non trouvé',
        en : 'User not found'
    },
    Conflict : {
        fr : 'Le code existe déjà',
        en : 'Code already exists'
    },
    UserAlreadyExist : {
        fr : 'Mauvaises informations d\'identification ou utilisateur déjà existant',
        en : 'Wrong credentials or user already existing'
    },
    UnprocessableEntity : {
        fr : 'Entité non traitable',
        en : 'Unprocessable entity'
    },
    InvalidObjectIdError : {
        fr : 'ObjectId est invalide',
        en : 'Invalid ObjectId'
    },
    InternalError : {
        fr : 'Erreur interne',
        en : 'Internal error'
    },
    CommandsMayNotInPath : {
        fr : "La commande a échouée, cela peut arriver si la commande n'est pas dans la variable d'environnement (PATH)",
        en : 'The command fails, this can happen if the command is not in the environment variable (PATH)'
    },
    ServiceUnavailable : {
        fr : 'Le service est actuellement indisponible',
        en : 'Service is currently unavailable'
    },
    ConfigurationMailNotFound : {
        fr : 'La configuration mail n\'a pas été trouvée',
        en : 'Mail configuration was not found'
    },
    MissingModuleDependencies : {
        fr : 'Au moins un module requis n\'a pas été installer ou activé',
        en : 'At least one required module has not been installed or activated'
    },
    RequiredModuleDependencies : {
        fr : 'Au moins un module est requis par celui-ci',
        en : 'At least one module is required by it'
    },
    ApiNotFound : {
        fr : 'API introuvable',
        en : 'Api not found'
    },
    OrderNotFound : {
        fr : 'La commande n\'existe pas',
        en : 'The order doesn\'t exist'
    },
    ProductInvalid : {
        fr : 'Le produit est invalide.',
        en : 'This product is invalid'
    },
    ProductNotSalable : {
        fr : 'Le produit n\'est pas vendable.',
        en : 'This product is not salable'
    },
    ProductNotInStock : {
        fr : 'Le produit n\'est plus disponible.',
        en : 'This product is not available'
    },
    CartQuantityError : {
        fr : 'La quantité du panier est invalide',
        en : 'Cart quantity is not valid'
    },
    categoryAlreadyExist : {
        fr : 'Catégorie déjà existante',
        en : 'Category already exist'
    },
    SlugAlreadyExist : {
        fr : 'Le slug existe déjà',
        en : 'Slug already exist'
    },
    CmsBlockNotFound : {
        fr : 'Bloc CMS non trouvé',
        en : 'CMS Block not found'
    },
    TranslateDeleteError : {
        fr : 'Toutes les traductions n\'ont pas pu être supprimées. Réessayez plus tard de supprimer cette langue.',
        en : 'Some translations were not deleted. Try again later.'
    },
    InvalidFile : {
        fr : 'Le fichier n\'est pas valide',
        en : 'Invalid file'
    },
    PaymentModeNotAvailable : {
        fr : 'Le mode de paiement souhaité n\'est pas autorisé.',
        en : 'The payment mode is not available'
    },
    PaymentModeNotFound : {
        fr : 'Ce mode de paiement est introuvable.',
        en : 'Payment mode not found.'
    },
    ModuleNotFound : {
        fr : 'Module non trouvé',
        en : 'Plugin not found'
    },
    ProductCodeExisting : {
        fr : 'Code produit déjà existant',
        en : 'Product code already exists'
    },
    FamilyCodeExisting : {
        fr : 'Code famille déjà existant',
        en : 'Family code already exists'
    },
    CodeExisting : {
        fr : 'Code déjà existant',
        en : 'Code already exists'
    },
    ProductNotFound : {
        fr : 'Produit non trouvé',
        en : 'Product not found'
    },
    AccessUnauthorized : {
        fr : 'Accès interdit',
        en : 'Access unauthorized'
    },
    SetAttributeNotFound : {
        fr : 'Jeu d\'attributs introuvable',
        en : 'Set attributes not found'
    },
    LoginSubscribeEmailExisting : {
        fr : 'Un compte avec cet email existe déjà',
        en : 'An account with this email already existing'
    },
    InvoiceAlreadyExists : {
        fr : 'Facture deja existante.',
        en : 'Invoice already exists.'
    },
    InvoiceNotFound : {
        fr : 'Le block CMS "invoice" non trouvé.',
        en : 'CMS block "invoice" not found.'
    },
    ChecksumInvoiceError : {
        fr : 'Les données de la facture ont été modifiées. Impossible de générer le PDF.',
        en : 'The invoice data has been changed. Unable to generate the PDF.'
    },
    CartNotFound : {
        fr : 'Panier introuvable',
        en : 'Cart not found'
    },
    CartInactive : {
        fr : 'Le panier est inactif',
        en : 'Cart is inactive'
    },
    CartItemNotFound : {
        fr : 'L\'article du panier est introuvable.',
        en : 'Item cannot be found'
    },
    PromoCodePromoInvalid : {
        fr : 'Ce code promo est invalide',
        en : 'This discount is not available'
    },
    ProductNotOrderable : {
        fr : 'Ce produit n\'est pas commandable.',
        en : 'Product not orderable.'
    },
    CategoryParentMissing : {
        fr : 'Impossible de mettre à jour le menu',
        en : 'Cannot update this menu'
    },
    InvalidIdObjectIdError : {
        fr : 'L\'identifiant n\'est pas valide',
        en : 'Unknow id'
    },
    CategoryNotFound : {
        fr : 'Impossible de trouver la catégorie',
        en : 'Category not found'
    },
    AgendaUpdateError : {
        fr : 'Impossible de mettre à jour l\'agenda',
        en : 'Cannot update this agenda'
    },
    ComponentCodeNotFound : {
        fr : 'Bloc CMS non trouvé',
        en : 'CMS Block not found'
    },
    ComponentNotAllowed : {
        fr : 'Composant non autorisé, il doit être prefixé par ns-',
        en : 'Composant not allowed, it should be prefixed with ns-'
    },
    ProductTypeInvalid : {
        fr : 'Ce type n\'est pas valide',
        en : 'Type not allowed'
    },
    ComponentInvalidModel : {
        fr : 'Impossible de trouver le code de ce composant',
        en : 'Cannot find component code'
    },
    GalleryNotFound : {
        fr : 'Galerie non trouvée',
        en : 'Gallery not found'
    },
    GalleryUpdateError : {
        fr : 'Impossible de mettre à jour la galerie',
        en : 'Cannot update this gallery'
    },
    GalleryAddItemEmptyNotFound : {
        fr : 'Veuillez ajouter une photo ou vidéo avant de sauvegarder',
        en : 'Please add a picture or video before saving'
    },
    JobNotFound : {
        fr : 'Impossible de trouver la tâche planifiée en base de données',
        en : 'Cannot find this schedule tasks in database'
    },
    JobAgendaSaveError : {
        fr : 'Impossible de sauvegarder la tâche planifiée agenda',
        en : 'Cannot save this scheduled task agenda'
    },
    JobAgendaCannotDeleteSystem : {
        fr : 'Vous ne pouvez pas supprimer une tâche planifiée système',
        en : 'You are not allowed to delete a system scheduled task'
    },
    JobNotSupportedRequestMethod : {
        fr : 'La méthode HTTP n\'est pas supporté',
        en : 'HTTP method not supported'
    },
    TranslationError : {
        fr : 'Une erreur est survenue',
        en : 'An error occured'
    },
    MailNotFound : {
        fr : 'Impossible de trouver le template de mail',
        en : 'Cannot find mail template'
    },
    MailUpdateError : {
        fr : 'Impossible de mettre à jour le mail',
        en : 'Cannot update this email'
    },
    MailCreateError : {
        fr : 'Impossible de créer le mail',
        en : 'Cannot create this email'
    },
    MailCodeAlreadyExists : {
        fr : 'Le code de ce mail existe déjà',
        en : 'The code of this email already exists'
    },
    LoginSubscribeEmailInvalid : {
        fr : 'Email invalide',
        en : 'Invalid email'
    },
    MailUpdateNoTypeError : {
        fr : 'Impossible de mettre le type de mail à "noType" le mail',
        en : 'Cannot update email type to "noType"'
    },
    ConfigurationNotFound : {
        fr : 'Configuration non trouvée',
        en : 'Configuration not found'
    },
    MailFieldSubjectNotFound : {
        fr : 'Impossible de trouver le champ "subject" en base de données',
        en : 'Cannot find field "subject" in database'
    },
    MailFieldHtmlNotFound : {
        fr : 'Impossible de trouver le champ contenant l\'html du mail en base de données',
        en : 'Cannot find the field containing the html of the mail in database'
    },
    AccountUserNotFound : {
        fr : 'Utilisateur non trouvé',
        en : 'User not found'
    },
    ResetPasswordMailContentAdminNotExists : {
        fr : 'Le template de mail pour la réinitialisation du mot de passe n\'a pas été configuré.',
        en : 'The mail template for password reset has not been configured.'
    },
    ResetPasswordMailContentNotExists : {
        fr : 'La réinitialisation du mot de passe est actuellement indisponible.',
        en : 'Password reset is currently unavailable.'
    },
    MailAttachmentParameterError : {
        fr : 'Aucune pièce jointe importée',
        en : 'No attachments imported'
    },
    OrderNotPaid : {
        fr : 'La commande n\'a pas encore été payée',
        en : 'Order is not paid yet'
    },
    UnableToMail : {
        fr : 'Impossible d\'envoyer le mail',
        en : 'Unable to send email'
    },
    MailTypeUpdateError : {
        fr : 'Impossible de mettre à jour le type de mail',
        en : 'Cannot update this email type'
    },
    MailTypeCannotDeleteNoType : {
        fr : 'Impossible de supprimer un mail de type "noType"',
        en : 'Cannot delete email of type "noType"'
    },
    MailTypeNotFound : {
        fr : 'Impossible de trouver le type de mail en base de données',
        en : 'Cannot find this type of mail in database'
    },
    MailTypeUpdateNoCodeError : {
        fr : 'Impossible de mettre le code du type de mail à "noCode"',
        en : 'Cannot update email type code to "noCode"'
    },
    MailTypeCreateError : {
        fr : 'Impossible de créer le type de mail',
        en : 'Cannot create this email type'
    },
    MailTypeCodeAlreadyExists : {
        fr : 'Le code de ce type de mail existe déjà',
        en : 'The code of this email type already exists'
    },
    StatusUpdateError : {
        fr : 'Ce changement de statut est impossible.',
        en : 'Impossible to update status.'
    },
    PictoNotFound : {
        fr : 'Le pictogramme est introuvable.',
        en : 'Pictogram not found'
    },
    DuplicateKey : {
        fr : 'Ce code existe deja',
        en : 'This code already exist'
    },
    ProductUpdateError : {
        fr : 'Impossible de mettre à jour le produit',
        en : 'Cannot update this product'
    },
    ProductUpdateSlugError : {
        fr : 'Impossible de mettre à jour le produit, le slug est trop court',
        en : 'Cannot update this product, slug is too short'
    },
    ProductIdExisting : {
        fr : 'ID produit déjà existant',
        en : 'Product id already exists'
    },
    InactiveCart : {
        fr : 'Panier inactif',
        en : 'Inactive cart'
    },
    ProductNotFoundInOrder : {
        fr : 'Produit non trouvé pour cette commande',
        en : 'Product not find in this order'
    },
    ProductDownloadLinkInvalid : {
        fr : 'Liens de téléchargement du fichier invalide',
        en : 'Invalid product download link'
    },
    PromoDateError : {
        fr : 'Vous ne pouvez pas mettre une date de départ supérieur à la date de fin',
        en : 'You cannot put a start date greater than the end date'
    },
    PromoCodePromoExists : {
        fr : 'Les codes promos doivent être unique',
        en : 'Discount code should be unique'
    },
    PromoUpdateError : {
        fr : 'Impossible de mettre à jour la promotion',
        en : 'Cannot update this discount'
    },
    PromoNotFound : {
        fr : 'Impossible de trouver la promotion',
        en : 'Cannot find discount'
    },
    PromoCodeNotFound : {
        fr : 'Impossible de trouver le code de la promotion',
        en : 'Cannot find the code discount'
    },
    PromoCodeIfStatementBadFormat : {
        fr : 'Une erreur de format est survenue lors de la création de la condition',
        en : 'A format error occurred while creating the condition'
    },
    OrderNotCancelable : {
        fr : 'Impossible d\'annuler la commande',
        en : 'Cannot cancel order'
    },

    CartInactiveNotFound : {
        fr : 'Le panier est introuvable ou inactif.',
        en : 'Cart is inactive or not found'
    },
    PromoCodePromoLimitClientMax : {
        fr : 'Vous avez atteint le nombre maximal d\'utilisation pour ce code promo',
        en : 'You have reached the maximum number of uses for this coupon code'
    },
    PromoCodePromoNotAuthorized : {
        fr : 'Vous n\'êtes pas autorisé a utiliser ce code promo',
        en : 'You are not allowed to use this coupon code'
    },
    InvalidParameters : {
        fr : 'Parametre(s) invalide(s)',
        en : 'Bad parameter(s)'
    },
    ProductReviewNotFound : {
        fr : 'Avis introuvable dans ce produit',
        en : 'Review not found into this product'
    },
    SitemapInUse : {
        fr : 'Le sitemap est déjà en cours d\'éxécution.',
        en : 'Sitemap already in use.'
    },
    SetAttributeLinkedWithProduct : {
        fr :
                'Un produit est lié à ce jeu d\'attributs. Vous ne pouvez pas le supprimer.',
        en :
                'This attribut set is linked with a product, you cannot delete it.'
    },
    ShipmentUpdateError : {
        fr : 'Impossible de mettre à jour le moyen d\'expedition',
        en : 'Cannot update this shipment'
    },
    ShipmentNotFound : {

        fr : 'Le Shipment est introuvable',
        en : 'Shipment not found'
    },
    SliderUpdateError : {
        fr : 'Impossible de mettre à jour le carousel',
        en : 'Cannot update this slider'
    },
    SliderNotFound : {
        fr : 'Slider introuvable',
        en : 'Slider not found'
    },
    StaticNotFound : {
        fr : 'Static non trouvé',
        en : 'Static not found'
    },
    DesignThemeRemoveCurrent : {
        fr : 'Impossible de supprimer le theme courant ou le theme par défaut',
        en : 'Cannot remove current theme or default theme'
    },
    DesignThemeCssGetAll : {
        fr : 'Impossible de récupérer les styles',
        en : 'Cannot get styles'
    },
    DesignThemeCssSave : {
        fr : 'Impossible de sauvegarder le style',
        en : 'Cannot save style'
    },
    TradeMarkNotFound : {
        fr : 'Marque introuvable',
        en : 'Trademark not found'
    },
    UpdateUserInvalid : {
        fr : 'Erreur lors de la mise à jour de l\'utilisateur',
        en : 'Error while updating the user'
    },
    AddressDeliveryInvalid : {
        fr : 'L\'adresse de livraison est invalide.',
        en : 'Delivery address isn\'t valid.'
    },
    AddressBillingInvalid : {
        fr : 'L\'adresse de facturation est invalide.',
        en : 'Billing address isn\'t valid.'
    },
    LoginSubscribePasswordInvalid : {
        fr : 'Le mot de passe doit contenir au minimum 6 caractères, dont une minuscule, une majuscule et un chiffre.',
        en : 'The password must contain at least 6 characters, including a lowercase, an uppercase and a number.'
    },
    OperatorRestricted : {
        fr : 'Vous ne pouvez pas utiliser cet opérateur',
        en : 'You are not allowed to use this operator'
    },
    PostBodyUndefined : {
        fr : 'Vous devez envoyer un objet PostBody dans votre requête',
        en : 'You must send a PostBody object in your request'
    },
    PostBodyFilterUndefined : {
        fr : 'Vous devez envoyer un objet PostBody.filter pour ce type de requête',
        en : 'You must send a PostBody.filter object for this kind of request'
    },
    ModulePathNotFound : {
        fr : 'Le chemin du module n\'a pas été trouvé',
        en : 'Module path was not found'
    },
    ModuleMainFolder : {
        fr : 'Dossier principal manquant dans le zip',
        en : 'Missing main folder in zip'
    },
    ModuleInfoNotFound : {
        fr : 'Module info not found',
        en : 'Module info.json introuvable'
    },
    ModuleAquilaVersionNotSatisfied : {
        fr : 'Version du module Aquila non satisfaite',
        en : 'Module aquila version not satisfied'
    },
    ThemePackageNotFound : {
        fr : 'Thème Package.json introuvable',
        en : 'Theme package.json not found'
    },
    ThemeAquilaVersionNotSatisfied : {
        fr : 'Version du theme Aquila non satisfaite',
        en : 'Aquila theme version not satisfied'
    },
    SameTheme : {
        fr : 'Ce theme est le thème courant',
        en : 'This theme is the current theme'
    },
    ThemeInstallation : {
        fr : "Erreur lors de l'installation du thème",
        en : 'Error during theme installation'
    },
    ModuleNameMissmatch : {
        fr : 'Le nom du theme, nom du dossier ou du zip du module ne corespondent pas',
        en : 'The name of the theme, name of the module\'s folder or zip do not match'
    },
    ThemeNameMissmatch : {
        fr : 'Le nom du theme, nom du dossier ou du zip du theme ne corespondent pas',
        en : 'The name of the theme, name of the module\'s folder or zip do not match'
    }
};
