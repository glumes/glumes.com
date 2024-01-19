
function setupPanelToggles() {
    // register closing animation of inline toc
    const toc = document.getElementById("TableOfContents-inline");
    if (toc) {
        const toc_panel = toc.parentElement.parentElement;
        toc_panel.addEventListener("click", function(e) {
            if (toc_panel.hasAttribute("open")) {
                e.preventDefault();
                toc_panel.classList.add("closing");
                setTimeout(() => {
                    toc_panel.removeAttribute("open");
                    toc_panel.classList.remove("closing");
                }, 300); // animation in css is 400ms, set smaller to make sure closing before animation finished
            }
        });
    }

    document.querySelectorAll("details.article-notice").forEach(notice => {
        // register closing animation of notice panels
        notice.querySelector("summary").addEventListener("click", function(e) {
            if (notice.hasAttribute("open")) {
                e.preventDefault();
                notice.classList.add("closing");
                setTimeout(() => {
                    notice.removeAttribute("open");
                    notice.classList.remove("closing");
                }, 300);
            }
        });

        // register copy button behavior
        const button_copy = notice.querySelector("div.panel-button[data-action='copy']");
        if (button_copy) {
            button_copy.addEventListener("click", e => {
                // don't fold the panel
                e.preventDefault();
                e.stopPropagation();
    
                const animate = () => {
                    button_copy.classList.add("is-active");

                    setTimeout(() => {
                        button_copy.classList.remove("is-active");
                    }, 2000);
                };

                const code = notice.querySelector('code[data-lang]');
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
        const button_lineno = notice.querySelector("div.panel-button[data-action='number']");
        if (button_lineno) {
            button_lineno.addEventListener("click", function(e) {
                // don't fold the panel
                e.preventDefault();
                e.stopPropagation();
    
                notice.classList.toggle("code-hide-lineno");
            });
        }
    });
}

export { setupPanelToggles };