(function ($, window, document, undefined)
{
    var $doc = $(document);

    $doc.ready(function ()
    {
        $('.select').dropdown();

        $('.btn-menu').on('click', function (event)
        {
            event.preventDefault();
            $('#copyright').toggleClass('copyright');

            $('.nav-fixed').toggleClass('nav-fixed-open');
            $('.main .content').toggleClass('shrink');
            $('.main .content').toggleClass('boxShrinkM boxShrink');
            $('.fsbox').toggleClass('fsboxM');

            $('.nav-margin').toggleClass("hidden");
        });

        $('.nav-fixed a[href="#"]').on('click', function (event)
        {
            event.preventDefault();
        });

        $('.nav-fixed .main-icon').on('click', function (event)
        {
            $(this).closest('li').addClass('expanded').siblings().removeClass('expanded dropdown-open');
        });

        $('.nav-content').on('click', function ()
        {
            $(this).closest('li').toggleClass('dropdown-open').siblings().removeClass('dropdown-open');
        });

        function toggleDropdown(event)
        {
            if(!$(event.target).parents('li').find('.dropdown').length &&
                !$(event.target).closest('.dropdown').length &&
                !$(event.target).is('.nav-fixed > ul > li > a') &&
                !$(event.target).is('.dropdown'))
            {
                // Wait until event bubbles to document
                setTimeout(function ()
                {
                    $('.nav-fixed .parent').removeClass('expanded dropdown-open');
                }, 10);
            }
        }

        $('.content').on('mouseenter', toggleDropdown);

        $doc.on('click touchstart', toggleDropdown);

        if (window.matchMedia("(min-width: 767px)").matches) {
            $('.btn-menu').click();
        }

        $('.main .content').toggleClass('boxShrinkM');
        $('.fsbox').toggleClass('fsboxM');

        if (window.matchMedia("(max-width: 767px)").matches)
        {
            $('.menuClick').on('click', function ()
            {
                $('.btn-menu').click();
            });
        }
    });
})(jQuery, window, document);
