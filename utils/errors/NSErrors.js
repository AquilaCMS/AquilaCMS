/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2022 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const NSError = require('./NSError');

/**
 * @see 400 - https://tools.ietf.org/html/rfc7231#section-6.5.1
 * @see 401 - https://tools.ietf.org/html/rfc7235#section-3.1
 * @see 402 - https://tools.ietf.org/html/rfc7231#section-6.5.2
 * @see 403 - https://tools.ietf.org/html/rfc7231#section-6.5.3
 * @see 404 - https://tools.ietf.org/html/rfc7231#section-6.5.4
 * @see 409 - https://tools.ietf.org/html/rfc7231#section-6.5.8
 * @see 418 - https://tools.ietf.org/html/rfc2324#section-2.3.2
 * @see 422 - https://tools.ietf.org/html/rfc4918#section-11.2
 * @see 500 - https://tools.ietf.org/html/rfc7231#section-6.6.1
 * @see 503 - https://tools.ietf.org/html/rfc7231#section-6.6.4
 */
class NSErrors {
    static makeErrorAlias(err, code, message, level, datas) {
        return new NSError(err.status, code, message, level, datas);
    }

    static get BadRequest() { return new NSError(400, 'BadRequest'); }
    static get AddressBillingInvalid() { return this.makeErrorAlias(NSErrors.BadRequest, 'AddressBillingInvalid'); }
    static get AddressDeliveryInvalid() { return this.makeErrorAlias(NSErrors.BadRequest, 'AddressDeliveryInvalid'); }
    static get CategoryParentMissing() { return this.makeErrorAlias(NSErrors.BadRequest, 'CategoryParentMissing'); }
    static get InvalidFile() { return this.makeErrorAlias(NSErrors.BadRequest, 'InvalidFile'); }
    static get InvalidParameters() { return this.makeErrorAlias(NSErrors.BadRequest, 'InvalidParameters'); }
    static get InvalidRequest() { return this.makeErrorAlias(NSErrors.BadRequest, 'InvalidRequest'); }
    static get LoginSubscribeEmailInvalid() { return this.makeErrorAlias(NSErrors.BadRequest, 'LoginSubscribeEmailInvalid'); }
    static get LoginSubscribePasswordInvalid() { return this.makeErrorAlias(NSErrors.BadRequest, 'LoginSubscribePasswordInvalid', undefined, 'none'); }
    static get MailAttachmentParameterError() { return this.makeErrorAlias(NSErrors.BadRequest, 'MailAttachmentParameterError'); }
    static get PaymentModeNotAvailable() { return this.makeErrorAlias(NSErrors.BadRequest, 'PaymentModeNotAvailable'); }
    static get PostBodyFilterUndefined() { return this.makeErrorAlias(NSErrors.BadRequest, 'PostBodyFilterUndefined'); }
    static get PostBodyUndefined() { return this.makeErrorAlias(NSErrors.BadRequest, 'PostBodyUndefined'); }
    static get PromoCodeIfStatementBadFormat() { return this.makeErrorAlias(NSErrors.BadRequest, 'PromoCodeIfStatementBadFormat'); }
    static get OrderNotCancelable() { return this.makeErrorAlias(NSErrors.BadRequest, 'OrderNotCancelable'); }

    static get Unauthorized() { return new NSError(401, 'Unauthorized', undefined, 'none'); }
    static get DeactivateAccount() { return this.makeErrorAlias(NSErrors.Unauthorized, 'DeactivateAccount', undefined, 'none'); }
    static get UserNotLogin() { return this.makeErrorAlias(NSErrors.Unauthorized, 'UserNotLogin'); }
    static get BadLogin() { return this.makeErrorAlias(NSErrors.Unauthorized, 'BadLogin', undefined, 'none'); }
    static get MissingHeaderAuthorize() { return this.makeErrorAlias(NSErrors.Unauthorized, 'MissingHeaderAuthorize', undefined, 'none'); }

