var SSLCertChecker;
(function (SSLCertChecker) {
    var Inqueryer = (function () {
        function Inqueryer() {
            throw new Error("Inqueryer is static class.");
        }
        Inqueryer.inquery = function (callback) {
            var _this = this;
            if (callback === void 0) { callback = null; }
            try {
                var options = {
                    type: "POST",
                    url: SSLCertChecker.TARGET_CGI,
                    cache: false,
                    dataType: "json",
                    async: true
                };
                console.log("inquery to " + SSLCertChecker.TARGET_CGI);
                jQuery
                    .ajax(options)
                    .done(function (data) {
                    _this._status = "ok";
                    _this._result = data;
                    console.log("success to inquery. status: " + _this._status);
                    if (callback) {
                        callback(data);
                    }
                })
                    .fail(function (data) {
                    _this._status = "ng";
                    _this._result = null;
                    console.error("failed to inquery. status: " + _this._status);
                    console.error(JSON.stringify(data));
                    if (callback) {
                        callback(null);
                    }
                });
            }
            catch (e) {
                this._status = "ng";
                this._result = null;
                console.error("failed to inquery.");
                console.error(e.message);
                console.error(e.stack);
            }
        };
        Inqueryer._getDateString = function (iso8601str) {
            if (!iso8601str) {
                return "-";
            }
            var ret = "";
            function _paddingStr(target, paddingChar, length) {
                var ret = "";
                try {
                    var paddingStr = new Array(length + 1).join(paddingChar.slice(0, 1));
                    ret = (paddingStr + target).slice(-1 * length);
                }
                catch (e) {
                    ret = "" + target;
                }
                return ret;
            }
            function _getTimeZoneStr(d) {
                var num = Math.abs((d.getTimezoneOffset() * 100) / 60);
                var polarity = d.getTimezoneOffset() > 0 ? "-" : "+";
                return polarity + _paddingStr(num, "0", 4);
            }
            try {
                var d = new Date(iso8601str);
                ret += _paddingStr(d.getFullYear(), "0", 4);
                ret += "/" + _paddingStr(d.getMonth() + 1, "0", 2);
                ret += "/" + _paddingStr(d.getDate(), "0", 2);
                ret += " " + _paddingStr(d.getHours(), "0", 2);
                ret += ":" + _paddingStr(d.getMinutes(), "0", 2);
                ret += ":" + _paddingStr(d.getSeconds(), "0", 2);
                ret += " " + _getTimeZoneStr(d);
            }
            catch (e) {
                ret = iso8601str;
            }
            return ret;
        };
        Inqueryer.getCertStatusList = function () {
            if (!this._result) {
                return [];
            }
            var ret = [];
            for (var i = 0; i < this._result.results.length; i++) {
                var target = this._result.results[i];
                var _temp = {
                    hostname: target.hostname,
                    status: target.status,
                    sdate: this._getDateString(target.sdate),
                    edate: this._getDateString(target.edate),
                    version: target.version
                };
                ret.push(_temp);
            }
            ret.sort(function (a, b) {
                return a.hostname > b.hostname ? 1 : -1;
            });
            return ret;
        };
        Object.defineProperty(Inqueryer, "data", {
            get: function () {
                return this._result;
            },
            enumerable: true,
            configurable: true
        });
        Object.defineProperty(Inqueryer, "status", {
            get: function () {
                return this._status;
            },
            enumerable: true,
            configurable: true
        });
        Inqueryer._status = "ready";
        Inqueryer._result = null;
        return Inqueryer;
    }());
    SSLCertChecker.Inqueryer = Inqueryer;
})(SSLCertChecker || (SSLCertChecker = {}));
var SSLCertChecker;
(function (SSLCertChecker) {
    var UIManager = (function () {
        function UIManager() {
            throw new Error("Inqueryer is static class.");
        }
        UIManager.initialize = function () {
            this.unbind();
            this.bind();
            jQuery("[data-toggle='tooltip'").tooltip();
            this.initDataTables();
        };
        UIManager.bind = function () {
            jQuery("#" + this.CSV_DOWNLOAD_BUTTON_ID).on("click", function () {
                SSLCertChecker.CSVDownloader.download();
            });
            jQuery("#" + this.RELOAD_BUTTON_ID).on("click", function () {
                window.location.reload();
            });
        };
        UIManager.unbind = function () {
            jQuery("#" + this.CSV_DOWNLOAD_BUTTON_ID).off();
            jQuery("#" + this.RELOAD_BUTTON_ID).off();
        };
        UIManager.showLoading = function (showed) {
            var loading = jQuery("#" + this.LOADING_ID);
            if (showed) {
                loading.addClass("loaded");
            }
            else {
                loading.removeClass("loaded");
            }
        };
        UIManager.initDataTables = function () {
            jQuery.extend(jQuery.fn.dataTable.defaults, {
                language: this.DATATABLES_JP
            });
        };
        UIManager.setTableRow = function (datas) {
            var table = jQuery("#" + this.TABLE_ID);
            table.DataTable({
                data: datas,
                columns: [
                    {
                        data: "hostname",
                        render: function (data) {
                            return '<a href="https://' + data + '" target="_blank">' + data + "</a>";
                        }
                    },
                    { data: "status" },
                    { data: "sdate" },
                    { data: "edate" }
                ],
                scrollCollapse: true,
                pageLength: 50,
                rowCallback: function (row, data) {
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
        };
        UIManager.clearTable = function () {
            var tbody = jQuery("#" + this.TABLE_ID + " tbody");
            tbody.empty();
        };
        UIManager.TABLE_ID = "ssl-cert-status";
        UIManager.LOADING_ID = "loading";
        UIManager.CSV_DOWNLOAD_BUTTON_ID = "csv-download-button";
        UIManager.RELOAD_BUTTON_ID = "reload-button";
        UIManager.DATATABLES_JP = {
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
        return UIManager;
    }());
    SSLCertChecker.UIManager = UIManager;
})(SSLCertChecker || (SSLCertChecker = {}));
var SSLCertChecker;
(function (SSLCertChecker) {
    SSLCertChecker.TARGET_CGI = "./GetSSLCertStatus.cgi";
    function update(json) {
        SSLCertChecker.UIManager.clearTable();
        SSLCertChecker.UIManager.showLoading(true);
        if (!json) {
            return;
        }
        var datas = SSLCertChecker.Inqueryer.getCertStatusList();
        SSLCertChecker.UIManager.setTableRow(datas);
    }
    SSLCertChecker.update = update;
    function main() {
        SSLCertChecker.UIManager.initialize();
        SSLCertChecker.Inqueryer.inquery(update);
    }
    SSLCertChecker.main = main;
    document.addEventListener("DOMContentLoaded", function () {
        SSLCertChecker.main();
    });
})(SSLCertChecker || (SSLCertChecker = {}));
var SSLCertChecker;
(function (SSLCertChecker) {
    var CSVDownloader = (function () {
        function CSVDownloader() {
            throw new Error("Downloader is static class.");
        }
        CSVDownloader._makeCSVBlob = function (mimeType, withBOM, lineFeedCodeType) {
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
                var certStatusList = SSLCertChecker.Inqueryer.getCertStatusList();
                var contents = [];
                if (withBOM) {
                    contents.push(this.BOM);
                }
                var lineFeedCode = this._getLineFeedCode(lineFeedCodeType);
                var header = ["ホスト名", "証明書状態", "期限開始日", "期限終了日"].join(",");
                contents.push(header + lineFeedCode);
                for (var i = 0; i < certStatusList.length; i++) {
                    var _target = certStatusList[i];
                    var _temp = [_target.hostname, _target.status, _target.sdate, _target.edate].join(",");
                    contents.push(_temp + lineFeedCode);
                }
                var blob = new Blob(contents, { type: mimeType });
            }
            catch (e) {
                console.error("failed to make blob.");
                console.error(e.message);
                console.error(e.stack);
            }
            return blob;
        };
        CSVDownloader._getLineFeedCode = function (lineFeedCodeType) {
            var ret = "";
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
        };
        CSVDownloader._getFilename = function (filenameBase) {
            function _paddingStr(target, paddingChar, length) {
                var ret = "";
                try {
                    var paddingStr = new Array(length + 1).join(paddingChar.slice(0, 1));
                    ret = (paddingStr + target).slice(-1 * length);
                }
                catch (e) {
                    ret = "" + target;
                }
                return ret;
            }
            if (!filenameBase) {
                filenameBase = this.DEFAULT_FILENAME;
            }
            var filename = filenameBase;
            var date = new Date();
            var d = [_paddingStr(date.getFullYear(), "0", 4), _paddingStr(date.getMonth() + 1, "0", 2), _paddingStr(date.getDate(), "0", 2)].join("");
            filename = filename.replace("%d", d);
            var t = [_paddingStr(date.getHours(), "0", 2), _paddingStr(date.getMinutes(), "0", 2), _paddingStr(date.getSeconds(), "0", 2)].join("");
            filename = filename.replace("%t", t);
            return filename;
        };
        CSVDownloader.download = function (filenameBase, mimeType, withBOM, lineFeedCodeType) {
            var _this = this;
            var blob = this._makeCSVBlob(mimeType, withBOM, lineFeedCodeType);
            var filename = this._getFilename(filenameBase);
            if (navigator.msSaveBlob) {
                navigator.msSaveBlob(blob, filename);
                return;
            }
            var url = null;
            try {
                var element = this._createLinkElement();
                url = URL.createObjectURL(blob);
                this._setAttributes(element, filename, url);
                element.click();
                setTimeout(function () {
                    _this._revoke(url);
                }, this.REVOKE_TIMEOUT);
            }
            catch (e) {
                console.error("failed to download.");
                console.error(e.meesage);
                console.error(e.stack);
                this._removeLinkElement();
                if (url) {
                    this._revoke(url);
                }
            }
        };
        CSVDownloader._revoke = function (url) {
            URL.revokeObjectURL(url);
            this._removeLinkElement();
        };
        CSVDownloader._createLinkElement = function () {
            var element = document.querySelector("#" + this.ELEMENT_ID);
            if (element) {
                this._removeLinkElement();
            }
            var a = document.createElement("a");
            a.setAttribute("id", this.ELEMENT_ID);
            a.setAttribute("download", "");
            a.setAttribute("target", "_blank");
            a.setAttribute("href", "");
            a.setAttribute("style", "display: block; visibility: hidden; width: 0; height: 0;");
            return document.body.appendChild(a);
        };
        CSVDownloader._removeLinkElement = function () {
            var element = document.querySelector("#" + this.ELEMENT_ID);
            if (element) {
                document.body.removeChild(element);
            }
        };
        CSVDownloader._setAttributes = function (element, filename, href) {
            element.setAttribute("download", filename);
            element.setAttribute("href", href);
            return element;
        };
        CSVDownloader.ELEMENT_ID = "csv-downloader";
        CSVDownloader.DEFAULT_FILENAME = "%d_%t.csv";
        CSVDownloader.REVOKE_TIMEOUT = 5000;
        CSVDownloader.BOM = new Uint8Array([0xef, 0xbb, 0xbf]);
        return CSVDownloader;
    }());
    SSLCertChecker.CSVDownloader = CSVDownloader;
})(SSLCertChecker || (SSLCertChecker = {}));
