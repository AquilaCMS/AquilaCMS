const resovlers = {
    Subscription : {
        tick : {
            subscribe : (_, __, context) => {
                let tickValue  = 0;
                let intervalId = setInterval(() => {
                    tickValue += 1;
                    context.pubSub.publish('tick', {tick: tickValue});
                    if (tickValue === 10) {
                        clearInterval(intervalId);
                        intervalId = null;
                    }
                }, 1000);

                return context.pubSub.asyncIterator('tick');
            }
        }
    },
    BookingStock : {
        COMMANDE : 'commande',
        PANIER   : 'panier',
        NONE     : 'none',
        PAYMENT  : 'payment'
    },
    AttributeType : {
        PRODUCTS : 'products',
        USERS    : 'users'
    }
};

module.exports = resovlers;