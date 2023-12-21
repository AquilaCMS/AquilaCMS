(function ($, window, document, undefined)
{
    var $doc = $(document);
    var isMobile = {
        Android() {
            return navigator.userAgent.match(/Android/i);
        },
        BlackBerry() {
            return navigator.userAgent.match(/BlackBerry/i);
        },
        iOS() {
            return navigator.userAgent.match(/iPhone|iPad|iPod/i);
        },
        Opera() {
            return navigator.userAgent.match(/Opera Mini/i);
        },
        Windows() {
            return navigator.userAgent.match(/IEMobile/i) || navigator.userAgent.match(/WPDesktop/i);
        },
        any() {
            return (typeof window !== 'undefined' ? isMobile.Android() || isMobile.BlackBerry() || isMobile.iOS() || isMobile.Opera() || isMobile.Windows() : null) !== null;
        },
    };


    $doc.ready(function ()
    {
        $('.btn-menu').on('click', function (event)
        {
            event.preventDefault();
            ExpandMenu();
        });

        $('.nav-fixed a[href="#"]').on('click', function (event)
        {
            event.preventDefault();
            ExpandMenu();
        });

        $('.nav-fixed .main-icon').on('click', function (event)
        {
            $(this).closest('li').addClass('expanded').siblings().removeClass('expanded dropdown-open');
        });

        $('.nav-content').on('click', function ()
        {
            ExpandMenu();
            $(this).closest('li').toggleClass('dropdown-open').siblings().removeClass('dropdown-open');
        });

        if (window.matchMedia("(min-width: 767px)").matches) {
            $('.btn-menu').click();
        }

        $('.main .content').toggleClass('boxShrinkM');
        $('.fsbox').toggleClass('fsboxM');

        if (isMobile.any())
        {
            $('.menuClick').on('click', function ()
            {
                $('.btn-menu').click();
            });
        }

    });
})(jQuery, window, document);

const ExpandMenu = function() {
    $('.nav-fixed').toggleClass('nav-fixed-open');
    $('.main .content').toggleClass('shrink');
    $('.main .content').toggleClass('boxShrinkM boxShrink');
    $('.fsbox').toggleClass('fsboxM');

    $('.nav-margin').toggleClass("hidden");
}