    static get PaymentRequired() { return new NSError(402, 'PaymentRequired'); }
    static get OrderNotPaid() { return this.makeErrorAlias(NSErrors.PaymentRequired, 'OrderNotPaid'); }

    static get Forbidden() { return new NSError(403, 'Forbidden'); }
    static get AccessUnauthorized() { return this.makeErrorAlias(NSErrors.Forbidden, 'AccessUnauthorized'); }
    static get DemoMode() { return this.makeErrorAlias(NSErrors.Forbidden, 'DemoModeActivate'); }
    static get OperatorRestricted() { return this.makeErrorAlias(NSErrors.Forbidden, 'OperatorRestricted'); }
    static get PromoCodePromoNotAuthorized() { return this.makeErrorAlias(NSErrors.Forbidden, 'PromoCodePromoNotAuthorized'); }
    static get ComponentNotAllowed() { return this.makeErrorAlias(NSErrors.Forbidden, 'ComponentNotAllowed'); }
    static get ProductTypeInvalid() { return this.makeErrorAlias(NSErrors.Forbidden, 'ProductTypeInvalid'); }

    static get NotFound() { return new NSError(404, 'NotFound'); }
    static get AccountUserNotFound() { return this.makeErrorAlias(NSErrors.NotFound, 'AccountUserNotFound'); }
    static get AgendaUpdateError() { return this.makeErrorAlias(NSErrors.NotFound, 'AgendaUpdateError'); }
    static get ApiNotFound() { return this.makeErrorAlias(NSErrors.NotFound, 'ApiNotFound'); }
    static get CartInactive() { return this.makeErrorAlias(NSErrors.NotFound, 'CartInactive'); }
    static get CartInactiveNotFound() { return this.makeErrorAlias(NSErrors.NotFound, 'CartInactiveNotFound'); }
    static get CartItemNotFound() { return this.makeErrorAlias(NSErrors.NotFound, 'CartItemNotFound'); }
    static get CartNotFound() { return this.makeErrorAlias(NSErrors.NotFound, 'CartNotFound', undefined, 'none'); }
    static get CartQuantityError() { return this.makeErrorAlias(NSErrors.NotFound, 'CartQuantityError'); }
    static get CategoryNotFound() { return this.makeErrorAlias(NSErrors.NotFound, 'CategoryNotFound'); }
    static get ChecksumInvoiceError() { return this.makeErrorAlias(NSErrors.NotFound, 'ChecksumInvoiceError'); }
    static get CmsBlockNotFound() { return this.makeErrorAlias(NSErrors.NotFound, 'CmsBlockNotFound'); }
    static get ComponentCodeNotFound() { return this.makeErrorAlias(NSErrors.NotFound, 'ComponentCodeNotFound'); }
    static get ComponentInvalidModel() { return this.makeErrorAlias(NSErrors.NotFound, 'ComponentInvalidModel'); }
    static get ConfigurationMailNotFound() { return this.makeErrorAlias(NSErrors.NotFound, 'ConfigurationMailNotFound'); }
    static get ConfigurationNotFound() { return this.makeErrorAlias(NSErrors.NotFound, 'ConfigurationNotFound'); }
    static get DesignThemeCssGetAll() { return this.makeErrorAlias(NSErrors.NotFound, 'DesignThemeCssGetAll'); }
    static get DesignThemeCssSave() { return this.makeErrorAlias(NSErrors.NotFound, 'DesignThemeCssSave'); }
    static get GalleryAddItemEmptyNotFound() { return this.makeErrorAlias(NSErrors.NotFound, 'GalleryAddItemEmptyNotFound'); }
    static get GalleryNotFound() { return this.makeErrorAlias(NSErrors.NotFound, 'GalleryNotFound'); }
    static get GalleryUpdateError() { return this.makeErrorAlias(NSErrors.NotFound, 'GalleryUpdateError'); }
    static get InvalidIdObjectIdError() { return this.makeErrorAlias(NSErrors.NotFound, 'InvalidIdObjectIdError'); }
    static get InvoiceNotFound() { return this.makeErrorAlias(NSErrors.NotFound, 'InvoiceNotFound'); }
    static get InactiveCart() { return this.makeErrorAlias(NSErrors.NotFound, 'InactiveCart'); }
    static get JobAgendaCannotDeleteSystem() { return this.makeErrorAlias(NSErrors.NotFound, 'JobAgendaCannotDeleteSystem'); }
    static get JobAgendaSaveError() { return this.makeErrorAlias(NSErrors.NotFound, 'JobAgendaSaveError'); }
    static get JobNotFound() { return this.makeErrorAlias(NSErrors.NotFound, 'JobNotFound'); }
    static get JobNotSupportedRequestMethod() { return this.makeErrorAlias(NSErrors.NotFound, 'JobNotSupportedRequestMethod'); }
    static get MailCreateError() { return this.makeErrorAlias(NSErrors.NotFound, 'MailCreateError'); }
    static get MailTypeCreateError() { return this.makeErrorAlias(NSErrors.NotFound, 'MailTypeCreateError'); }
    static get MailFieldHtmlNotFound() { return this.makeErrorAlias(NSErrors.NotFound, 'MailFieldHtmlNotFound'); }
    static get MailFieldSubjectNotFound() { return this.makeErrorAlias(NSErrors.NotFound, 'MailFieldSubjectNotFound'); }
    static get MailNotFound() { return this.makeErrorAlias(NSErrors.NotFound, 'MailNotFound'); }
    static get MailTypeCannotDeleteNoType() { return this.makeErrorAlias(NSErrors.NotFound, 'MailTypeCannotDeleteNoType'); }
    static get MailTypeNotFound() { return this.makeErrorAlias(NSErrors.NotFound, 'MailTypeNotFound'); }
    static get MailTypeUpdateError() { return this.makeErrorAlias(NSErrors.NotFound, 'MailTypeUpdateError'); }
    static get MailTypeUpdateNoCodeError() { return this.makeErrorAlias(NSErrors.NotFound, 'MailTypeUpdateNoCodeError'); }
    static get MailUpdateError() { return this.makeErrorAlias(NSErrors.NotFound, 'MailUpdateError'); }
    static get MailUpdateNoTypeError() { return this.makeErrorAlias(NSErrors.NotFound, 'MailUpdateNoTypeError'); }
    static get MediaNotFound() { return this.makeErrorAlias(NSErrors.NotFound, 'MediaNotFound'); }
    static get MissingConfiguration() { return this.makeErrorAlias(NSErrors.NotFound, 'MissingConfiguration'); }
    static get ModuleNotFound() { return this.makeErrorAlias(NSErrors.NotFound, 'ModuleNotFound'); }
    static get OrderNotFound() { return this.makeErrorAlias(NSErrors.NotFound, 'OrderNotFound'); }
    static get PaymentModeNotFound() { return this.makeErrorAlias(NSErrors.NotFound, 'PaymentModeNotFound'); }
    static get PictoNotFound() { return this.makeErrorAlias(NSErrors.NotFound, 'PictoNotFound'); }
    static get ProductDownloadLinkInvalid() { return this.makeErrorAlias(NSErrors.NotFound, 'ProductDownloadLinkInvalid'); }
    static get ProductInvalid() { return this.makeErrorAlias(NSErrors.NotFound, 'ProductInvalid'); }
    static get ProductNotFound() { return this.makeErrorAlias(NSErrors.NotFound, 'ProductNotFound'); }
    static get ProductNotFoundInOrder() { return this.makeErrorAlias(NSErrors.NotFound, 'ProductNotFoundInOrder'); }
    static get ProductNotInStock() { return this.makeErrorAlias(NSErrors.NotFound, 'ProductNotInStock'); }
    static get ProductNotOrderable() { return this.makeErrorAlias(NSErrors.NotFound, 'ProductNotOrderable'); }
    static get ProductNotSalable() { return this.makeErrorAlias(NSErrors.NotFound, 'ProductNotSalable'); }
    static get ProductReviewNotFound() { return this.makeErrorAlias(NSErrors.NotFound, 'ProductReviewNotFound'); }
    static get ProductUpdateError() { return this.makeErrorAlias(NSErrors.NotFound, 'ProductUpdateError'); }
    static get ProductUpdateSlugError() { return this.makeErrorAlias(NSErrors.NotFound, 'ProductUpdateSlugError'); }
    static get PromoCodePromoInvalid() { return this.makeErrorAlias(NSErrors.NotFound, 'PromoCodePromoInvalid'); }
    static get PromoDateError() { return this.makeErrorAlias(NSErrors.NotFound, 'PromoDateError'); }
    static get PromoNotFound() { return this.makeErrorAlias(NSErrors.NotFound, 'PromoNotFound'); }
    static get PromoCodeNotFound() { return this.makeErrorAlias(NSErrors.NotFound, 'PromoCodeNotFound'); }
    static get PromoUpdateError() { return this.makeErrorAlias(NSErrors.NotFound, 'PromoUpdateError'); }
    static get ResetPasswordMailContentAdminNotExists() { return this.makeErrorAlias(NSErrors.NotFound, 'ResetPasswordMailContentAdminNotExists'); }
    static get SetAttributeNotFound() { return this.makeErrorAlias(NSErrors.NotFound, 'SetAttributeNotFound'); }
    static get ShipmentUpdateError() { return this.makeErrorAlias(NSErrors.NotFound, 'ShipmentUpdateError'); }
    static get ShipmentNotFound() { return this.makeErrorAlias(NSErrors.NotFound, 'ShipmentNotFound'); }
    static get SliderUpdateError() { return this.makeErrorAlias(NSErrors.NotFound, 'SliderUpdateError'); }
    static get SliderNotFound() { return this.makeErrorAlias(NSErrors.NotFound, 'SliderNotFound'); }
    static get StaticNotFound() { return this.makeErrorAlias(NSErrors.NotFound, 'StaticNotFound'); }
    static get StatusUpdateError() { return this.makeErrorAlias(NSErrors.NotFound, 'StatusUpdateError'); }
    static get TradeMarkNotFound() { return this.makeErrorAlias(NSErrors.NotFound, 'TradeMarkNotFound'); }
    static get TranslationError() { return this.makeErrorAlias(NSErrors.NotFound, 'TranslationError'); }
    static get UnableToMail() { return this.makeErrorAlias(NSErrors.NotFound, 'UnableToMail'); }
    static get UpdateUserInvalid() { return this.makeErrorAlias(NSErrors.NotFound, 'UpdateUserInvalid'); }
    static get UserNotFound() { return this.makeErrorAlias(NSErrors.NotFound, 'UserNotFound'); }
    static get ModulePathNotFound() { return this.makeErrorAlias(NSErrors.NotFound, 'ModulePathNotFound'); }
    static get ModuleMainFolder() { return this.makeErrorAlias(NSErrors.NotFound, 'ModuleMainFolder' ); }
    static get ModuleInfoNotFound() { return this.makeErrorAlias(NSErrors.NotFound, 'ModuleInfoNotFound'); }
    static get ThemePackageNotFound() { return this.makeErrorAlias(NSErrors.NotFound, 'ThemePackageNotFound'); }
    static get SameTheme() { return this.makeErrorAlias(NSErrors.BadRequest, 'SameTheme'); }
    static get ThemeInstallation() { return this.makeErrorAlias(NSErrors.BadRequest, 'ThemeInstallation'); }
    static get MissingParameters() { return this.makeErrorAlias(NSErrors.NotFound, 'MissingParameters'); }

