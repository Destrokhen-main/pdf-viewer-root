import * as pdfjsLib from "pdfjs-dist";

import "pdfjs-dist/legacy/build/pdf.worker.entry.js";

import {
    PDFDocumentProxy,
} from "pdfjs-dist/types/src/display/api";

const global: any = window;

export class PdfController {
    private pdfBuffer?: ArrayBuffer;
    public pdfBlob?: Blob;
    public pdf?: PDFDocumentProxy;
    private url?: string;
    private preFrame?: number;
    public showAll: boolean = false;
    private scale = 1;
    public dpi = 300;

    private mainFrameElement: any = null;

    public firstPage = 1;

    private deb: any = null;

    constructor(
        private wrapper: HTMLElement,
        private loading: HTMLElement,
        private onError: (e: any) => void,
        private onSuccess: (pdf: PDFDocumentProxy) => void,
        private logger: (...args: string[]) => void
    ) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = global.pdfjsWorker;
    }

    init(url: string) {
        this.deb && clearTimeout(this.deb)
        this.deb = setTimeout(() => {
            if (this.url !== url) {
                this.url = url;
                this.clear();
                this.fetchData();
            }
        }, 200)
    }

    async fetchData() {
        try {
            const res = await fetch(this.url!);
            this.pdfBlob = await res.blob();
            this.pdfBuffer = await this.pdfBlob?.arrayBuffer();
            this.fetchPdf();
        } catch (e) {
            this.onError(e);
        }
    }

    fetchPdf() {
        const pdfDocConfig: Record<string, any> = {
            cMapPacked: true,
            data: this.pdfBuffer,
            cMapUrl: 'https://unpkg.com/browse/pdfjs-dist@2.2.228/cmaps/',
        };

        pdfjsLib
            .getDocument(pdfDocConfig)
            .promise.then((pdf) => {
                this.pdf = pdf;
                this.onSuccess(pdf);
                this.initPages();
            })
            .catch((e) => {
                this.onError(e);
            });
    }

    initPages() {
        if (this.showAll === true) {
            this.renderPdf();
        } else {
            this.renderPerPagePdf(this.firstPage);
        }
    }

    schedular(frameId?: number) {
        if (this.preFrame === undefined) {
            this.preFrame = frameId;
            if (this.showAll === true) {
                this.renderPdf();
            } else {
                this.renderPerPagePdf();
            }
        } else {
            this.preFrame = frameId;
        }
    }

    async renderPdf(num = 1) {
        this.loading.style.display = "flex";

        const printUnits = this.dpi / 72
        const styleUnits = 96 / 72
        this.logger('Render all page')
        if (this.pdf !== undefined) {
            if (num === 1) {
                this.clear();
            }

            const iframe: any = await this.createPrintIframe(this.wrapper);

            let viewport: any;

            let _width, _height;
            for (let i = 0; i !== this.pdf?.numPages; i++) {
                const page = await this.pdf!.getPage(i + 1);

                if (i === 0) {
                    viewport = page.getViewport({ scale: 1, rotation: 0 });
                    const sizeX = (viewport.width * printUnits) / styleUnits
                    const sizeY = (viewport.height * printUnits) / styleUnits

                    _width = Math.floor(viewport.width * printUnits)
                    _height = Math.floor(viewport.height * printUnits)

                    this.addPrintStyles(iframe, sizeX, sizeY)
                }

                const canvas = document.createElement("canvas");
                const context = canvas.getContext("2d");

                canvas.width = _width!;
                canvas.height = _height!;

                const canvasClone: any = canvas.cloneNode();

                canvasClone.style.marginBottom = "10px";

                const renderContext = {
                    transform: [printUnits, 0, 0, printUnits, 0, 0],
                    canvasContext: context!,
                    intent: 'print',
                    viewport: viewport,
                };

                await page.render(renderContext).promise;

                canvasClone.getContext('2d').drawImage(canvas, 0, 0)
                iframe.contentWindow.document.body.appendChild(canvasClone)

                if (i === 0) {
                    this.loading.style.display = "none";
                }
            }
        } else {
            this.onError("Ошибка, отсутствует pdf")
        }
        this.preFrame = undefined;
    }

    async renderPerPagePdf(num = 1) {
        const printUnits = this.dpi / 72
        const styleUnits = 96 / 72

        this.loading.style.display = "flex";
        this.logger("Render page", num.toString())
        if (this.pdf && num <= this.pdf.numPages) {
            const page = await this.pdf.getPage(num);
            this.clear();
            const viewport = page.getViewport({ scale: 1, rotation: 0 });

            const iframe: any = await this.createPrintIframe(this.wrapper);
            const sizeX = (viewport.width * printUnits) / styleUnits
            const sizeY = (viewport.height * printUnits) / styleUnits

            this.addPrintStyles(iframe, sizeX, sizeY)

            const canvas = document.createElement("canvas");
            const context = canvas.getContext("2d");

            canvas.width = Math.floor(viewport.width * printUnits);
            canvas.height = Math.floor(viewport.height * printUnits);

            const canvasClone: any = canvas.cloneNode();

            iframe.contentWindow.document.body.appendChild(canvasClone)

            let renderContext = {
                transform: [printUnits, 0, 0, printUnits, 0, 0],
                canvasContext: context!,
                intent: 'print',
                viewport: viewport,
            };

            await page.render(renderContext).promise;

            canvasClone.getContext('2d').drawImage(canvas, 0, 0)
            this.loading.style.display = "none";
        } else {
            this.onError("Ошибка, отсутствует pdf")
        }
        this.preFrame = undefined;
    }

    addPrintStyles(iframe: any, sizeX: any, sizeY: any) {
        const style = iframe.contentWindow.document.createElement('style')
        style.textContent = `
          @page {
            margin: 0;
            size: ${sizeX}pt ${sizeY}pt;
          }
          body {
            margin: 0;
          }
          canvas {
            width: 100%;
            page-break-after: always;
            page-break-before: avoid;
            page-break-inside: avoid;
          }
        `
        iframe.contentWindow.document.head.appendChild(style)
        iframe.contentWindow.document.body.style.width = '100%'
    }

    createPrintIframe(node: HTMLElement) {
        return new Promise((resolve) => {
            const iframe = document.createElement('iframe')
            iframe.style.width = '100%'
            iframe.style.flex = '1';
            iframe.style.border = 'none'
            iframe.style.overflow = 'hidden'
            iframe.onload = function() {
                resolve(iframe)
            }
            node.appendChild(iframe);
        })
    }

    // 1 - show by page
    // 2 - show all
    changeMod(mode: number, page: number = -1) {
        if (mode === 1 && this.showAll === true) {
            this.showAll = false;
            if (page !== -1) {
                this.renderPerPagePdf(page);
            } else {
                this.renderPerPagePdf();
            }
        } else if (mode === 2 && this.showAll === false) {
            this.showAll = true;
            this.renderPdf();
        }
    }

    clear() {
        this.wrapper.innerHTML = "";
        this.wrapper.append(this.loading);
    }

    abort() {
        this.deb && clearTimeout(this.deb)
    }

    rerender(num = 1) {
        if (this.showAll === true) {
            this.renderPdf(num);
        } else {
            this.renderPerPagePdf(num);
        }
    }
}
