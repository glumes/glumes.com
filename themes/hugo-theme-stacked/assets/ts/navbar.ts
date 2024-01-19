
const TOGGLE_CLOSE_ID = "toggle-sidebar-close";
const TOGGLE_OPEN_ID = "toggle-sidebar-open";

function closeRightSidebar() {
    const sidebar = document.querySelector(".right-sidebar");
    const toc = document.getElementById("TableOfContents");
    const toc_section = toc.parentElement.parentElement;

    toc.style.display = "none";
    toc_section.style.opacity = "50%";

    sidebar.classList.remove("right-sidebar");
    sidebar.classList.add("right-sidebar--compact");
}

function openRightSidebar() {
    const sidebar = document.querySelector(".right-sidebar--compact");
    const toc = document.getElementById("TableOfContents");
    const toc_section = toc.parentElement.parentElement;

    toc.style.removeProperty("display");
    toc_section.style.removeProperty("opacity");

    sidebar.classList.remove("right-sidebar--compact");
    sidebar.classList.add("right-sidebar");
}

function setupRightbarToggle() {
    document.getElementById(TOGGLE_CLOSE_ID).addEventListener("click", e => closeRightSidebar());
    document.getElementById(TOGGLE_OPEN_ID).addEventListener("click", e => openRightSidebar());
}

let lastScrollTop = 0;
let navbarVisible = false;
function updateNavbarVisibility() {
    const navbar = document.querySelector(".bottom-navbar-container") as HTMLElement;
    const top = window.pageYOffset || document.documentElement.scrollTop;
    if (top < lastScrollTop) {
        if (!navbarVisible) {
            navbar.style.bottom = "16px";
            navbarVisible = true;
        }
    } else {
        if (navbarVisible) {
            navbar.style.bottom = "-64px";
            navbarVisible = false
        }
    }
    lastScrollTop = top;
}

function setupBottomNavbar() {
    window.addEventListener("scroll", e => updateNavbarVisibility());
}

export { setupRightbarToggle, setupBottomNavbar };
