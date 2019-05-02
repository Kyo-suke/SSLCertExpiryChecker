/// <reference path="../d.ts/common.d.ts" />
/// <reference path="./Main.ts" />
/// <reference path="./Inqueryer.ts" />
/// <reference types="jquery" />

namespace SSLCertChecker {
    /**
     * @class CSVDownloader
     * @classdesc SSL証明書の期限をcsvで保存する
     */
    export class CSVDownloader {
        private static readonly ELEMENT_ID: string = "csv-downloader";
        private static readonly DEFAULT_FILENAME: string = "%d_%t.csv";
        private static readonly REVOKE_TIMEOUT: number = 5000;

        private static readonly BOM: Uint8Array = new Uint8Array([0xef, 0xbb, 0xbf]);

        constructor() {
            throw new Error("Downloader is static class.");
        }

        private static _makeCSVBlob(mimeType?: string, withBOM?: boolean, lineFeedCodeType?: LineFeedCodeType): Blob {
            if (!mimeType) {
                mimeType = "text/csv";
            }
            if (typeof withBOM !== typeof true) {
                withBOM = true;
            }
            if (!lineFeedCodeType) {
                lineFeedCodeType = "crlf";
            }

            try {
                // get current showed ssl cert status
                var certStatusList: SSLCertStatus[] = Inqueryer.getCertStatusList();
                var contents: any[] = [];
                if (withBOM) {
                    contents.push(this.BOM);
                }
                let lineFeedCode: string = this._getLineFeedCode(lineFeedCodeType);

                var header: string = ["ホスト名", "証明書状態", "期限開始日", "期限終了日"].join(",");
                contents.push(header + lineFeedCode);

                for (let i = 0; i < certStatusList.length; i++) {
                    let _target = certStatusList[i];
                    let _temp = [_target.hostname, _target.status, _target.sdate, _target.edate].join(",");
                    contents.push(_temp + lineFeedCode);
                }
                var blob: Blob = new Blob(contents, { type: mimeType });
            } catch (e) {
                console.error("failed to make blob.");
                console.error(e.message);
                console.error(e.stack);
            }
            return blob;
        }

        private static _getLineFeedCode(lineFeedCodeType: LineFeedCodeType): string {
            let ret = "";
            switch (lineFeedCodeType) {
                case "cr":
                    ret = "\r";
                    break;
                case "lf":
                    ret = "\n";
                    break;
                case "crlf":
                    ret = "\r\n";
                    break;
                default:
                    throw new Error("Invalid linefeed code.");
            }
            return ret;
        }

        private static _getFilename(filenameBase?: string): string {
            function _paddingStr(target: string | number, paddingChar: string, length: number): string {
                let ret = "";
                try {
                    let paddingStr: string = new Array(length + 1).join(paddingChar.slice(0, 1));
                    ret = (paddingStr + target).slice(-1 * length);
                } catch (e) {
                    ret = "" + <string>target;
                }
                return ret;
            }

            if (!filenameBase) {
                filenameBase = this.DEFAULT_FILENAME;
            }
            let filename = filenameBase;
            let date = new Date();
            let d = [_paddingStr(date.getFullYear(), "0", 4), _paddingStr(date.getMonth() + 1, "0", 2), _paddingStr(date.getDate(), "0", 2)].join("");
            filename = filename.replace("%d", d);
            let t = [_paddingStr(date.getHours(), "0", 2), _paddingStr(date.getMinutes(), "0", 2), _paddingStr(date.getSeconds(), "0", 2)].join("");
            filename = filename.replace("%t", t);
            return filename;
        }

        /**
         * csvのダウンロード処理を行う
         * 取得したSSL証明書の状態をcsv化し、ブラウザからダウンロードする
         * @param [filenameBase] 保存ファイル名。指定しない場合はデフォルト名が利用される
         * @param [mimeType="text/csv"] 保存ファイルのMIMEタイプ
         * @param [withBOM=true] 保存ファイルにBOMを付与するか
         * @param [lineFeedCodeType="crlf"] 改行コード("cr" | "lf" | "crlf")
         */
        public static download(filenameBase?: string, mimeType?: string, withBOM?: boolean, lineFeedCodeType?: LineFeedCodeType): void {
            let blob = this._makeCSVBlob(mimeType, withBOM, lineFeedCodeType);
            let filename = this._getFilename(filenameBase);

            // for Internet Explorer
            if (navigator.msSaveBlob) {
                navigator.msSaveBlob(blob, filename);
                return;
            }

            // create html link element
            var url: string = null;
            try {
                let element = this._createLinkElement();
                url = URL.createObjectURL(blob);
                this._setAttributes(element, filename, url);

                // download
                element.click();

                // revoke url on download after
                setTimeout(() => {
                    this._revoke(url);
                }, this.REVOKE_TIMEOUT);
            } catch (e) {
                console.error("failed to download.");
                console.error(e.meesage);
                console.error(e.stack);
                this._removeLinkElement();
                if (url) {
                    this._revoke(url);
                }
            }
        }

        private static _revoke(url: string): void {
            URL.revokeObjectURL(url);
            this._removeLinkElement();
        }

        private static _createLinkElement(): HTMLAnchorElement {
            let element = <HTMLAnchorElement>document.querySelector("#" + this.ELEMENT_ID);
            if (element) {
                this._removeLinkElement();
            }
            let a = document.createElement("a");
            a.setAttribute("id", this.ELEMENT_ID);
            a.setAttribute("download", "");
            a.setAttribute("target", "_blank");
            a.setAttribute("href", "");
            a.setAttribute("style", "display: block; visibility: hidden; width: 0; height: 0;");
            return document.body.appendChild(a);
        }

        private static _removeLinkElement(): void {
            let element = document.querySelector("#" + this.ELEMENT_ID);
            if (element) {
                document.body.removeChild(element);
            }
        }

        private static _setAttributes(element: Element, filename: string, href: string): HTMLAnchorElement {
            element.setAttribute("download", filename);
            element.setAttribute("href", href);
            return <HTMLAnchorElement>element;
        }
    }
}
