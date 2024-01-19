/*!
*   Hugo Theme Stack
*
*   @author: Jimmy Cai
*   @website: https://jimmycai.com
*   @link: https://github.com/CaiJimmy/hugo-theme-stack
*/
import StackGallery from "ts/gallery";
import { getColor } from 'ts/color';
import menu from 'ts/menu';
import createElement from 'ts/createElement';
import StackColorScheme from 'ts/colorScheme';
import { setupScrollspy } from 'ts/scrollspy';
import { setupSmoothAnchors } from "ts/smoothAnchors";
import { setupTabSwitchers, setupTabToggles } from "ts/tabs";
import { setupRightbarToggle, setupBottomNavbar } from "ts/navbar";
import { setupPanelToggles } from "ts/panel";

let Stack = {
    init: () => {
        /**
         * Bind menu event
         */
        menu();

        const articleContent = document.querySelector('.article-content') as HTMLElement;
        if (articleContent) {
            new StackGallery(articleContent);
            setupSmoothAnchors();
            setupScrollspy();

            /**
             * Register panel open toggles
             */
            setupPanelToggles();

            /**
             * Register click events for tabbed navigation buttons
             */
            setupTabSwitchers();
            setupTabToggles();
        }

        /**
         * Add linear gradient background to tile style article
         */
        const articleTile = document.querySelector('.article-list--tile');
        if (articleTile) {
            let observer = new IntersectionObserver(async (entries, observer) => {
                entries.forEach(entry => {
                    if (!entry.isIntersecting) return;
                    observer.unobserve(entry.target);

                    const articles = entry.target.querySelectorAll('article.has-image');
                    articles.forEach(async articles => {
                        const image = articles.querySelector('img'),
                            imageURL = image.src,
                            key = image.getAttribute('data-key'),
                            hash = image.getAttribute('data-hash'),
                            articleDetails: HTMLDivElement = articles.querySelector('.article-details');

                        const colors = await getColor(key, hash, imageURL);

                        articleDetails.style.background = `
                        linear-gradient(0deg, 
                            rgba(${colors.DarkMuted.rgb[0]}, ${colors.DarkMuted.rgb[1]}, ${colors.DarkMuted.rgb[2]}, 0.5) 0%, 
                            rgba(${colors.Vibrant.rgb[0]}, ${colors.Vibrant.rgb[1]}, ${colors.Vibrant.rgb[2]}, 0.75) 100%)`;
                    })
                })
            });

            observer.observe(articleTile)
        }


        /**
         * Add copy ability to language markers in the code block
        */
        const codeblocks = document.querySelectorAll('.article-content div.codeblock');
        codeblocks.forEach(block => {
            const code = block.querySelector('code[data-lang]');
            if (!code) return;

            const lang = block.querySelector('div.code-lang')
            if (!lang) return;

            const animate = () => {
                lang.textContent = `COPIED`;

                setTimeout(() => {
                    lang.textContent = lang_text;
                }, 2000);
            };

            const lang_text = lang.textContent
            lang.addEventListener('click', () => {
                if (navigator.clipboard) {
                    navigator.clipboard.writeText(code.textContent)
                        .then(animate)
                        .catch(err => alert(err));
                } else {
                    console.log("Tried to copy " + code.textContent.length + " chars, this is a no-op.")
                    // animate();
                }
            });
        });

        /**
         * Register click events for tabbed navigation buttons
         */
        setupTabSwitchers();
        setupTabToggles();
        
        /**
         * Register click event for the right sidebar toggle
         */
        setupRightbarToggle();

        /**
         * Register scroll handler for the bottom navbar
         */
        setupBottomNavbar();

        /**
         * Register theme switch
         */
        new StackColorScheme(document.getElementById('dark-mode-toggle'));
    }
}

window.addEventListener('load', () => {
    setTimeout(function () {
        Stack.init();
    }, 0);
})

declare global {
    interface Window {
        createElement: any;
        Stack: any
    }
}

window.Stack = Stack;
window.createElement = createElement;