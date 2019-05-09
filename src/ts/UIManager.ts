/// <reference path="../d.ts/common.d.ts" />
/// <reference path="./Main.ts" />
/// <reference path="./Inqueryer.ts" />
/// <reference types="jquery" />
/// <reference path="../d.ts/popper.d.ts" />
/// <reference path="../d.ts/bootstrap.d.ts" />

namespace SSLCertChecker {
    /**
    @class UIManager
    @classdesc 動的なUI(DOM)の操作を行うクラス
    */
    export class UIManager {
        private static TABLE_ID: string = "ssl-cert-status";
        private static LOADING_ID: string = "loading";
        private static CSV_DOWNLOAD_BUTTON_ID: string = "csv-download-button";
        private static RELOAD_BUTTON_ID: string = "reload-button";

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

        public static initialize(): void {
            this.unbind();
            this.bind();
            jQuery("[data-toggle='tooltip'").tooltip();
            this.initDataTables();
        }

        private static bind(): void {
            jQuery("#" + this.CSV_DOWNLOAD_BUTTON_ID).on("click", () => {
                CSVDownloader.download();
            });
            jQuery("#" + this.RELOAD_BUTTON_ID).on("click", () => {
                window.location.reload();
            });
        }

        private static unbind(): void {
            jQuery("#" + this.CSV_DOWNLOAD_BUTTON_ID).off();
            jQuery("#" + this.RELOAD_BUTTON_ID).off();
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
                columns: [
                    {
                        data: "hostname",
                        render: (data: any) => {
                            return '<a href="https://' + data + '" target="_blank">' + data + "</a>";
                        }
                    },
                    { data: "status" },
                    { data: "sdate" },
                    { data: "edate" }
                ],
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
}