    static get Conflict() { return new NSError(409, 'Conflict'); }
    static get DesignThemeRemoveCurrent() { return this.makeErrorAlias(NSErrors.Conflict, 'DesignThemeRemoveCurrent'); }
    static get DuplicateKey() { return this.makeErrorAlias(NSErrors.Conflict, 'DuplicateKey'); }
    static get InvoiceAlreadyExists() { return this.makeErrorAlias(NSErrors.Conflict, 'InvoiceAlreadyExists'); }
    static get LoginSubscribeEmailExisting() { return this.makeErrorAlias(NSErrors.Conflict, 'LoginSubscribeEmailExisting'); }
    static get MailCodeAlreadyExists() { return this.makeErrorAlias(NSErrors.Conflict, 'MailCodeAlreadyExists'); }
    static get MailTypeCodeAlreadyExists() { return this.makeErrorAlias(NSErrors.Conflict, 'MailTypeCodeAlreadyExists'); }
    static get ProductCodeExisting() { return this.makeErrorAlias(NSErrors.Conflict, 'ProductCodeExisting'); }
    static get FamilyCodeExisting() { return this.makeErrorAlias(NSErrors.Conflict, 'FamilyCodeExisting'); }
    static get CodeExisting() { return this.makeErrorAlias(NSErrors.Conflict, 'CodeExisting'); }
    static get ProductIdExisting() { return this.makeErrorAlias(NSErrors.Conflict, 'ProductIdExisting'); }
    static get PromoCodePromoExists() { return this.makeErrorAlias(NSErrors.Conflict, 'PromoCodePromoExists'); }
    static get PromoCodePromoLimitClientMax() { return this.makeErrorAlias(NSErrors.Conflict, 'PromoCodePromoLimitClientMax'); }
    static get SetAttributeLinkedWithProduct() { return this.makeErrorAlias(NSErrors.Conflict, 'SetAttributeLinkedWithProduct'); }
    static get SitemapInUse() { return this.makeErrorAlias(NSErrors.Conflict, 'SitemapInUse'); }
    static get UserAlreadyExist() { return this.makeErrorAlias(NSErrors.Conflict, 'UserAlreadyExist'); }
    static get categoryAlreadyExist() { return this.makeErrorAlias(NSErrors.Conflict, 'categoryAlreadyExist'); }
    static get SlugAlreadyExist() { return this.makeErrorAlias(NSErrors.Conflict, 'SlugAlreadyExist'); }

