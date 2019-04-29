/// <reference path="../d.ts/common.d.ts" />
/// <reference types="jquery" />
/// <reference path="../d.ts/popper.d.ts" />
/// <reference path="../d.ts/bootstrap.d.ts" />

namespace SSLCertChecker {
    export var TARGET_CGI: string = "./GetSSLCertStatus.cgi";

    /**
     * @class Inqueryer
     * @classdesc CGIからSSL証明書期限データをJSONで受け取る
     * なるべく処理に引っ張られないようにする為に非同期処理する
     */
    export class Inqueryer {
        private static _status: "ready" | "ok" | "ng" = "ready";
        private static _result: SSLCertStatusJson = null;

        constructor() {
            throw new Error("Inqueryer is static class.");
        }

        public static inquery(callback: Function = null): void {
            try {
                let options = {
                    type: "POST",
                    url: TARGET_CGI,
                    cache: false,
                    dataType: "json",
                    async: true
                };
                console.log("inquery to " + TARGET_CGI);
                // send ajax request async
                jQuery
                    .ajax(options)
                    .done((data: SSLCertStatusJson) => {
                        this._status = "ok";
                        this._result = data;
                        console.log("success to inquery. status: " + this._status);

                        if (callback) {
                            callback(data);
                        }
                    })
                    .fail(data => {
                        this._status = "ng";
                        this._result = null;
                        console.error("failed to inquery. status: " + this._status);
                        console.error(JSON.stringify(data));

                        if (callback) {
                            callback(null);
                        }
                    });
            } catch (e) {
                this._status = "ng";
                this._result = null;
                console.error("failed to inquery.");
                console.error(e.message);
                console.error(e.stack);
            }
        }

        private static getDateString(iso8601str: string): string {
            if (!iso8601str) {
                return "-";
            }

            let ret = "";

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

            function _getTimeZoneStr(d: Date): string {
                let num = Math.abs((d.getTimezoneOffset() * 100) / 60);
                // 何故か逆なので注意
                let polarity = d.getTimezoneOffset() > 0 ? "-" : "+";
                return polarity + _paddingStr(num, "0", 4);
            }

            try {
                let d = new Date(iso8601str);
                ret += _paddingStr(d.getFullYear(), "0", 4);
                ret += "/" + _paddingStr(d.getMonth() + 1, "0", 2);
                ret += "/" + _paddingStr(d.getDate(), "0", 2);
                ret += " " + _paddingStr(d.getHours(), "0", 2);
                ret += ":" + _paddingStr(d.getMinutes(), "0", 2);
                ret += ":" + _paddingStr(d.getSeconds(), "0", 2);
                ret += " " + _getTimeZoneStr(d);
            } catch (e) {
                // 失敗したらそのままにしておく
                ret = iso8601str;
            }
            return ret;
        }

        public static getCertStatusList(): SSLCertStatus[] {
            if (!this._result) {
                return [];
            }
            // 可読性の為に時間を ISO 8601 から読みやすい形式に戻す
            var ret: SSLCertStatus[] = [];
            for (var i = 0; i < this._result.results.length; i++) {
                let target = this._result.results[i];
                var _temp: SSLCertStatus = {
                    hostname: target.hostname,
                    status: target.status,
                    sdate: this.getDateString(target.sdate),
                    edate: this.getDateString(target.edate),
                    version: target.version
                };
                ret.push(_temp);
            }
            return ret;
        }

        static get data(): SSLCertStatusJson {
            return this._result;
        }

        static get status(): string {
            return this._status;
        }
    }

    /**
    @class UIManager
    @classdesc 動的なUI(DOM)の操作を行うクラス
    */
    export class UIManager {
        private static TABLE_ID: string = "ssl-cert-status";
        private static LOADING_ID: string = "loading";

        private static DATATABLES_JP = {
            sProcessing: "処理中...",
            sLengthMenu: "_MENU_ 件表示",
            sZeroRecords: "データはありません。",
            sInfo: " _TOTAL_ 件中 _START_ から _END_ まで表示",
            sInfoEmpty: " 0 件中 0 から 0 まで表示",
            sInfoFiltered: "（全 _MAX_ 件より抽出）",
            sInfoPostFix: "",
            sSearch: "検索:",
            sUrl: "",
            oPaginate: {
                sFirst: "先頭",
                sPrevious: "前",
                sNext: "次",
                sLast: "最終"
            }
        };

        constructor() {
            throw new Error("Inqueryer is static class.");
        }

        public static showLoading(showed: boolean): void {
            var loading: JQuery = jQuery("#" + this.LOADING_ID);
            if (showed) {
                loading.addClass("loaded");
            } else {
                loading.removeClass("loaded");
            }
        }

        public static initDataTables(): void {
            jQuery.extend(jQuery.fn.dataTable.defaults, {
                language: this.DATATABLES_JP
            });
        }

        public static setTableRow(datas: SSLCertStatus[]): void {
            var table: JQuery = jQuery("#" + this.TABLE_ID);
            table.DataTable({
                data: datas,
                columns: [{ data: "hostname" }, { data: "status" }, { data: "sdate" }, { data: "edate" }],
                scrollCollapse: true,
                pageLength: 50,
                rowCallback: (row: Node, data: SSLCertStatus) => {
                    switch (data.status) {
                        case "valid":
                            jQuery(row).addClass("valid");
                            break;
                        case "warn":
                            jQuery(row).addClass("warn");
                            break;
                        case "expired":
                            jQuery(row).addClass("expired");
                            break;
                        default:
                            jQuery(row).addClass("unknown");
                            break;
                    }
                }
            });
        }

        public static clearTable(): void {
            var tbody: JQuery = jQuery("#" + this.TABLE_ID + " tbody");
            tbody.empty();
        }
    }

    /**
     * 各種状態の更新
     * @param json {SSLCertStatusJson}
     */
    export function update(json: SSLCertStatusJson): void {
        UIManager.clearTable();
        UIManager.showLoading(true);
        if (!json) {
            return;
        }
        let datas = Inqueryer.getCertStatusList();
        UIManager.setTableRow(datas);
    }

    /**
     * めいん関数
     * DOMのロードが完了後に実行する
     */
    export function main(): void {
        jQuery("[data-toggle='tooltip'").tooltip();
        UIManager.initDataTables();
        Inqueryer.inquery(update);
    }

    document.addEventListener("DOMContentLoaded", () => {
        SSLCertChecker.main();
    });
}
