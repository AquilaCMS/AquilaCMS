$(document).ready(function () {
    /* ---------- Placeholder Fix for IE ---------- */
    $("input").iCheck({
        checkboxClass : "icheckbox_square-blue"
    });

    $("form").submit(async function (e) {
        e.preventDefault();
        $("#error_msg").hide();
        try {
            const response = await $.post(window.location.origin + "/api/v2/auth/login/admin", {
                username: $("#field-email", this).val(),
                password: $("#field-password", this).val()
            });
            window.localStorage.setItem("jwtAdmin", response.data);
            location.href = "/" + window.location.pathname.split("/")[1];
        } catch (err) {
            $("#error_msg").show();
        }
    });
});