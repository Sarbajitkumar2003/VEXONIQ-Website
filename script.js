
"use strict";

// ====================================
// VEXONIQ — INTERACTIONS
// ====================================

const loader = document.getElementById("loader");
const menuButton = document.getElementById("menuButton");
const navigation = document.getElementById("navigation");
const toast = document.getElementById("toast");
const year = document.getElementById("year");


// PAGE LOADER
window.addEventListener("load", () => {
    setTimeout(() => {
        loader?.classList.add("hide");
    }, 1100);
});


// CURRENT YEAR
if (year) {
    year.textContent = new Date().getFullYear();
}


// MOBILE MENU
function closeMenu() {
    menuButton?.classList.remove("active");
    navigation?.classList.remove("open");
    menuButton?.setAttribute("aria-expanded", "false");
}

menuButton?.addEventListener("click", () => {
    const open = navigation.classList.toggle("open");

    menuButton.classList.toggle("active", open);
    menuButton.setAttribute("aria-expanded", String(open));
});

navigation?.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", closeMenu);
});

document.addEventListener("click", event => {
    if (
        navigation &&
        menuButton &&
        !navigation.contains(event.target) &&
        !menuButton.contains(event.target)
    ) {
        closeMenu();
    }
});


// SMOOTH ANCHOR NAVIGATION
document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener("click", event => {
        const target = document.querySelector(link.getAttribute("href"));

        if (!target) return;

        event.preventDefault();

        target.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    });
});


// TOAST
let toastTimeout;

function showToast(message) {
    if (!toast) return;

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimeout);

    toastTimeout = setTimeout(() => {
        toast.classList.remove("show");
    }, 2800);
}


// TOOL BUTTONS
document.querySelectorAll("[data-tool]").forEach(button => {
    button.addEventListener("click", () => {
        const name = button.dataset.tool;

        showToast(`${name} — Coming to VEXONIQ soon.`);
    });
});


// SCROLL REVEAL
const revealElements = document.querySelectorAll(
    ".studio-intro, .department, .tools-heading, .tool-row, .statement h2, .about-content"
);

revealElements.forEach(element => {
    element.classList.add("reveal");
});

if ("IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("visible");
                revealObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.12
    });

    revealElements.forEach(element => {
        revealObserver.observe(element);
    });
} else {
    revealElements.forEach(element => {
        element.classList.add("visible");
    });
}


// CONSOLE BRANDING
console.log("%c VEXONIQ® ", "background:#d7ff35;color:#101010;font-size:20px;font-weight:bold;padding:10px;");
console.log("%c CREATIVE WITHOUT RULES.", "font-size:12px;color:#777;");
