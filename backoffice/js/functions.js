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
