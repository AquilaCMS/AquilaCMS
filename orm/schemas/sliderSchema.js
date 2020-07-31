const mongoose = require('mongoose');
const Schema   = mongoose.Schema;

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
        extension : {type: String, default: '.jpg'}
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
});

module.exports = SliderSchema;
