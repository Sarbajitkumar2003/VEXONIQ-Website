
"use strict";

document.addEventListener("DOMContentLoaded", () => {

    // =====================================
    // ELEMENTS
    // =====================================

    const loginTab = document.getElementById("loginTab");
    const registerTab = document.getElementById("registerTab");

    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");

    const authTabs = document.querySelector(".auth-tabs");
    const authCard = document.getElementById("authCard");
    const successScreen = document.getElementById("successScreen");

    const formTitle = document.getElementById("formTitle");
    const formEyebrow = document.getElementById("formEyebrow");
    const formDescription = document.getElementById("formDescription");

    const switchText = document.getElementById("switchText");
    const successMessage = document.getElementById("successMessage");

    const toast = document.getElementById("toast");
    const year = document.getElementById("year");

    // CURRENT YEAR
    if (year) {
        year.textContent = new Date().getFullYear();
    }


    // =====================================
    // TOAST NOTIFICATION
    // =====================================

    let toastTimer;

    function showToast(message) {

        if (!toast) {
            alert(message);
            return;
        }

        toast.textContent = message;
        toast.classList.add("show");

        clearTimeout(toastTimer);

        toastTimer = setTimeout(() => {
            toast.classList.remove("show");
        }, 3000);
    }


    // =====================================
    // FORM SWITCHING
    // =====================================

    function switchForm(mode) {

        const isRegister = mode === "register";

        if (!loginForm || !registerForm) return;

        loginForm.classList.toggle("hidden", isRegister);
        registerForm.classList.toggle("hidden", !isRegister);

        loginTab?.classList.toggle("active", !isRegister);
        registerTab?.classList.toggle("active", isRegister);

        authTabs?.classList.toggle("register-mode", isRegister);

        if (isRegister) {

            if (formEyebrow) {
                formEyebrow.textContent =
                    "JOIN THE CREATIVE WORLD / 02";
            }

            if (formTitle) {
                formTitle.innerHTML =
                    "Create your<br><span>identity.</span>";
            }

            if (formDescription) {
                formDescription.textContent =
                    "Create your account and explore VEXONIQ.";
            }

            if (switchText) {
                switchText.innerHTML =
                    'Already a member? <button type="button" id="switchToLogin">Login here</button>';
            }

        } else {

            if (formEyebrow) {
                formEyebrow.textContent =
                    "WELCOME BACK / 01";
            }

            if (formTitle) {
                formTitle.innerHTML =
                    "Good to<br><span>see you.</span>";
            }

            if (formDescription) {
                formDescription.textContent =
                    "Sign in to continue your creative journey.";
            }

            if (switchText) {
                switchText.innerHTML =
                    'New to VEXONIQ? <button type="button" id="switchToRegister">Create account</button>';
            }
        }
    }


    // =====================================
    // TAB EVENTS
    // =====================================

    loginTab?.addEventListener("click", () => {
        switchForm("login");
    });

    registerTab?.addEventListener("click", () => {
        switchForm("register");
    });


    // =====================================
    // BOTTOM SWITCH BUTTON
    // =====================================

    switchText?.addEventListener("click", event => {

        if (event.target.closest("#switchToRegister")) {
            switchForm("register");
        }

        if (event.target.closest("#switchToLogin")) {
            switchForm("login");
        }

    });


    // =====================================
    // PASSWORD SHOW / HIDE
    // =====================================

    document.querySelectorAll(".password-toggle").forEach(button => {

        button.addEventListener("click", () => {

            const input = document.getElementById(
                button.dataset.target
            );

            if (!input) return;

            const isPassword = input.type === "password";

            input.type = isPassword ? "text" : "password";

            button.textContent = isPassword ? "HIDE" : "SHOW";

        });

    });


    // =====================================
    // SUCCESS SCREEN
    // =====================================

    function showSuccess(name, action) {

        if (!authCard || !successScreen) return;

        authCard.classList.add("hidden");

        if (successMessage) {

            successMessage.textContent =
                action === "register"
                    ? `Welcome, ${name}! Your VEXONIQ demo registration is complete.`
                    : `Welcome back, ${name}! Your VEXONIQ demo sign-in is complete.`;

        }

        successScreen.classList.remove("hidden");

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    }


    // =====================================
    // LOGIN FORM
    // =====================================

    loginForm?.addEventListener("submit", event => {

        event.preventDefault();

        if (!loginForm.reportValidity()) return;

        const email = document
            .getElementById("loginEmail")
            ?.value.trim();

        if (!email) return;

        const name = email.split("@")[0];

        showSuccess(name, "login");

    });


    // =====================================
    // REGISTRATION FORM
    // =====================================

    registerForm?.addEventListener("submit", event => {

        event.preventDefault();

        if (!registerForm.reportValidity()) return;

        const name = document
            .getElementById("registerName")
            ?.value.trim();

        const password = document
            .getElementById("registerPassword")
            ?.value;

        const confirmPassword = document
            .getElementById("confirmPassword")
            ?.value;

        const terms = document.getElementById("acceptTerms");

        if (!name || !password || !confirmPassword) return;

        // PASSWORD MATCH
        if (password !== confirmPassword) {

            showToast("Passwords do not match.");

            document.getElementById("confirmPassword")?.focus();

            return;
        }

        // TERMS ACCEPTANCE
        if (!terms?.checked) {

            showToast("Please accept the Terms & Conditions.");

            return;
        }

        showSuccess(name, "register");

    });


    // =====================================
    // GOOGLE / FACEBOOK
    // =====================================

    document.querySelectorAll("[data-provider]").forEach(button => {

        button.addEventListener("click", () => {

            const provider = button.dataset.provider;

            showToast(
                `${provider} login requires secure OAuth configuration.`
            );

        });

    });


    // =====================================
    // FORGOT PASSWORD
    // =====================================

    const forgotPassword = document.getElementById("forgotPassword");

    forgotPassword?.addEventListener("click", event => {

        event.preventDefault();

        showToast(
            "Password recovery will be available with account authentication."
        );

    });


    // =====================================
    // TERMS & CONDITIONS
    // =====================================

    const termsLink = document.getElementById("termsLink");

    termsLink?.addEventListener("click", event => {

        event.preventDefault();

        window.location.href = "terms.html";

    });


    // =====================================
    // INITIAL STATE
    // =====================================

    switchForm("login");


    // =====================================
    // CONSOLE
    // =====================================

    console.log(
        "%c VEXONIQ® AUTHENTICATION ",
        "background:#d7ff35;color:#101010;font-size:17px;font-weight:bold;padding:10px;"
    );

});
