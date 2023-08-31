import * as pdfjsLib from "pdfjs-dist";

import "pdfjs-dist/legacy/build/pdf.worker.entry.js";

import {
    PDFDocumentProxy,
    PDFPageProxy,
} from "pdfjs-dist/types/src/display/api";

const global: any = window;

export class PdfController {
    private pdfBuffer?: ArrayBuffer;
    public pdfBlob?: Blob;
    public pdf?: PDFDocumentProxy;
    private url?: string;
    private preFrame?: number;
    private showAll: boolean = false;
    private scale = 1;
    public dpi = 300;

    constructor(
        private wrapper: HTMLElement,
        private loading: HTMLElement,
        private onError: (e: any) => void,
        private onSuccess: (pdf: PDFDocumentProxy) => void
    ) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = global.pdfjsWorker;
    }

    async init(url: string) {
        this.url = url;
        await this.fetchData();
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

    async fetchPdf() {
        const pdfDocConfig: Record<string, any> = {
            cMapPacked: true,
            rangeChunkSize: 65536,
            pdfBug: false,
            useSystemFonts: true,
            data: this.pdfBuffer,
        };

        pdfjsLib
            .getDocument(pdfDocConfig)
            .promise.then(async (pdf) => {
                this.pdf = pdf;
                this.onSuccess(pdf);
                await this.initPages();
            })
            .catch((e) => {
                this.onError(e);
            });
    }

    async initPages() {
        if (this.showAll === true) {
            this.renderPdf();
        } else {
            this.renderPerPagePdf();
        }
    }

    async schedular(frameId?: number) {
        if (this.preFrame === undefined) {
            this.preFrame = frameId;
            if (this.showAll === true) {
                await this.renderPdf();
            } else {
                await this.renderPerPagePdf();
            }
        } else {
            this.preFrame = frameId;
        }
    }

    async renderPdf(num = 1) {
        this.loading.style.display = "flex";

        const printUnits = this.dpi / 72
        const styleUnits = 96 / 72

        const allPages = new Array(this.pdf?.numPages).fill(0);

        if (this.pdf !== undefined) {
            if (num === 1) {
                this.clear();
            }

            const iframe: any = await this.createPrintIframe(this.wrapper);

            await Promise.all(
                allPages.map(async (_, index) => {
                    const page = await this.pdf!.getPage(index + 1);
                    const viewport = page.getViewport({ scale: 1, rotation: 0 });

                    if (index === 0) {
                        const sizeX = (viewport.width * printUnits) / styleUnits
                        const sizeY = (viewport.height * printUnits) / styleUnits

                        this.addPrintStyles(iframe, sizeX, sizeY)
                    }

                    const canvas = document.createElement("canvas");
                    const context = canvas.getContext("2d");

                    canvas.width = Math.floor(viewport.width * printUnits);
                    canvas.height = Math.floor(viewport.height * printUnits);

                    const canvasClone: any = canvas.cloneNode();

                    canvasClone.style.marginBottom = "10px";

                    iframe.contentWindow.document.body.appendChild(canvasClone)

                    let renderContext = {
                        transform: [printUnits, 0, 0, printUnits, 0, 0],
                        canvasContext: context!,
                        intent: 'print',
                        viewport: viewport,
                    };

                    await page.render(renderContext).promise;

                    this.loading.style.display = "none";
                    canvasClone.getContext('2d').drawImage(canvas, 0, 0)
                })
            )
        }
    }

    async renderPerPagePdf(num = 1) {

        const printUnits = this.dpi / 72
        const styleUnits = 96 / 72

        this.loading.style.display = "flex";
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

            this.loading.style.display = "none";
            canvasClone.getContext('2d').drawImage(canvas, 0, 0)
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

    changeScale(percent: number, page = -1) {
        this.scale = percent / 100;

        if (this.showAll === true) {
            this.renderPdf();
        } else {
            if (page !== -1) {
                this.renderPerPagePdf(page);
            } else {
                this.renderPerPagePdf();
            }
            
        }
    }

    clear() {
        this.wrapper.innerHTML = "";
        this.wrapper.append(this.loading);
    }


    rerender(num = 1) {
        if (this.showAll === true) {
            this.renderPdf(num);
        } else {
            this.renderPerPagePdf(num);
        }
    }
}
