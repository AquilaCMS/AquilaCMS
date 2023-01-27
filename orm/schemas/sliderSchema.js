/*
 * Product    : AQUILA-CMS
 * Author     : Nextsourcia - contact@aquila-cms.com
 * Copyright  : 2023 © Nextsourcia - All rights reserved.
 * License    : Open Software License (OSL 3.0) - https://opensource.org/licenses/OSL-3.0
 * Disclaimer : Do not edit or add to this file if you wish to upgrade AQUILA CMS to newer versions in the future.
 */

const mongoose       = require('mongoose');
const {aquilaEvents} = require('aql-utils');
const utilsDatabase  = require('../../utils/database');
const Schema         = mongoose.Schema;

const boolDefault   = (bool) => ({type: Boolean, default: bool});
const numberDefault = (num) => ({type: Number, default: num});
const stringDefault = () => ({type: String, trim: true, default: ''});

const SliderSchema = new Schema({
    name : {
        ...stringDefault()
    },
    code : {
        ...stringDefault(),
        required : true,
        min      : [1, 'Too few characters'],
        unique   : true
    },
    items : [{
        _itemId   : Schema.Types.ObjectId,
        order     : {...numberDefault(0)},
        src       : {...stringDefault()},
        text      : {...stringDefault()},
        name      : {...stringDefault()},
        href      : {...stringDefault()},
        extension : {type: String, default: '.jpg'},
        startDate : {type: Date},
        endDate   : {type: Date}
    }],
    accessibility : {
        ...boolDefault(true)
    },
    arrows : {
        ...boolDefault(true)
    },
    // si true, active le defilement automatique du slider
    autoplay : {
        ...boolDefault(false)
    },
    // temps entre chaque transition quand autoplay = true
    autoplaySpeed : {
        ...numberDefault(5000)
    },
    // Défilement infini (passe de la dernière à la 1ere image)
    infinite : {
        ...boolDefault(true)
    },
    // De base les images slideront d'une à l'autre, si true il y aura un effet de fondu
    fade : {
        ...boolDefault(false)
    },
    // Charge les images à la demande
    lazyLoad : {
        ...boolDefault(true)
    },
    // Si le pointeur est sur l'image et que pauseOnHover = true alors l'image ne défile plus
    pauseOnHover : {
        ...boolDefault(false)
    },
    // Affiche 1 image à la fois
    slidesToShow : {
        ...numberDefault(1)
    },
    // Défilement des images 1 par 1
    slidesToScroll : {
        ...numberDefault(1)
    },
    // Temps de défilement (transition) entre deux images
    speed : {
        ...numberDefault(500)
    },
    // Permet de changer d'image avec les doigts
    swipe : {
        ...boolDefault(true)
    }
}, {
    id : false
});

SliderSchema.statics.checkCode = async function (that) {
    await utilsDatabase.checkCode('slider', that._id, that.code);
};

SliderSchema.pre('updateOne', async function (next) {
    await utilsDatabase.preUpdates(this, next, SliderSchema);
});

SliderSchema.pre('findOneAndUpdate', async function (next) {
    await utilsDatabase.preUpdates(this, next, SliderSchema);
});

SliderSchema.pre('save', async function (next) {
    await utilsDatabase.preUpdates(this, next, SliderSchema);
});

aquilaEvents.emit('sliderSchemaInit', SliderSchema);

module.exports = SliderSchema;
