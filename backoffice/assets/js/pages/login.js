$(document).ready(function () {
    /* ---------- Placeholder Fix for IE ---------- */
    $("input").iCheck({
        checkboxClass : "icheckbox_square-blue"
    });

    $("form").submit(async function (e) {
        e.preventDefault();
        $("#error_msg_bad_login").hide();
        $("#error_msg_disable_account").hide();
        try {
            const response = await $.post(window.location.origin + "/api/v2/auth/login/admin", {
                username: $("#field-email", this).val(),
                password: $("#field-password", this).val()
            });
            window.localStorage.setItem("jwtAdmin", response.data);
            location.href = "/" + window.location.pathname.split("/")[1];
        } catch (err) {
            if(err.responseJSON.code === "DesactivateAccount"){
                $("#error_msg_disable_account").show();
            }else{
                $("#error_msg_bad_login").show();
            }
        }
    });
});