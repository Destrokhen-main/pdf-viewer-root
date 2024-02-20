import { PDFDocumentProxy } from "pdfjs-dist/types/src/display/api";

import { PdfController } from "./pdf";

function createLoadingElement() {
    // @ts-ignore
    const parent = this

    const loader = document.createElement("div");
    loader.classList.add('loader-wrapper');
    const el = document.createElement('div');
    el.innerText = "loading...";
    parent.loadingElement = el
    loader.appendChild(el)

    return loader
}

function createStyles() {
    const style = document.createElement("style");

    style.innerHTML = ` 
        .pdf-wrapper {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            gap: 10px;
            position: relative;
            height: 100%;
            overflow: auto;
        }

        .loader-wrapper {
            display: flex;
            justify-content: center;
            align-items:center;
            height: 100%;
            animation: 3s infinite linear loading;
            opacity: 0.8;
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
        }

        @keyframes loading {
            0%, 100% {
                background-color:#fbfbfb
            }
            50% {
                background-color:#c9c9c9
            }
        }
    `

    return style
}

class PdfView extends HTMLElement {
    public controller?: PdfController;
    private wrapper: HTMLElement | null = null;
    private frameId?: number;
    private pageUser: number = 0;

    private isDebag : boolean = false;

    private deb: null | ReturnType<typeof setTimeout> = null;

    private debounce : any = null;
    private loadingElement: any = null;

    private url: string | null = null;

    constructor() {
        super();
    }

    sizeObserver() {
        this.frameId && window.cancelAnimationFrame(this.frameId);
        this.debounce && clearTimeout(this.debounce);

        this.debounce = setTimeout(() => {
            this.frameId = window.requestAnimationFrame(() => {
                this.controller?.schedular(this.frameId);
            });
        }, 500)
    }

    onError(e: any) {
        this.dispatchEvent(new CustomEvent("onError", { detail: e }));
    }

    onSuccess(pdf: PDFDocumentProxy) {
        this.dispatchEvent(new CustomEvent("onSuccess", { detail: pdf }));
    }

    connectedCallback() {
        const isDebag = this.getAttribute('debug') ?? null
        if (isDebag) {
            const _v = isDebag === 'true';
            this.isDebag = _v;
        }

        const shadow = this.attachShadow({ mode: "open" });

        const loader = createLoadingElement.call(this)

        this.wrapper = document.createElement("div");
        this.wrapper.classList.add("pdf-wrapper")
        this.wrapper.appendChild(loader);
        
        shadow.appendChild(createStyles());
        shadow.appendChild(this.wrapper);

        this.controller = new PdfController(
            this.wrapper,
            loader,
            (e) => this.onError(e),
            (pdf) => this.onSuccess(pdf),
            (...atr) => this.logger(...atr)
        );
        window.addEventListener("resize", this.sizeObserver);
        const loadingText = this.getAttribute("loadingtext") ?? null;
        if (loadingText !== null) {
            this.loadingElement.innerText = loadingText
        }

        const dpi = this.getAttribute("dpi") ?? null
        if (dpi) {
            this.controller.dpi = parseInt(dpi, 10)
        }

        const mode = this.getAttribute("mode") ?? null
        if (mode) {
            this.controller.showAll = parseInt(mode, 10) === 2;
        }

        const url = this.getAttribute("url") ?? null
        const _page = this.getAttribute("page") ?? null
        if (url !== null && this.url !== url) {
            this.logger('Init', url);
            this.controller?.init(url)
            this.url = url;

            if (_page) {
                const page = parseInt(_page, 10)
                this.controller.firstPage = this.pageUser = page;
            }
        }
    }

    disconnectedCallback() {
        window.removeEventListener("resize", this.sizeObserver);
        this.controller?.clear()
        this.controller?.abort()
        this.debounce && clearTimeout(this.debounce)
        this.deb && clearTimeout(this.deb)
        this.frameId && window.cancelAnimationFrame(this.frameId);
        this.wrapper?.remove()
    }

    static get observedAttributes() {
        return ["url", "page", "mode", "scale", "dpi", "loadingtext"];
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        this.logger('change attr', name, ', old', oldValue, ', new', newValue)

        if (this.controller !== undefined) {
            if (name === "url" && this.url !== newValue) {
                this.controller?.init(newValue);
                this.url = newValue;
            }

            if (name === "mode" && oldValue !== newValue) {
                this.controller.changeMod(parseInt(newValue, 10), this.pageUser !== 0 ? this.pageUser : -1);
            }

            if (name === "page" && newValue !== oldValue) {
                if (this.deb !== null) clearTimeout(this.deb); 

                this.deb = setTimeout(() => {
                    const page = parseInt(newValue, 10)
                    this.changePage(page)
                    this.pageUser = page;
                }, 200)
            }

            if (name === "dpi" && newValue !== oldValue) {
                this.controller.dpi = parseInt(newValue, 10);
                this.controller.rerender(this.pageUser !== 1 ? this.pageUser : 1);
            }
        }

        if (name === "loadingtext" && this.loadingElement !== null && newValue !== oldValue) {
            this.loadingElement.innerText = newValue
        }
    }

    downLoad() {
        if (this.controller?.pdfBlob) {
            const a = document.createElement("a");
            const url = window.URL.createObjectURL(this.controller?.pdfBlob);
            a.href = url;

            a.download =
                this.getAttribute("fileName") ?? "fileName";
            a.click();
            window.URL.revokeObjectURL(url);
        }
    }

    changePage(page: number) {
        this.controller!.renderPerPagePdf(page)
    }

    logger(...text: string[]) {
        if (this.isDebag) {
            console.log('[PDF-Viewer]', ...text);
        }
    }
}

customElements.define("pdf-viewer-root", PdfView);
