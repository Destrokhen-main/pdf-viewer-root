import { PDFDocumentProxy } from "pdfjs-dist/types/src/display/api";

import { PdfController } from "./pdf";

class PdfView extends HTMLElement {
    public controller?: PdfController;
    private wrapper: HTMLElement;
    private frameId?: number;
    private pageUser: number = 0;

    private deb: null | ReturnType<typeof setTimeout> = null;

    constructor() {
        super();

        const shadow = this.attachShadow({ mode: "open" });

        const loader = document.createElement("div");
        loader.classList.add('loader-wrapper');

        this.wrapper = document.createElement("div");
        this.wrapper.classList.add("pdf-wrapper")
        this.wrapper.appendChild(loader);
        
        const style = document.createElement("style");

        style.innerHTML = ` 
            .pdf-wrapper {
                display: flex;
                flex-direction: column;
                justify-content: center;
                align-items: center;
                gap: 10px;
                position: relative;
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
        shadow.appendChild(style);
        shadow.appendChild(this.wrapper);

        this.controller = new PdfController(
            this.wrapper,
            loader,
            (e) => this.onError(e),
            (pdf) => this.onSuccess(pdf)
        );

        window.addEventListener("resize", this.sizeObserver.bind(this));
    }

    sizeObserver() {
        this.frameId && window.cancelAnimationFrame(this.frameId);
        this.frameId = window.requestAnimationFrame(async () => {
            await this.controller?.schedular(this.frameId);
        });
    }

    onError(e: any) {
        this.dispatchEvent(new CustomEvent("onError", { detail: e }));
    }

    onSuccess(pdf: PDFDocumentProxy) {
        this.dispatchEvent(new CustomEvent("onSuccess", { detail: pdf }));
    }

    connectedCallback() {
        const style = this.getAttribute("style") ?? "";
        this.wrapper.setAttribute("style", style);
    }

    disconnectedCallback() {
        window.removeEventListener("resize", this.sizeObserver);
        this.frameId && window.cancelAnimationFrame(this.frameId);
    }

    static get observedAttributes() {
        return ["url", "page", "mode", "scale"];
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        if (name === "url") {
            this.controller?.init(newValue);
        }

        if (name === "mode" && this.controller !== undefined) {
            this.controller.changeMod(parseInt(newValue, 10), this.pageUser !== 0 ? this.pageUser : -1);
        }

        if (name === "page" && this.controller !== undefined && newValue !== oldValue) {
            if (this.deb !== null) clearTimeout(this.deb); 

            this.deb = setTimeout(() => {
                this.changePage(parseInt(newValue, 10))
                this.pageUser = parseInt(newValue, 10) - 1;
            }, 200)
        }

        if (name === "scale" && this.controller !== undefined && newValue !== oldValue) {
            this.controller.changeScale(parseInt(newValue), this.pageUser !== 0 ? this.pageUser : -1);
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
        // page in pdf start on 0
        this.controller!.renderPerPagePdf(page - 1)
    }

    changeMod(mode: number) {
        if (this.controller !== undefined) {
            this.controller.changeMod(mode);
        }
    }
}

customElements.define("pdf-viewer-root", PdfView);