    static get Teapot() { return new NSError(418, 'Teapot'); }

    static get UnprocessableEntity() { return new NSError(422, 'UnprocessableEntity'); }
    static get InvalidObjectIdError() { return this.makeErrorAlias(NSErrors.UnprocessableEntity, 'InvalidObjectIdError'); }
    static get MissingModuleDependencies() { return this.makeErrorAlias(NSErrors.UnprocessableEntity, 'MissingModuleDependencies'); }
    static get RequiredModuleDependencies() { return this.makeErrorAlias(NSErrors.UnprocessableEntity, 'RequiredModuleDependencies'); }
    static get ModuleAquilaVersionNotSatisfied() { return this.makeErrorAlias(NSErrors.NotFound, 'ModuleAquilaVersionNotSatisfied'); }
    static get ThemeAquilaVersionNotSatisfied() { return this.makeErrorAlias(NSErrors.NotFound, 'ThemeAquilaVersionNotSatisfied'); }

    static get InternalError() { return new NSError(500, 'InternalError'); }
    static get PaymentFailed() { return this.makeErrorAlias(NSErrors.InternalError, 'PaymentFailed'); }
    static get TranslateDeleteError() { return this.makeErrorAlias(NSErrors.InternalError, 'TranslateDeleteError'); }
    static get ModuleNameMissmatch() { return this.makeErrorAlias(NSErrors.InternalError, 'ModuleNameMissmatch'); }
    static get ThemeNameMissmatch() { return this.makeErrorAlias(NSErrors.InternalError, 'ThemeNameMissmatch'); }
    static get CommandsMayNotInPath() { return this.makeErrorAlias(NSErrors.InternalError, 'CommandsMayNotInPath'); }

    static get ServiceUnavailable() { return new NSError(503, 'ServiceUnavailable'); }

    static NSError() { return NSError; }
}

module.exports = NSErrors;