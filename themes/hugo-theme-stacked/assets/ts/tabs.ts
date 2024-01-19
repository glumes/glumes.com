
const CODE_ACTIVE_CLASS = 'code-tab-active';

function switchTab(btn: HTMLLIElement) {
    const tabGroup = btn.getAttribute("data-tab-group");
    const tabId = btn.getAttribute("data-tab-item");
    const allTabItems = document.querySelectorAll("[data-tab-group='"+tabGroup+"']");
    const targetTabItems = document.querySelectorAll("[data-tab-group='"+tabGroup+"'][data-tab-item='"+tabId+"']");

    // show tool button if necessary
    const panel = btn.parentElement.parentElement.parentElement.parentElement;
    if (btn.classList.contains('code-item')) {
        panel.classList.add(CODE_ACTIVE_CLASS);
    } else {
        panel.classList.remove(CODE_ACTIVE_CLASS);
    }

    // save button position relative to viewport
    var yposButton = btn.scrollTop;

    allTabItems.forEach(item => item.classList.remove("is-active"));
    targetTabItems.forEach(item => item.classList.add("is-active"));

    // reset screen to the same position relative to clicked button to prevent page jump
    var yposButtonDiff = btn.scrollTop - yposButton;
    window.scrollTo(window.scrollX, window.scrollY + yposButtonDiff);
}

const navButtonsQuery = "li.tab-nav-item";

function setupTabSwitchers() {
    document.querySelectorAll(navButtonsQuery).forEach(btn => {
        btn.addEventListener("click", e => switchTab(btn as HTMLLIElement));
    });
}

function setupTabToggles() {
    document.querySelectorAll("div.tab-panel").forEach(panel => {
        // register copy button behavior
        const button_copy = panel.querySelector("div.panel-button[data-action='copy']");
        if (button_copy) {
            button_copy.addEventListener("click", function(e) {
                const active_tab = panel.querySelector(".tab-item.is-active");

                const animate = () => {
                    button_copy.classList.add("is-active");

                    setTimeout(() => {
                        button_copy.classList.remove("is-active");
                    }, 2000);
                };

                const code = active_tab.querySelector('code[data-lang]');
                if (!code) return;
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(code.textContent)
                    .then(animate)
                    .catch(err => alert(err));
                } else {
                    console.log("Tried to copy " + code.textContent.length + " chars, this is a no-op.");
                    // animate()
                }
            });
        }

        // register number button behavior
        const button_lineno = panel.querySelector("div.panel-button[data-action='number']");
        if (button_lineno) {
            button_lineno.addEventListener("click", function(e) {
                panel.classList.toggle("code-hide-lineno");
            });
        }
    });
}

export { setupTabSwitchers, setupTabToggles };
